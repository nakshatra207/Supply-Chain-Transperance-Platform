#!/usr/bin/env bash
# ==============================================================================
# scripts/run.sh — Cross-Platform Execution Script (Linux, macOS, FreeBSD)
# Supports native high-speed startup (default) or containerized (--docker) mode.
# ==============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

if [[ "${1:-}" == "--docker" ]]; then
  echo "==> Starting full Organic Trace stack via Docker Compose / Podman..."
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    docker compose up -d --build
  elif command -v podman-compose >/dev/null 2>&1; then
    podman-compose up -d --build
  else
    docker-compose up -d --build
  fi
  echo "==> Containers started: Frontend http://localhost:5173 | Backend http://localhost:5000 | RPC http://localhost:8545"
  exit 0
fi

exec bash "$ROOT_DIR/start.sh" "$@"
