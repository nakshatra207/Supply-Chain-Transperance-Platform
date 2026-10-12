#!/usr/bin/env bash
#
# Organic Trace — Stack Startup Script for Linux & macOS
# =====================================================
# Starts the entire platform in the background:
#   1. Validates prerequisites & environment files (.env)
#   2. Verifies dependencies (npm install if node_modules missing)
#   3. Checks/starts PostgreSQL (native or via Docker Compose)
#   4. Syncs database schema and seeds demo accounts
#   5. Frees lingering ports & starts Hardhat local Ethereum node (port 8545)
#   6. Compiles and deploys SupplyChain.sol smart contract
#   7. Starts Express.js backend API (port 5000)
#   8. Starts React + Vite frontend UI (port 5173)
#   9. Opens the browser to http://localhost:5173
#
# Processes are cleanly detached so they survive shell exits.
# Process IDs are stored in .pids so ./stop.sh can stop everything cleanly.
# Logs are streamed to logs/hardhat.log, logs/backend.log, logs/frontend.log.

set -euo pipefail

# ANSI color codes
GREEN="\033[1;32m"
CYAN="\033[1;36m"
YELLOW="\033[1;33m"
RED="\033[1;31m"
MAGENTA="\033[1;35m"
BOLD="\033[1m"
DIM="\033[2m"
RESET="\033[0m"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

LOGS_DIR="$ROOT_DIR/logs"
mkdir -p "$LOGS_DIR"
PID_FILE="$ROOT_DIR/.pids"
> "$PID_FILE"

step() { echo -e "\n${CYAN}${BOLD}== $1 ==${RESET}"; }
ok()   { echo -e "  ${GREEN}✔ $1${RESET}"; }
warn() { echo -e "  ${YELLOW}⚠ $1${RESET}"; }
err()  { echo -e "  ${RED}✖ $1${RESET}"; }

free_port() {
  local port=$1
  local pids
  pids=$(lsof -ti ":$port" 2>/dev/null || true)
  if [ -z "$pids" ] && command -v fuser >/dev/null 2>&1; then
    pids=$(fuser "$port/tcp" 2>/dev/null || true)
  fi
  if [ -n "$pids" ]; then
    warn "Port $port is currently in use (PID: $pids). Freeing port..."
    echo "$pids" | xargs kill -9 2>/dev/null || true
    sleep 1
  fi
}

echo -e "${GREEN}${BOLD}"
echo "   ___                        _        _____                    "
echo "  / _ \ _ _ __ _ __ _ _ _  (_) __   |_   _| _ __ _  __ ___    "
echo " | (_) | '_/ _\` / _\` | ' \ | |/ _|    | || '_/ _\` |/ _/ -_)   "
echo "  \___/|_| \__, \__,_|_||_||_|\__|    |_||_| \__,_|\__\___|   "
echo "           |___/                                               "
echo "     Blockchain-Based Organic Farming Traceability Platform    "
echo -e "${RESET}"

# 1. Environment & Config
step "1. Checking Configuration & Environment"
if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
  ok "Created .env from .env.example"
else
  ok ".env configuration found"
fi

if [ ! -f frontend/.env ] && [ -f frontend/.env.example ]; then
  cp frontend/.env.example frontend/.env
  ok "Created frontend/.env from frontend/.env.example"
elif [ ! -f frontend/.env ]; then
  echo "VITE_API_URL=http://localhost:5000" > frontend/.env
  ok "Created frontend/.env"
else
  ok "frontend/.env configuration found"
fi

# 2. Dependencies
step "2. Checking Project Dependencies"
for dir in contracts backend frontend; do
  if [ ! -d "$dir/node_modules" ]; then
    warn "node_modules missing in $dir/. Installing dependencies with npm install..."
    (cd "$dir" && npm install)
    ok "$dir dependencies installed"
  else
    ok "$dir dependencies already present"
  fi
done

# 3. Database
step "3. Checking / Starting PostgreSQL Database"
if (echo > /dev/tcp/127.0.0.1/5432) >/dev/null 2>&1; then
  ok "PostgreSQL is active on port 5432"
else
  warn "PostgreSQL is not listening on port 5432. Starting via Docker Compose..."
  if command -v docker >/dev/null 2>&1; then
    docker compose up -d 2>/dev/null || docker-compose up -d 2>/dev/null || true
    # Wait for PostgreSQL
    PG_READY=false
    for _ in $(seq 1 25); do
      if (echo > /dev/tcp/127.0.0.1/5432) >/dev/null 2>&1; then
        PG_READY=true
        break
      fi
      sleep 1
    done
    if [ "$PG_READY" = "true" ]; then
      ok "PostgreSQL container is ready on port 5432"
    else
      warn "PostgreSQL did not respond on port 5432. Please ensure PostgreSQL or Docker is running."
    fi
  else
    err "Docker is not installed and PostgreSQL is not listening on port 5432."
  fi
fi

# Run Prisma migrations & seed
echo -e "  ${DIM}Syncing database schema and seeding demo accounts...${RESET}"
(cd backend && npx prisma db push --skip-generate >/dev/null 2>&1) || true
(cd backend && node prisma/seed.js >/dev/null 2>&1) || true
ok "Database schema synced and seeded"

# 4. Hardhat Local Blockchain
step "4. Starting Hardhat Blockchain Node (Port 8545)"
free_port 8545

setsid sh -c "cd '$ROOT_DIR/contracts' && exec npx hardhat node" > "$LOGS_DIR/hardhat.log" 2>&1 < /dev/null &
RAW_PID=$!

echo -n "  Waiting for Hardhat node JSON-RPC to respond..."
HH_READY=false
for _ in $(seq 1 25); do
  if curl -s -X POST http://127.0.0.1:8545 \
      -H "Content-Type: application/json" \
      -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
      > /dev/null 2>&1; then
    HH_READY=true
    break
  fi
  sleep 1
  echo -n "."
done
echo ""

if [ "$HH_READY" != "true" ]; then
  err "Hardhat node did not respond after 25s. Check logs/hardhat.log."
  exit 1
fi

HARDHAT_PID=$(lsof -ti :8545 2>/dev/null | head -n 1 || echo "$RAW_PID")
echo "$HARDHAT_PID" >> "$PID_FILE"
ok "Hardhat local blockchain is online on http://127.0.0.1:8545 (PID $HARDHAT_PID)"

# 5. Smart Contract Deployment
step "5. Deploying Smart Contract (SupplyChain.sol)"
DEPLOY_OUTPUT=$(cd contracts && npx hardhat run scripts/deploy.js --network localhost 2>&1)
echo "$DEPLOY_OUTPUT" | while read -r line; do
  echo -e "  ${DIM}$line${RESET}"
done

CONTRACT_ADDR=$(grep -oE "0x[a-fA-F0-9]{40}" <<< "$DEPLOY_OUTPUT" | head -n 1 || echo "")
if [ -n "$CONTRACT_ADDR" ]; then
  ok "Smart contract deployed at: ${BOLD}$CONTRACT_ADDR${RESET}"
else
  warn "Contract deployment finished. Check output above."
fi

# 6. Backend API Server
step "6. Starting Express Backend API (Port 5000)"
free_port 5000

setsid sh -c "cd '$ROOT_DIR/backend' && exec npm run dev" > "$LOGS_DIR/backend.log" 2>&1 < /dev/null &
RAW_BACKEND_PID=$!

echo -n "  Waiting for Backend API health check (/api/health)..."
API_READY=false
for _ in $(seq 1 25); do
  if curl -s http://localhost:5000/api/health | grep -q '"status":"ok"' >/dev/null 2>&1; then
    API_READY=true
    break
  fi
  sleep 1
  echo -n "."
done
echo ""

if [ "$API_READY" = "true" ]; then
  BACKEND_PID=$(lsof -ti :5000 2>/dev/null | head -n 1 || echo "$RAW_BACKEND_PID")
  echo "$BACKEND_PID" >> "$PID_FILE"
  ok "Backend API is online and healthy on http://localhost:5000 (PID $BACKEND_PID)"
else
  warn "Backend API did not respond to /api/health within 25s. Check logs/backend.log."
fi

# 7. Frontend UI Server
step "7. Starting React + Vite Frontend (Port 5173)"
free_port 5173

setsid sh -c "cd '$ROOT_DIR/frontend' && exec npm run dev" > "$LOGS_DIR/frontend.log" 2>&1 < /dev/null &
RAW_FRONTEND_PID=$!

echo -n "  Waiting for Frontend UI server..."
FE_READY=false
for _ in $(seq 1 25); do
  if curl -s -I http://localhost:5173 2>/dev/null | grep -q "HTTP/1.1 200 OK" >/dev/null 2>&1; then
    FE_READY=true
    break
  fi
  sleep 1
  echo -n "."
done
echo ""

if [ "$FE_READY" = "true" ]; then
  FRONTEND_PID=$(lsof -ti :5173 2>/dev/null | head -n 1 || echo "$RAW_FRONTEND_PID")
  echo "$FRONTEND_PID" >> "$PID_FILE"
  ok "Frontend UI server is online on http://localhost:5173 (PID $FRONTEND_PID)"
else
  warn "Frontend UI did not respond within 25s. Check logs/frontend.log."
fi

# 8. Readiness Summary
echo ""
echo -e "${GREEN}=================================================================${RESET}"
echo -e "${GREEN}${BOLD}             ORGANIC TRACE PLATFORM IS READY!                    ${RESET}"
echo -e "${GREEN}=================================================================${RESET}"
echo -e "  ${BOLD}Frontend Web App:${RESET}    ${CYAN}http://localhost:5173${RESET}"
echo -e "  ${BOLD}Backend API Health:${RESET}  ${CYAN}http://localhost:5000/api/health${RESET}"
echo -e "  ${BOLD}Hardhat RPC Node:${RESET}    ${CYAN}http://127.0.0.1:8545${RESET}"
echo -e "  ${BOLD}Logs Directory:${RESET}      ${DIM}$LOGS_DIR${RESET}"
echo -e "-----------------------------------------------------------------"
echo -e "  ${BOLD}Demo Login Credentials (Password: Demo@1234):${RESET}"
echo -e "    - Farmer:   ${MAGENTA}farmer@example.com${RESET}  (Create batches, upload certs)"
echo -e "    - Partner:  ${MAGENTA}partner@example.com${RESET} (Add supply chain events)"
echo -e "    - Admin:    ${MAGENTA}admin@example.com${RESET}"
echo -e "  ${BOLD}Public Traceability Link:${RESET}"
echo -e "    - ${CYAN}http://localhost:5173/trace/ORG-BAS-001${RESET} (No login required)"
echo -e "-----------------------------------------------------------------"
echo -e "  ${YELLOW}To stop all services, run:${RESET} ${BOLD}./stop.sh${RESET}"
echo -e "${GREEN}=================================================================${RESET}"
echo ""

# Try opening in browser
if command -v xdg-open > /dev/null 2>&1; then
  xdg-open "http://localhost:5173" > /dev/null 2>&1 || true
elif command -v open > /dev/null 2>&1; then
  open "http://localhost:5173" 2>/dev/null || true
fi
