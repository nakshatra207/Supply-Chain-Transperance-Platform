#!/usr/bin/env bash
#
# Organic Trace — Stack Shutdown Script for Linux & macOS
# =======================================================
# Cleanly terminates all Organic Trace background services:
#   - Kills processes recorded in .pids
#   - Clears any lingering processes on ports 8545, 5000, 5173
#   - Brings down Docker Compose containers if active

set -uo pipefail

# ANSI color codes
GREEN="\033[1;32m"
CYAN="\033[1;36m"
YELLOW="\033[1;33m"
BOLD="\033[1m"
RESET="\033[0m"

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

PID_FILE="$ROOT_DIR/.pids"

echo -e "\n${CYAN}${BOLD}== Stopping Organic Trace Platform Services ==${RESET}"

# 1. Kill tracked PIDs
if [ -f "$PID_FILE" ]; then
  echo "Terminating tracked processes from .pids..."
  while read -r pid; do
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null && echo "  Stopped PID $pid"
    fi
  done < "$PID_FILE"
  rm -f "$PID_FILE"
fi

# 2. Ensure ports 8545, 5000, 5173 are freed
for port in 8545 5000 5173; do
  pids=$(lsof -ti ":$port" 2>/dev/null || true)
  if [ -z "$pids" ] && command -v fuser >/dev/null 2>&1; then
    pids=$(fuser "$port/tcp" 2>/dev/null || true)
  fi
  if [ -n "$pids" ]; then
    echo "  Freeing lingering process on port $port (PID: $pids)..."
    echo "$pids" | xargs kill -9 2>/dev/null || true
  fi
done

# 3. Optional docker compose down if organic_trace container is running
if command -v docker >/dev/null 2>&1; then
  if docker ps --format '{{.Names}}' | grep -q "organic_trace_db"; then
    echo "Stopping PostgreSQL Docker container..."
    docker compose down 2>/dev/null || docker-compose down 2>/dev/null || true
  fi
fi

echo -e "${GREEN}${BOLD}✔ All Organic Trace services stopped successfully.${RESET}\n"
