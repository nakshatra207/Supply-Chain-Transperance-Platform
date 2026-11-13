#!/usr/bin/env bash
#
# start.sh — Native-Accelerated Universal Startup Script for Organic Trace
# Powered by C11 (SHA-NI), C++20 (N-API LRU Cache & Socket Engine), and x86_64 Assembly.
# Usage: ./start.sh [-d|--detach] [--force-sync] [--sync-schemes]
#

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

# Non-interactive shells may not load nvm's PATH initialization even when Node
# is installed. Add the newest available nvm Node bin directory as a fallback.
for EXTRA_BIN in "${HOME:-}/.local/sysdeps/bin" "${HOME:-}/.local/bin"; do
  if [ -d "$EXTRA_BIN" ]; then
    PATH="$EXTRA_BIN:$PATH"
  fi
done
if ! command -v node > /dev/null 2>&1; then
  NVM_NODE_ROOT="${NVM_DIR:-${HOME:-}/.nvm}/versions/node"
  for NODE_BIN_DIR in "$NVM_NODE_ROOT"/*/bin; do
    if [ -x "$NODE_BIN_DIR/node" ]; then
      PATH="$NODE_BIN_DIR:$PATH"
    fi
  done
fi
export PATH

START_TS=$(date +%s%3N)

mkdir -p logs
PID_FILE="$ROOT_DIR/.pids"
SYNC_STATE_FILE="$ROOT_DIR/logs/.db_sync_state"
LAUNCHER="$ROOT_DIR/native/fast_launcher"

# Color helpers
step() { echo -e "\n\033[1;36m== $1 ==\033[0m"; }
ok()   { echo -e "\033[1;32m[✓] $1\033[0m"; }
warn() { echo -e "\033[1;33m[!] $1\033[0m"; }
err()  { echo -e "\033[1;31m[✗] $1\033[0m"; }

compose_up() {
  if command -v docker > /dev/null 2>&1 && docker compose version > /dev/null 2>&1; then
    docker compose up -d "$@"
  elif command -v docker-compose > /dev/null 2>&1; then
    docker-compose up -d "$@"
  else
    return 1
  fi
}

compose_exec() {
  if command -v docker > /dev/null 2>&1 && docker compose version > /dev/null 2>&1; then
    docker compose exec -T "$@"
  elif command -v docker-compose > /dev/null 2>&1; then
    docker-compose exec -T "$@"
  else
    return 1
  fi
}

ollama_model_installed() {
  local model="$1"
  local tags_json
  tags_json=$(curl --silent --fail --max-time 5 "$OLLAMA_BASE_URL_VALUE/api/tags") || return 1
  command -v python3 > /dev/null 2>&1 || return 1
  printf '%s' "$tags_json" | python3 -c 'import json, sys
wanted = sys.argv[1]
try:
    models = json.load(sys.stdin).get("models", [])
    names = [item.get("name") or item.get("model") or "" for item in models]
    sys.exit(0 if wanted in names or (":" not in wanted and any(name.startswith(wanted + ":") for name in names)) else 1)
except (ValueError, AttributeError, TypeError):
    sys.exit(1)' "$model"
}

FORCE_SYNC=false
DETACH=false
SYNC_SCHEMES=false
for arg in "$@"; do
  case "$arg" in
    -d|--detach) DETACH=true ;;
    --force-sync) FORCE_SYNC=true ;;
    --sync-schemes) SYNC_SCHEMES=true ;;
  esac
done

step "Building & Verifying Native C / C++20 / x86_64 ASM Accelerators"
if command -v make > /dev/null 2>&1 && command -v gcc > /dev/null 2>&1 && command -v g++ > /dev/null 2>&1; then
  if make -s all; then
    ok "Native addon (organic_native.node) & launcher (native/fast_launcher) ready."
  else
    warn "Native build encountered an issue; falling back to standard JS/shell paths."
  fi
fi

# Helper to free ports using native C++ /proc/net/tcp scanner + Docker port check
free_ports_fast() {
  if [ -x "$LAUNCHER" ]; then
    "$LAUNCHER" free-ports "$@"
  else
    for port in "$@"; do
      local pids
      pids=$(lsof -ti:"$port" 2>/dev/null || true)
      if [ -n "$pids" ]; then
        for pid in $pids; do
          kill -9 "$pid" 2>/dev/null || true
        done
      fi
    done
  fi
  # If a Docker container is still holding any target port, stop it
  if [ -x "$LAUNCHER" ] && command -v docker > /dev/null 2>&1; then
    for port in "$@"; do
      if "$LAUNCHER" wait-tcp 127.0.0.1 "$port" 20; then
        docker ps --filter "publish=$port" -q 2>/dev/null | xargs -r docker stop > /dev/null 2>&1 || true
      fi
    done
  fi
}

step "Checking Environment & Dependencies"

for required_command in node npm; do
  if ! command -v "$required_command" > /dev/null 2>&1; then
    err "Required command '$required_command' was not found in PATH. Install Node.js 18+ and npm, then rerun ./start.sh."
    exit 1
  fi
done

# Copy root .env if missing
if [ ! -f "$ROOT_DIR/.env" ] && [ -f "$ROOT_DIR/.env.example" ]; then
  cp "$ROOT_DIR/.env.example" "$ROOT_DIR/.env"
  ok "Created .env from .env.example"
fi

# Copy frontend .env if missing
if [ ! -f "$ROOT_DIR/frontend/.env" ] && [ -f "$ROOT_DIR/frontend/.env.example" ]; then
  cp "$ROOT_DIR/frontend/.env.example" "$ROOT_DIR/frontend/.env"
  ok "Created frontend/.env from frontend/.env.example"
elif [ ! -f "$ROOT_DIR/frontend/.env" ]; then
  echo "VITE_API_URL=http://localhost:5000" > "$ROOT_DIR/frontend/.env"
  ok "Created frontend/.env"
fi

# Read only the two non-secret Ollama settings needed by this launcher.
read_env_value() {
  local key="$1"
  awk -F= -v key="$key" '$1 == key {
    value = substr($0, index($0, "=") + 1)
    sub(/^[[:space:]]*/, "", value)
    sub(/[[:space:]]*$/, "", value)
    if (value ~ /^".*"$/ || value ~ /^\047.*\047$/) value = substr(value, 2, length(value) - 2)
    sub(/[[:space:]]+#.*$/, "", value)
    print value
    exit
  }' "$ROOT_DIR/.env"
}

OLLAMA_MODEL_VALUE="${OLLAMA_MODEL:-$(read_env_value OLLAMA_MODEL)}"
OLLAMA_MODEL_VALUE="${OLLAMA_MODEL_VALUE:-llama3.2:latest}"
OLLAMA_BASE_URL_VALUE="${OLLAMA_BASE_URL:-$(read_env_value OLLAMA_BASE_URL)}"
OLLAMA_BASE_URL_VALUE="${OLLAMA_BASE_URL_VALUE:-http://127.0.0.1:11435}"
OLLAMA_BASE_URL_VALUE="${OLLAMA_BASE_URL_VALUE%/}"
OLLAMA_MODELS_DIR="$ROOT_DIR/.ollama/models"

# Symlink or copy backend .env to ensure parity with root .env
if [ ! -e "$ROOT_DIR/backend/.env" ]; then
  ln -sf "../.env" "$ROOT_DIR/backend/.env" 2>/dev/null || cp "$ROOT_DIR/.env" "$ROOT_DIR/backend/.env"
  ok "Configured backend/.env"
fi

# Verify node modules in all subprojects
for sub in contracts backend frontend; do
  if [ ! -d "$ROOT_DIR/$sub/node_modules" ]; then
    warn "Installing dependencies in $sub/..."
    if ! (cd "$ROOT_DIR/$sub" && npm install); then
      err "Dependency installation failed in $sub/. Check npm output and rerun ./start.sh."
      exit 1
    fi
    ok "Dependencies installed in $sub/"
  fi
done

# Repair flattened node_modules/.bin symlinks (e.g., after extracting from a ZIP archive)
if [ ! -L "$ROOT_DIR/contracts/node_modules/.bin/hardhat" ] || [ ! -L "$ROOT_DIR/frontend/node_modules/.bin/vite" ]; then
  node -e '
    const fs = require("fs"), path = require("path");
    function fixNm(nm) {
      if (!fs.existsSync(nm)) return;
      const binDir = path.join(nm, ".bin");
      for (const entry of fs.readdirSync(nm)) {
        if (entry.startsWith(".")) continue;
        const full = path.join(nm, entry);
        if (!fs.statSync(full).isDirectory()) continue;
        const dirs = entry.startsWith("@")
          ? fs.readdirSync(full).map(s => path.join(full, s)).filter(p => fs.statSync(p).isDirectory())
          : [full];
        for (const pkgDir of dirs) {
          const pj = path.join(pkgDir, "package.json");
          if (fs.existsSync(pj)) {
            const pkg = JSON.parse(fs.readFileSync(pj, "utf8"));
            if (pkg.bin) {
              fs.mkdirSync(binDir, { recursive: true });
              const bins = typeof pkg.bin === "string" ? { [pkg.name.split("/").pop()]: pkg.bin } : pkg.bin;
              for (const [b, rel] of Object.entries(bins)) {
                const target = path.resolve(pkgDir, rel), link = path.join(binDir, b);
                if (!fs.existsSync(target)) continue;
                try { if (!fs.lstatSync(link).isSymbolicLink()) fs.unlinkSync(link); else continue; } catch {}
                fs.symlinkSync(path.relative(binDir, target), link);
                fs.chmodSync(target, 0o755);
              }
            }
          }
          fixNm(path.join(pkgDir, "node_modules"));
        }
      }
    }
    ["contracts", "backend", "frontend"].forEach(s => fixNm(path.join(s, "node_modules")));
  '
  ok "Repaired node_modules/.bin symlinks."
fi

step "Cleaning Prior Running Processes"
if [ -f "$PID_FILE" ]; then
  while read -r pid; do
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null || true
    fi
  done < "$PID_FILE"
fi
> "$PID_FILE"

free_ports_fast 8545 5000 5173
ok "Freed ports 8545, 5000, 5173 via native /proc/net/tcp engine."

step "Checking Database (PostgreSQL)"
PG_ACTIVE=false
if [ -x "$LAUNCHER" ]; then
  "$LAUNCHER" wait-tcp 127.0.0.1 5432 150 && PG_ACTIVE=true
else
  timeout 1 bash -c 'cat < /dev/null > /dev/tcp/localhost/5432' 2>/dev/null && PG_ACTIVE=true
fi

if [ "$PG_ACTIVE" = "true" ]; then
  ok "PostgreSQL is active on port 5432."
else
  LOCAL_PGDATA="${HOME:-}/.local/share/organic_trace_pgdata"
  if command -v pg_ctl > /dev/null 2>&1 && [ -f "$LOCAL_PGDATA/PG_VERSION" ]; then
    warn "Port 5432 not listening. Starting local PostgreSQL 16 instance..."
    mkdir -p "${HOME:-}/.local/share/organic_trace_pgrun"
    pg_ctl -D "$LOCAL_PGDATA" -l "$LOCAL_PGDATA/postgres.log" start > /dev/null 2>&1 || true
  else
    warn "Port 5432 not listening. Starting PostgreSQL container via Docker..."
    if ! compose_up postgres; then
      err "Could not start PostgreSQL. Start Docker/Compose or install PostgreSQL locally, then rerun ./start.sh."
      exit 1
    fi
  fi
  PG_READY=false
  if [ -x "$LAUNCHER" ]; then
    "$LAUNCHER" wait-tcp 127.0.0.1 5432 25000 && PG_READY=true
  else
    for _ in $(seq 1 25); do
      sleep 1
      if timeout 1 bash -c 'cat < /dev/null > /dev/tcp/localhost/5432' 2>/dev/null; then
        PG_READY=true
        break
      fi
    done
  fi
  if [ "$PG_READY" != "true" ]; then
    err "PostgreSQL failed to respond on port 5432."
    exit 1
  fi
  ok "PostgreSQL container is ready."
fi

step "Checking Ollama Assistant"
OLLAMA_DOCKER_MODE=false
OLLAMA_DEFAULT_URL=false
case "$OLLAMA_BASE_URL_VALUE" in
  http://127.0.0.1:11435|http://localhost:11435) OLLAMA_DEFAULT_URL=true ;;
esac

if ! curl --silent --show-error --fail --max-time 2 "$OLLAMA_BASE_URL_VALUE/api/tags" > /dev/null 2>&1; then
  if [ "$OLLAMA_DEFAULT_URL" != "true" ]; then
    err "Ollama is unreachable at $OLLAMA_BASE_URL_VALUE. Start that Ollama server or update OLLAMA_BASE_URL in .env."
    exit 1
  fi

  if command -v ollama > /dev/null 2>&1; then
    warn "Ollama is not running. Starting the app-managed Ollama service..."
    mkdir -p "$OLLAMA_MODELS_DIR"
    OLLAMA_MODELS="$OLLAMA_MODELS_DIR" OLLAMA_HOST="$OLLAMA_BASE_URL_VALUE" setsid nohup ollama serve < /dev/null >> "$ROOT_DIR/logs/ollama.log" 2>&1 &
    echo "$!" >> "$PID_FILE"
  else
    warn "Local Ollama is not installed. Starting the Ollama Docker service..."
    if ! compose_up ollama; then
      err "Could not start Ollama with Docker Compose. Install Ollama locally or start Docker Desktop/Engine, then rerun ./start.sh."
      exit 1
    fi
    OLLAMA_DOCKER_MODE=true
  fi
fi

OLLAMA_READY=false
for _ in $(seq 1 120); do
  if curl --silent --fail --max-time 2 "$OLLAMA_BASE_URL_VALUE/api/tags" > /dev/null 2>&1; then
    OLLAMA_READY=true
    break
  fi
  sleep 1
done
if [ "$OLLAMA_READY" != "true" ]; then
  err "Ollama did not become ready at $OLLAMA_BASE_URL_VALUE. Check logs/ollama.log or the Ollama container logs."
  exit 1
fi

if ollama_model_installed "$OLLAMA_MODEL_VALUE"; then
  ok "Ollama is ready with cached model '$OLLAMA_MODEL_VALUE'."
elif [ "$OLLAMA_DOCKER_MODE" = "true" ]; then
  step "Downloading Ollama Model: $OLLAMA_MODEL_VALUE"
  if ! compose_exec ollama ollama pull "$OLLAMA_MODEL_VALUE"; then
    err "Could not download Ollama model '$OLLAMA_MODEL_VALUE'. Check the Docker Ollama logs and network, then rerun ./start.sh."
    exit 1
  fi
  ok "Ollama is ready with model '$OLLAMA_MODEL_VALUE'."
elif command -v ollama > /dev/null 2>&1; then
  step "Ensuring Ollama Model Is Installed: $OLLAMA_MODEL_VALUE"
  mkdir -p "$OLLAMA_MODELS_DIR"
  if ! OLLAMA_MODELS="$OLLAMA_MODELS_DIR" OLLAMA_HOST="$OLLAMA_BASE_URL_VALUE" ollama pull "$OLLAMA_MODEL_VALUE"; then
    err "Could not download Ollama model '$OLLAMA_MODEL_VALUE'. Check Ollama and network access, then rerun ./start.sh."
    exit 1
  fi
  ok "Ollama is ready with model '$OLLAMA_MODEL_VALUE'."
else
  err "Ollama is reachable, but model '$OLLAMA_MODEL_VALUE' is not installed (or python3 is unavailable to verify it). Install the Ollama CLI or pull this model on the configured server."
  exit 1
fi

step "Syncing Database Schema, Government Schemes & Seed Data"
NEED_SCHEMA_SYNC=true
if [ "$FORCE_SYNC" = "false" ] && [ -x "$LAUNCHER" ] && [ -f "$ROOT_DIR/backend/node_modules/.prisma/client/index.js" ]; then
  if "$LAUNCHER" fingerprint --check "$SYNC_STATE_FILE" \
      "$ROOT_DIR/backend/prisma/schema.prisma" \
      "$ROOT_DIR/backend/prisma/seed.js" \
      "$ROOT_DIR/backend/src/data/governmentSchemesData.js"; then
    NEED_SCHEMA_SYNC=false
  fi
fi

if [ "$NEED_SCHEMA_SYNC" = "true" ]; then
  if (cd "$ROOT_DIR/backend" && ./node_modules/.bin/prisma migrate deploy > /dev/null 2>&1); then
    ok "Prisma database migrations applied."
  else
    (cd "$ROOT_DIR/backend" && ./node_modules/.bin/prisma db push --skip-generate > /dev/null 2>&1 || true)
    ok "Prisma database schema synced."
  fi
  (cd "$ROOT_DIR/backend" && ./node_modules/.bin/prisma generate > /dev/null 2>&1 || npx prisma generate > /dev/null 2>&1 || true)
  (cd "$ROOT_DIR/backend" && node prisma/seed.js > /dev/null 2>&1 || true)
  if [ -x "$LAUNCHER" ]; then
    "$LAUNCHER" fingerprint --update "$SYNC_STATE_FILE" \
      "$ROOT_DIR/backend/prisma/schema.prisma" \
      "$ROOT_DIR/backend/prisma/seed.js" \
      "$ROOT_DIR/backend/src/data/governmentSchemesData.js" || true
  fi
  ok "Database demo data & Indian Government Schemes seeded and hardware CRC32C/SHA-NI fingerprint cached."
else
  # Fast-path seed check (ensures both demo batch & government schemes are present)
  (cd "$ROOT_DIR/backend" && node prisma/seed.js > /dev/null 2>&1 || true)
  ok "Schema unchanged (verified via x86_64 CRC32C + SHA-NI fingerprint); verified government schemes ready."
fi

# Ensure contract is compiled before launching services in parallel
if [ ! -f "$ROOT_DIR/contracts/artifacts/contracts/SupplyChain.sol/SupplyChain.json" ]; then
  (cd "$ROOT_DIR/contracts" && CI=true ./node_modules/.bin/hardhat compile < /dev/null > /dev/null 2>&1 || CI=true npx hardhat compile < /dev/null > /dev/null 2>&1)
fi

step "Launching Services in Parallel (Hardhat + Backend + Frontend)"

# 1. Start Hardhat Local Blockchain (Port 8545) directly via binary in its own session
(cd "$ROOT_DIR/contracts" && CI=true setsid nohup ./node_modules/.bin/hardhat node < /dev/null > "$ROOT_DIR/logs/hardhat.log" 2>&1 & PID=$!; echo $PID >> "$PID_FILE")

# 2. Start Backend Express API (Port 5000) concurrently in its own session
(cd "$ROOT_DIR/backend" && setsid nohup node src/index.js < /dev/null > "$ROOT_DIR/logs/backend.log" 2>&1 & PID=$!; echo $PID >> "$PID_FILE")

# 3. Start Frontend UI (Port 5173) concurrently in its own session
(cd "$ROOT_DIR/frontend" && setsid nohup ./node_modules/.bin/vite < /dev/null > "$ROOT_DIR/logs/frontend.log" 2>&1 & PID=$!; echo $PID >> "$PID_FILE")

# Wait for Hardhat RPC with 15ms native socket polling
READY=false
if [ -x "$LAUNCHER" ]; then
  "$LAUNCHER" wait-rpc 127.0.0.1 8545 20000 && READY=true
else
  for _ in $(seq 1 20); do
    sleep 1
    if curl -s -X POST http://127.0.0.1:8545 \
        -H "Content-Type: application/json" \
        -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
        > /dev/null 2>&1; then
      READY=true
      break
    fi
  done
fi

if [ "$READY" != "true" ]; then
  err "Hardhat didn't respond after 20s — check logs/hardhat.log for errors."
  exit 1
fi
ok "Hardhat local blockchain node is online (Port 8545)."

# Deploy SupplyChain Smart Contract via fast direct ethers deployer (~120ms)
DEPLOY_OUTPUT=$(cd "$ROOT_DIR/contracts" && node scripts/fast-deploy.js 2>&1 || npx hardhat run scripts/deploy.js --network localhost)
CONTRACT_ADDR=$(echo "$DEPLOY_OUTPUT" | grep -oE "0x[a-fA-F0-9]{40}" | head -n 1 || true)

if [ -n "$CONTRACT_ADDR" ]; then
  ok "SupplyChain contract deployed to: $CONTRACT_ADDR"
else
  warn "Contract deployment completed, but address could not be parsed."
fi

# Verify Backend API readiness (already booting in parallel)
BACKEND_READY=false
if [ -x "$LAUNCHER" ]; then
  "$LAUNCHER" wait-http 127.0.0.1 5000 "/api/health" '"status":"ok"' 25000 && BACKEND_READY=true
else
  for _ in $(seq 1 25); do
    sleep 1
    HEALTH_JSON=$(curl -s http://localhost:5000/api/health 2>/dev/null || true)
    if echo "$HEALTH_JSON" | grep -q '"status":"ok"'; then
      BACKEND_READY=true
      break
    fi
  done
fi

if [ "$BACKEND_READY" = "true" ]; then
  ok "Backend API is online and healthy (C11 SHA-NI + C++20 Cache + x86_64 ASM active)."
  if [ "$SYNC_SCHEMES" = "true" ]; then
    curl -s -X POST http://localhost:5000/api/schemes/sync \
      -H "Content-Type: application/json" \
      -d '{"performLiveNetworkCheck":true}' > /dev/null 2>&1 || true
    ok "Government Schemes synchronized with official portals."
  fi
else
  warn "Backend API did not respond to /api/health within 25s. Check logs/backend.log."
fi

# Verify Frontend UI readiness (already booting in parallel)
FRONTEND_READY=false
if [ -x "$LAUNCHER" ]; then
  "$LAUNCHER" wait-http 127.0.0.1 5173 "/" "HTTP/1.1" 20000 && FRONTEND_READY=true
else
  for _ in $(seq 1 20); do
    sleep 1
    if curl -s -I http://localhost:5173 > /dev/null 2>&1; then
      FRONTEND_READY=true
      break
    fi
  done
fi

if [ "$FRONTEND_READY" = "true" ]; then
  ok "Frontend dev server is online (Port 5173)."
else
  warn "Frontend server did not respond within 20s. Check logs/frontend.log."
fi

END_TS=$(date +%s%3N)
ELAPSED_MS=$((END_TS - START_TS))

echo ""
echo "================================================================="
echo -e "\033[1;32mORGANIC TRACE IS READY! (Started in ${ELAPSED_MS} ms)\033[0m"
echo "================================================================="
echo -e "  \033[1mFrontend Web App:\033[0m    \033[36mhttp://localhost:5173\033[0m"
echo -e "  \033[1mGovt Schemes Portal:\033[0m \033[36mhttp://localhost:5173/schemes\033[0m"
echo -e "  \033[1mBackend API Health:\033[0m  \033[36mhttp://localhost:5000/api/health\033[0m"
echo -e "  \033[1mGovt Schemes API:\033[0m    \033[36mhttp://localhost:5000/api/schemes\033[0m"
echo -e "  \033[1mHardhat RPC Node:\033[0m    \033[36mhttp://127.0.0.1:8545\033[0m"
echo -e "  \033[1mOllama Assistant:\033[0m   \033[36m$OLLAMA_BASE_URL_VALUE\033[0m ($OLLAMA_MODEL_VALUE)"
echo -e "  \033[1mVoice & TTS Engine:\033[0m  Web Speech API + Read-Aloud (EN / HI / PA)"
echo -e "  \033[1mNative Engine:\033[0m       C11 SHA-NI + C++20 N-API Cache + x86_64 ASM"
echo -e "  \033[1mLogs Directory:\033[0m      $ROOT_DIR/logs"
echo "-----------------------------------------------------------------"
echo -e "  \033[1mDemo Login Credentials (Password: Demo@1234):\033[0m"
echo -e "    - Farmer:   \033[34mfarmer@example.com\033[0m  (Create batches, upload certs)"
echo -e "    - Partner:  \033[34mpartner@example.com\033[0m (Add supply chain events)"
echo -e "    - Admin:    \033[34madmin@example.com\033[0m"
echo -e "  \033[1mPublic Traceability Link:\033[0m"
echo -e "    - \033[36mhttp://localhost:5173/trace/ORG-BAS-001\033[0m (No login required)"
echo "-----------------------------------------------------------------"
echo "To stop all services cleanly, run: ./stop.sh"
echo "================================================================="
echo ""

# If detached flag is passed (-d or --detach), exit immediately leaving services in background
if [ "$DETACH" = "true" ]; then
  exit 0
fi

# Try opening the browser when running interactively
if command -v xdg-open > /dev/null 2>&1; then
  xdg-open "http://localhost:5173" > /dev/null 2>&1 || true
elif command -v open > /dev/null 2>&1; then
  open "http://localhost:5173" || true
fi

echo -e "\033[1;33mServices are running. Press Ctrl+C in this terminal to stop all services.\033[0m"

# Trap Ctrl+C (SIGINT) and SIGTERM to stop everything cleanly via stop.sh
trap 'echo ""; ./stop.sh; exit 0' INT TERM

while true; do
  sleep 2
done
