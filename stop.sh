#!/usr/bin/env bash
#
# stop.sh — stops everything started by start.sh: Hardhat, backend, frontend,
# and cleans up ports 8545, 5000, 5173 via native C++ /proc/net/tcp scanner.
#

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

PID_FILE="$ROOT_DIR/.pids"
LAUNCHER="$ROOT_DIR/native/fast_launcher"

echo "Stopping Organic Trace background processes..."

# Stop saved PIDs
if [ -f "$PID_FILE" ]; then
  while read -r pid; do
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill -9 "$pid" 2>/dev/null && echo "  Stopped PID $pid"
    fi
  done < "$PID_FILE"
  rm -f "$PID_FILE"
fi

# Ensure all project ports are freed using native C++ engine (fallback to lsof)
if [ -x "$LAUNCHER" ]; then
  "$LAUNCHER" free-ports 8545 5000 5173
else
  for port in 8545 5000 5173; do
    pids=$(lsof -ti:"$port" 2>/dev/null || true)
    if [ -n "$pids" ]; then
      for pid in $pids; do
        kill -9 "$pid" 2>/dev/null && echo "  Freed port $port (killed PID $pid)"
      done
    fi
  done
fi

echo "All Organic Trace services stopped successfully."
