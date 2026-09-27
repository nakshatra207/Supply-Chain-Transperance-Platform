#!/usr/bin/env bash
#
# stop.sh — stops everything start.sh started: Hardhat, backend, frontend
# (via saved PIDs) and Postgres (via docker compose down).

set -uo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT_DIR"

PID_FILE="$ROOT_DIR/.pids"

if [ -f "$PID_FILE" ]; then
  echo "Stopping Hardhat, backend, and frontend..."
  while read -r pid; do
    if [ -n "$pid" ] && kill -0 "$pid" 2>/dev/null; then
      kill "$pid" 2>/dev/null && echo "  stopped PID $pid"
    fi
  done < "$PID_FILE"
  rm -f "$PID_FILE"
else
  echo "No .pids file found — nothing to stop from a previous start.sh run."
fi

echo "Stopping Postgres..."
docker compose down

echo "Done."
