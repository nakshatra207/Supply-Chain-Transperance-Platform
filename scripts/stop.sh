#!/usr/bin/env bash
# ==============================================================================
# scripts/stop.sh — Cross-Platform Clean Shutdown Script (Linux, macOS, FreeBSD)
# ==============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ "${1:-}" == "--docker" ]]; then
  echo "==> Stopping Docker Compose / Podman containers..."
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    docker compose down
  elif command -v podman-compose >/dev/null 2>&1; then
    podman-compose down
  elif command -v docker-compose >/dev/null 2>&1; then
    docker-compose down
  fi
  exit 0
fi

exec bash "$ROOT_DIR/stop.sh" "$@"
