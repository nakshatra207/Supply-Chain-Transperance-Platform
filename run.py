"""
Organic Trace — Universal Service Orchestrator
==============================================
Manages the entire stack in one place:
  - PostgreSQL (Docker Compose or local)
  - Hardhat Local Blockchain (port 8545)
  - Smart Contract Deployment (SupplyChain.sol)
  - Express.js Backend API (port 5000)
  - React + Vite Frontend (port 5173)

Usage:
  python run.py             Start all services, deploy contracts, open browser
  python run.py --stop      Stop all running services and free ports
  python run.py --status    Display status of all ports and services
  python run.py --test      Run smart contract tests
  python run.py --seed      Seed database with demo data
  python run.py --install   Install dependencies in all subprojects
"""

import argparse
import json
import os
import re
import shutil
import signal
import socket
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
import webbrowser
from pathlib import Path

# --- ANSI Color & Encoding Utilities ---
if sys.platform == "win32":
    # Enable ANSI escape sequences on Windows CMD / PowerShell
    os.system("")
    # Ensure stdout/stderr handles UTF-8 on Windows
    try:
        if sys.stdout and hasattr(sys.stdout, "reconfigure"):
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
        if sys.stderr and hasattr(sys.stderr, "reconfigure"):
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
    except Exception:
        pass

GREEN = "\033[92m"
YELLOW = "\033[93m"
CYAN = "\033[96m"
MAGENTA = "\033[95m"
BLUE = "\033[94m"
RED = "\033[91m"
BOLD = "\033[1m"
DIM = "\033[2m"
RESET = "\033[0m"

ROOT_DIR = Path(__file__).resolve().parent
CONTRACTS_DIR = ROOT_DIR / "contracts"
BACKEND_DIR = ROOT_DIR / "backend"
FRONTEND_DIR = ROOT_DIR / "frontend"
LOGS_DIR = ROOT_DIR / "logs"

# Global list of running child processes
RUNNING_PROCESSES = []
SHUTTING_DOWN = False


def log(prefix: str, msg: str, color: str = GREEN):
    timestamp = time.strftime("%H:%M:%S")
    print(f"{DIM}[{timestamp}]{RESET} {color}{BOLD}[{prefix}]{RESET} {msg}", flush=True)


def log_err(msg: str):
    log("ERROR", msg, RED)


def log_warn(msg: str):
    log("WARN", msg, YELLOW)


def log_info(msg: str):
    log("INFO", msg, CYAN)


def log_success(msg: str):
    log("OK", msg, GREEN)


# --- Port & Process Management ---

def is_port_open(port: int, host: str = "localhost", timeout: float = 0.5) -> bool:
    """Returns True if the port is currently listening on IPv4 or IPv6."""
    try:
        infos = socket.getaddrinfo(host, port, socket.AF_UNSPEC, socket.SOCK_STREAM)
        for family, socktype, proto, canonname, sockaddr in infos:
            try:
                with socket.socket(family, socktype, proto) as sock:
                    sock.settimeout(timeout)
                    if sock.connect_ex(sockaddr) == 0:
                        return True
            except Exception:
                pass
    except Exception:
        pass
    # Fallback to direct IPv4 check
    try:
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as sock:
            sock.settimeout(timeout)
            return sock.connect_ex(("127.0.0.1", port)) == 0
    except Exception:
        return False


def wait_for_port(port: int, host: str = "localhost", timeout: int = 30, desc: str = "") -> bool:
    """Wait until a TCP port starts listening."""
    start = time.time()
    while time.time() - start < timeout:
        if is_port_open(port, host):
            return True
        time.sleep(0.5)
    return False


def get_pids_on_port(port: int) -> list:
    """Find process IDs listening on a specific port (Windows & Unix)."""
    pids = set()
    if sys.platform == "win32":
        try:
            output = subprocess.check_output(
                "netstat -ano -p tcp",
                shell=True,
                text=True,
                encoding="utf-8",
                errors="ignore"
            )
            for line in output.splitlines():
                line = line.strip()
                if f":{port} " in line and "LISTENING" in line:
                    parts = line.split()
                    if len(parts) >= 5:
                        try:
                            pid = int(parts[-1])
                            if pid > 0:
                                pids.add(pid)
                        except ValueError:
                            pass
        except Exception:
            pass
    else:
        try:
            output = subprocess.check_output(
                f"lsof -ti:{port}",
                shell=True,
                text=True,
                encoding="utf-8",
                errors="ignore"
            )
            for line in output.splitlines():
                try:
                    pids.add(int(line.strip()))
                except ValueError:
                    pass
        except Exception:
            pass
    return list(pids)


def kill_process_tree(pid: int):
    """Forcefully kill process and all children."""
    try:
        if sys.platform == "win32":
            subprocess.run(
                ["taskkill", "/F", "/T", "/PID", str(pid)],
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                check=False
            )
        else:
            os.kill(pid, signal.SIGKILL)
    except Exception:
        pass


def free_port(port: int, desc: str = ""):
    """Kill any process lingering on the port."""
    pids = get_pids_on_port(port)
    if pids:
        log_warn(f"Port {port} ({desc}) is in use by PID(s): {pids}. Freeing port...")
        for pid in pids:
            kill_process_tree(pid)
        time.sleep(1)


def check_command_exists(cmd: str) -> bool:
    """Check if command is available on PATH."""
    if shutil.which(cmd):
        return True
    if sys.platform == "win32":
        for ext in [".cmd", ".bat", ".exe"]:
            if shutil.which(cmd + ext):
                return True
    return False


# --- Stream Logging & Subprocess Helpers ---

def run_command(cmd_args: list, cwd: Path = ROOT_DIR, capture: bool = False, check: bool = False) -> subprocess.CompletedProcess:
    """Execute a command cross-platform with UTF-8 encoding and proper quoting."""
    shell = sys.platform == "win32"
    return subprocess.run(
        cmd_args,
        cwd=str(cwd),
        capture_output=capture,
        text=True,
        encoding="utf-8",
        errors="replace",
        shell=shell,
        check=check
    )


def stream_process_output(proc: subprocess.Popen, prefix: str, color: str, log_filename: str = None):
    """Multiplex process stdout/stderr into terminal and a log file."""
    log_file = None
    if log_filename:
        LOGS_DIR.mkdir(parents=True, exist_ok=True)
        log_file = open(LOGS_DIR / log_filename, "a", encoding="utf-8", errors="replace")

    def reader():
        try:
            for line in iter(proc.stdout.readline, ""):
                if not line:
                    break
                line_clean = line.rstrip()
                if line_clean:
                    print(f"{color}[{prefix}]{RESET} {line_clean}", flush=True)
                if log_file:
                    log_file.write(line)
                    log_file.flush()
        except Exception:
            pass
        finally:
            if log_file:
                log_file.close()

    t = threading.Thread(target=reader, daemon=True)
    t.start()
    return t


def start_service(cmd_args: list, cwd: Path, prefix: str, color: str, log_filename: str = None) -> subprocess.Popen:
    """Start a long-running service with process tracking and output streaming."""
    shell = sys.platform == "win32"
    proc = subprocess.Popen(
        cmd_args,
        cwd=str(cwd),
        stdout=subprocess.PIPE,
        stderr=subprocess.STDOUT,
        text=True,
        encoding="utf-8",
        errors="replace",
        bufsize=1,
        shell=shell,
        env=os.environ.copy()
    )
    RUNNING_PROCESSES.append((proc, prefix))
    stream_process_output(proc, prefix, color, log_filename)
    return proc


# --- Step Handlers ---

def check_environment():
    """Verify prerequisites, node, npm, and environment files."""
    log_info("Checking system requirements and configuration files...")

    # Node.js check
    if not check_command_exists("node"):
        log_err("Node.js is not found in PATH! Please install Node.js 18+ from https://nodejs.org")
        sys.exit(1)

    try:
        res = run_command(["node", "--version"], capture=True)
        log_success(f"Node.js detected: {res.stdout.strip()}")
    except Exception:
        pass

    # Copy .env if missing
    root_env = ROOT_DIR / ".env"
    root_env_example = ROOT_DIR / ".env.example"
    if not root_env.exists() and root_env_example.exists():
        shutil.copy(root_env_example, root_env)
        log_success("Created root .env from .env.example")

    # Copy frontend/.env if missing
    frontend_env = FRONTEND_DIR / ".env"
    frontend_env_example = FRONTEND_DIR / ".env.example"
    if not frontend_env.exists() and frontend_env_example.exists():
        shutil.copy(frontend_env_example, frontend_env)
        log_success("Created frontend/.env from frontend/.env.example")
    elif not frontend_env.exists():
        frontend_env.write_text("VITE_API_URL=http://localhost:5000\n", encoding="utf-8")
        log_success("Created frontend/.env with default API URL")

    # Check node_modules in subfolders
    for path, name in [(BACKEND_DIR, "backend"), (CONTRACTS_DIR, "contracts"), (FRONTEND_DIR, "frontend")]:
        if not (path / "node_modules").exists():
            log_warn(f"node_modules missing in {name}/. Installing dependencies...")
            run_command(["npm", "install"], cwd=path, check=True)
            log_success(f"Dependencies installed in {name}/")


def ensure_postgres(skip_docker: bool = False):
    """Ensure PostgreSQL is accessible on port 5432, starting Docker if needed."""
    if is_port_open(5432):
        log_success("PostgreSQL is already active on port 5432.")
        return True

    if skip_docker:
        log_warn("Docker startup skipped (--no-docker). PostgreSQL is not listening on port 5432!")
        return False

    log_info("PostgreSQL is not listening. Attempting to start via Docker Compose...")

    def run_compose_up():
        try:
            res = run_command(["docker", "compose", "up", "-d"], cwd=ROOT_DIR, capture=True)
            if res.returncode == 0:
                return True
        except Exception:
            pass
        try:
            res = run_command(["docker-compose", "up", "-d"], cwd=ROOT_DIR, capture=True)
            if res.returncode == 0:
                return True
        except Exception:
            pass
        return False

    # Attempt compose up
    started = run_compose_up()

    # If failed on Windows, maybe Docker Desktop is not running
    if not started and sys.platform == "win32":
        docker_desktop_path = Path("C:/Program Files/Docker/Docker/Docker Desktop.exe")
        if docker_desktop_path.exists():
            log_warn("Docker daemon is not running. Launching Docker Desktop...")
            try:
                subprocess.Popen([str(docker_desktop_path)])
                log_info("Waiting up to 35 seconds for Docker Desktop engine to initialize...")
                for _ in range(35):
                    time.sleep(1)
                    if run_compose_up():
                        started = True
                        break
            except Exception as e:
                log_warn(f"Could not automatically launch Docker Desktop: {e}")

    if started:
        log_info("Waiting for PostgreSQL container on port 5432...")
        if wait_for_port(5432, timeout=25, desc="PostgreSQL"):
            log_success("PostgreSQL container is ready on port 5432.")
            return True
        else:
            log_warn("PostgreSQL container started, but port 5432 didn't respond in time.")
            return False
    else:
        log_warn("Could not start Docker container automatically. Ensure Docker or local PostgreSQL is running on port 5432.")
        return False


def run_database_migrations():
    """Apply Prisma migrations and seed database."""
    log_info("Applying Prisma database migrations...")
    try:
        # Run prisma migrate deploy (safe, non-interactive)
        res = run_command(["npx", "prisma", "migrate", "deploy"], cwd=BACKEND_DIR, capture=True)
        if res.returncode == 0:
            log_success("Database schema is up to date.")
        else:
            # Fallback to prisma db push if migrate deploy has drift
            run_command(["npx", "prisma", "db", "push"], cwd=BACKEND_DIR, capture=True)
            log_success("Database schema synced via prisma db push.")
    except Exception as e:
        log_warn(f"Database migration note: {e}")

    # Seed demo users if needed
    try:
        res = run_command(["node", "prisma/seed.js"], cwd=BACKEND_DIR, capture=True)
        if res.returncode == 0:
            log_success("Database seeded with demo accounts.")
    except Exception as e:
        log_warn(f"Database seeding note: {e}")


def wait_for_blockchain_rpc(timeout: int = 30) -> bool:
    """Poll Hardhat JSON-RPC eth_chainId until responsive."""
    url = "http://127.0.0.1:8545"
    payload = json.dumps({"jsonrpc": "2.0", "method": "eth_chainId", "params": [], "id": 1}).encode("utf-8")
    headers = {"Content-Type": "application/json"}
    req = urllib.request.Request(url, data=payload, headers=headers)

    start = time.time()
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(req, timeout=1.5) as resp:
                if resp.status == 200:
                    return True
        except Exception:
            pass
        time.sleep(0.8)
    return False


def deploy_smart_contract() -> bool:
    """Deploy SupplyChain.sol to local Hardhat node and update .env."""
    log_info("Compiling and deploying SupplyChain smart contract to local node...")
    try:
        proc = run_command(
            ["npx", "hardhat", "run", "scripts/deploy.js", "--network", "localhost"],
            cwd=CONTRACTS_DIR,
            capture=True
        )
        if proc.returncode == 0:
            match = re.search(r"SupplyChain deployed to:\s*(0x[a-fA-F0-9]{40})", proc.stdout)
            if match:
                addr = match.group(1)
                log_success(f"SupplyChain contract deployed at: {BOLD}{addr}{RESET}")
                return True
            log_success("Smart contract deployed successfully.")
            return True
        else:
            log_err(f"Contract deployment failed:\n{proc.stderr or proc.stdout}")
            return False
    except Exception as e:
        log_err(f"Contract deployment exception: {e}")
        return False


def wait_for_backend_health(timeout: int = 25) -> bool:
    """Poll Express health endpoint."""
    url = "http://localhost:5000/api/health"
    start = time.time()
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(url, timeout=1.5) as resp:
                if resp.status == 200:
                    data = json.loads(resp.read().decode("utf-8"))
                    configured = data.get("blockchainConfigured", False)
                    status_str = f"Blockchain linked: {configured}"
                    log_success(f"Backend API is healthy ({status_str})")
                    return True
        except Exception:
            pass
        time.sleep(0.8)
    return False


def wait_for_frontend_ready(timeout: int = 25) -> bool:
    """Poll Vite frontend server."""
    urls = ["http://localhost:5173", "http://127.0.0.1:5173"]
    start = time.time()
    while time.time() - start < timeout:
        if is_port_open(5173):
            return True
        for url in urls:
            try:
                with urllib.request.urlopen(url, timeout=1.0) as resp:
                    if resp.status == 200:
                        return True
            except Exception:
                pass
        time.sleep(0.8)
    return False


# --- Shutdown & Lifecycle ---

def stop_all_services():
    """Cleanly terminate all background services and optionally bring down Docker."""
    global SHUTTING_DOWN
    SHUTTING_DOWN = True
    print("\n" + "=" * 65)
    log_info("Stopping Organic Trace stack...")

    # Stop tracked subprocesses
    for proc, prefix in RUNNING_PROCESSES:
        try:
            log_info(f"Stopping {prefix} (PID {proc.pid})...")
            kill_process_tree(proc.pid)
        except Exception:
            pass

    # Ensure ports are cleared
    for port, name in [(8545, "Hardhat Blockchain"), (5000, "Backend API"), (5173, "Frontend UI")]:
        free_port(port, name)

    # Optional docker down
    try:
        run_command(["docker", "compose", "down"], cwd=ROOT_DIR, capture=True)
        log_success("PostgreSQL Docker container stopped.")
    except Exception:
        pass

    log_success("All Organic Trace services stopped successfully.")
    print("=" * 65)


def handle_signals(signum, frame):
    """Signal handler for graceful Ctrl+C."""
    stop_all_services()
    sys.exit(0)


def print_banner():
    banner = f"""{GREEN}{BOLD}
  ___                        _        _____                     
 / _ \\ _ _ __ _ __ _ _ _  (_) __   |_   _| _ __ _  __ ___ 
| (_) | '_/ _` / _` | ' \\ | |/ _|    | || '_/ _` |/ _/ -_)
 \\___/|_| \\__, \\__,_|_||_||_|\\__|    |_||_| \\__,_|\\__\\___|
          |___/                                            
    Blockchain-Based Organic Farming Traceability Platform{RESET}
"""
    print(banner)


def show_status():
    """Inspect and report the status of all ports and services."""
    print("\n" + "=" * 60)
    print(f"{BOLD}ORGANIC TRACE SERVICE STATUS CHECK{RESET}")
    print("=" * 60)

    services = [
        ("PostgreSQL Database", 5432, "http://localhost:5432", False),
        ("Hardhat Blockchain Node", 8545, "http://127.0.0.1:8545", True),
        ("Backend Express API", 5000, "http://localhost:5000/api/health", True),
        ("Frontend React App", 5173, "http://localhost:5173", True),
    ]

    for name, port, url, check_http in services:
        listening = is_port_open(port)
        pids = get_pids_on_port(port)
        pid_str = f"(PID {pids})" if pids else ""

        if listening:
            http_detail = ""
            if check_http:
                try:
                    with urllib.request.urlopen(url, timeout=1.0) as resp:
                        http_detail = f" [HTTP {resp.status}]"
                except Exception as e:
                    http_detail = " [HTTP Waiting]"
            print(f"  {GREEN}[ONLINE]{RESET}  {name:<26} Port {port:<6} {pid_str}{http_detail}")
        else:
            print(f"  {RED}[OFFLINE]{RESET} {name:<26} Port {port:<6}")

    # Check contract in .env
    root_env = ROOT_DIR / ".env"
    contract_addr = "Not set"
    if root_env.exists():
        for line in root_env.read_text(encoding="utf-8").splitlines():
            if line.startswith("CONTRACT_ADDRESS="):
                contract_addr = line.split("=", 1)[1].strip() or "Not set"
                break
    print("-" * 60)
    print(f"  Deployed Contract Address : {CYAN}{contract_addr}{RESET}")
    print("=" * 60 + "\n")


# --- Main Orchestrator Flow ---

def run_stack(no_browser: bool = False, no_docker: bool = False):
    """Main start routine."""
    print_banner()
    signal.signal(signal.SIGINT, handle_signals)
    signal.signal(signal.SIGTERM, handle_signals)

    # 1. Environment & Subprojects
    check_environment()

    # 2. Database
    pg_ok = ensure_postgres(skip_docker=no_docker)
    if pg_ok:
        run_database_migrations()

    # 3. Clean any orphan processes on project ports
    free_port(8545, "Hardhat Blockchain")
    free_port(5000, "Backend API")
    free_port(5173, "Frontend UI")

    # 4. Start Hardhat Blockchain Node
    log("HARDHAT", "Starting local Hardhat Ethereum node on port 8545...", YELLOW)
    start_service(
        ["npx", "hardhat", "node"],
        cwd=CONTRACTS_DIR,
        prefix="HARDHAT",
        color=YELLOW,
        log_filename="hardhat.log"
    )

    log_info("Waiting for Hardhat node to become responsive...")
    if not wait_for_blockchain_rpc(timeout=30):
        log_err("Hardhat node failed to respond on http://127.0.0.1:8545. Check logs/hardhat.log.")
        stop_all_services()
        sys.exit(1)
    log_success("Hardhat local blockchain node is online.")

    # 5. Deploy Smart Contract
    if not deploy_smart_contract():
        log_warn("Contract deployment failed! Backend will run with blockchain recording disabled.")

    # 6. Start Backend API
    log("BACKEND", "Starting Express backend on port 5000...", CYAN)
    start_service(
        ["npm", "run", "dev"],
        cwd=BACKEND_DIR,
        prefix="BACKEND",
        color=CYAN,
        log_filename="backend.log"
    )

    log_info("Waiting for Backend API health check...")
    if not wait_for_backend_health(timeout=30):
        log_warn("Backend API didn't report ready on /api/health in 30s. Check logs/backend.log.")
    else:
        log_success("Backend API is online and responding.")

    # 7. Start Frontend UI
    log("FRONTEND", "Starting React + Vite frontend on port 5173...", MAGENTA)
    start_service(
        ["npm", "run", "dev"],
        cwd=FRONTEND_DIR,
        prefix="FRONTEND",
        color=MAGENTA,
        log_filename="frontend.log"
    )

    log_info("Waiting for Frontend UI...")
    wait_for_frontend_ready(timeout=25)
    log_success("Frontend development server is online.")

    # 8. Readiness Summary
    print("\n" + "=" * 65)
    print(f"{GREEN}{BOLD}ORGANIC TRACE IS READY!{RESET}")
    print("=" * 65)
    print(f"  {BOLD}Frontend Web App:{RESET}    {CYAN}http://localhost:5173{RESET}")
    print(f"  {BOLD}Backend API Health:{RESET}  {CYAN}http://localhost:5000/api/health{RESET}")
    print(f"  {BOLD}Hardhat RPC Node:{RESET}    {CYAN}http://127.0.0.1:8545{RESET}")
    print(f"  {BOLD}Logs Directory:{RESET}      {DIM}{LOGS_DIR}{RESET}")
    print("-" * 65)
    print(f"  {BOLD}Demo Login Credentials (Password: Demo@1234):{RESET}")
    print(f"    - Farmer:   {BLUE}farmer@example.com{RESET}  (Create batches, upload certs)")
    print(f"    - Partner:  {BLUE}partner@example.com{RESET} (Add supply chain events)")
    print(f"    - Admin:    {BLUE}admin@example.com{RESET}")
    print(f"  {BOLD}Public Traceability Link:{RESET}")
    print(f"    - {CYAN}http://localhost:5173/trace/ORG-BAS-001{RESET} (No login required)")
    print("-" * 65)
    print(f"  {YELLOW}Press Ctrl+C anytime in this window to stop all services cleanly.{RESET}")
    print("=" * 65 + "\n")

    # 9. Open Browser
    if not no_browser:
        try:
            time.sleep(1.5)
            webbrowser.open("http://localhost:5173")
        except Exception:
            pass

    # 10. Keep main thread alive monitoring processes
    try:
        while True:
            for proc, prefix in RUNNING_PROCESSES:
                ret = proc.poll()
                if ret is not None and not SHUTTING_DOWN:
                    log_warn(f"{prefix} process exited with code {ret}!")
            time.sleep(2)
    except KeyboardInterrupt:
        pass
    finally:
        stop_all_services()


# --- CLI Entry Point ---

def main():
    parser = argparse.ArgumentParser(
        description="Organic Trace Platform Service Orchestrator",
        formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--stop", action="store_true", help="Stop all running services and free ports")
    parser.add_argument("--status", action="store_true", help="Check status of all ports and services")
    parser.add_argument("--test", action="store_true", help="Run smart contract test suite")
    parser.add_argument("--seed", action="store_true", help="Seed the database with sample demo data")
    parser.add_argument("--install", action="store_true", help="Run npm install across all subprojects")
    parser.add_argument("--no-browser", action="store_true", help="Do not open the browser automatically")
    parser.add_argument("--no-docker", action="store_true", help="Skip Docker compose startup")

    # Allow subcommands like `python run.py stop` or `python run.py status`
    if len(sys.argv) > 1 and sys.argv[1] in ["stop", "status", "test", "seed", "install"]:
        cmd = sys.argv[1]
        sys.argv[1] = f"--{cmd}"

    args = parser.parse_args()

    if args.stop:
        stop_all_services()
    elif args.status:
        show_status()
    elif args.test:
        print_banner()
        log_info("Running Hardhat smart contract tests...")
        run_command(["npx", "hardhat", "test"], cwd=CONTRACTS_DIR)
    elif args.seed:
        print_banner()
        log_info("Seeding database...")
        run_command(["node", "prisma/seed.js"], cwd=BACKEND_DIR)
    elif args.install:
        print_banner()
        log_info("Installing dependencies in all packages...")
        for name, folder in [("backend", BACKEND_DIR), ("contracts", CONTRACTS_DIR), ("frontend", FRONTEND_DIR)]:
            log_info(f"Running npm install in {name}...")
            run_command(["npm", "install"], cwd=folder)
        log_success("All dependencies installed!")
    else:
        run_stack(no_browser=args.no_browser, no_docker=args.no_docker)


if __name__ == "__main__":
    main()
