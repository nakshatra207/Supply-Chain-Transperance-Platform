#!/usr/bin/env bash
# ==============================================================================
# scripts/build.sh — Cross-Platform Build Script (Linux, macOS, FreeBSD)
# Builds native C11/C++20/ASM accelerators, Solidity contracts, Prisma client,
# Frontend production bundle, and optional multi-arch Docker image.
# ==============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> [1/5] Installing workspace dependencies..."
(cd contracts && npm install --no-audit --no-fund)
(cd backend && npm install --no-audit --no-fund)
(cd frontend && npm install --no-audit --no-fund)

echo "==> [2/5] Compiling Native C11 / C++20 / Assembly Engine..."
if command -v make >/dev/null 2>&1; then
  make clean && make all
else
  echo "    [info] make not found; skipping native addon compilation (JS fallback active)."
fi

echo "==> [3/5] Compiling Solidity Smart Contracts..."
(cd contracts && npx hardhat compile)

echo "==> [4/5] Generating Prisma Database Client..."
(cd backend && npx prisma generate)

echo "==> [5/5] Building Production Frontend Bundle..."
(cd frontend && npm run build)

if [[ "${1:-}" == "--docker" ]]; then
  echo "==> [Docker] Building container image..."
  if docker buildx version >/dev/null 2>&1; then
    docker buildx build --load -t organic-trace:latest .
  else
    docker build -t organic-trace:latest .
  fi
fi

echo "==> Build completed successfully."
