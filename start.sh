#!/usr/bin/env bash
#
# start.sh — starts the whole Organic Trace stack on Linux/macOS.
# Run from the project root:   ./start.sh
#
# What it does, every time:
#   1. Starts Postgres via Docker (if not already running)
#   2. Starts the Hardhat local blockchain in the background, logs to logs/hardhat.log
#   3. Waits for it to actually respond, then deploys the smart contract
#      (refreshes CONTRACT_ADDRESS in .env — Hardhat has no memory between restarts)
#   4. Starts the backend in the background, logs to logs/backend.log
#   5. Starts the frontend in the background, logs to logs/frontend.log
#   6. Opens your browser to http://localhost:5173
#
# PIDs of the background processes are saved to .pids so stop.sh can clean up.
# Tail any log live with, e.g.:  tail -f logs/backend.log

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

mkdir -p logs
PID_FILE="$ROOT_DIR/.pids"
> "$PID_FILE"   # truncate/create

step() { echo -e "\n\033[1;36m== $1 ==\033[0m"; }
ok()   { echo -e "\033[1;32m$1\033[0m"; }
err()  { echo -e "\033[1;31m$1\033[0m"; }

step "Starting Postgres (Docker)"
docker compose up -d

step "Starting Hardhat local blockchain (background, logging to logs/hardhat.log)"
(cd contracts && nohup npx hardhat node > "$ROOT_DIR/logs/hardhat.log" 2>&1 & echo $! >> "$PID_FILE")

echo "Waiting for Hardhat to respond..."
READY=false
for i in $(seq 1 15); do
  sleep 2
  if curl -s -X POST http://127.0.0.1:8545 \
      -H "Content-Type: application/json" \
      -d '{"jsonrpc":"2.0","method":"eth_chainId","params":[],"id":1}' \
      > /dev/null 2>&1; then
    READY=true
    break
  fi
done

if [ "$READY" != "true" ]; then
  err "Hardhat didn't respond after 30s — check logs/hardhat.log for errors."
  exit 1
fi
ok "Hardhat is ready."

step "Deploying smart contract"
(cd contracts && npx hardhat run scripts/deploy.js --network localhost)

step "Starting backend (background, logging to logs/backend.log)"
(cd backend && nohup npm run dev > "$ROOT_DIR/logs/backend.log" 2>&1 & echo $! >> "$PID_FILE")

step "Starting frontend (background, logging to logs/frontend.log)"
(cd frontend && nohup npm run dev > "$ROOT_DIR/logs/frontend.log" 2>&1 & echo $! >> "$PID_FILE")

echo ""
echo "Waiting a few seconds for backend/frontend to boot..."
sleep 6

echo ""
ok "All set!"
ok "  Frontend: http://localhost:5173"
ok "  Backend:  http://localhost:5000/api/health"
echo ""
echo "Logs: logs/hardhat.log, logs/backend.log, logs/frontend.log"
echo "To stop everything, run: ./stop.sh"

# Try to open the browser (works on most desktop Linux; harmless if it fails)
if command -v xdg-open > /dev/null; then
  xdg-open "http://localhost:5173" > /dev/null 2>&1 || true
elif command -v open > /dev/null; then
  open "http://localhost:5173" || true
fi
