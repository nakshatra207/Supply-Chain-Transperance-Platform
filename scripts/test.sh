#!/usr/bin/env bash
# ==============================================================================
# scripts/test.sh — Automated QA, Native Benchmark, Coverage & Security Test Runner
# ==============================================================================
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

echo "==> [1/4] Running Native C11 / C++20 / Assembly Micro-Benchmark..."
if [[ -x "./native/fast_launcher" ]]; then
  ./native/fast_launcher benchmark
else
  make benchmark
fi

echo "==> [2/4] Running Solidity Smart Contract Unit Tests (Hardhat)..."
npm run test:contracts

echo "==> [3/4] Running Backend Unit, DSA, Security, E2E & Load Tests..."
npm run test:backend

echo "==> [4/4] Running Frontend Voice, i18n & Input Sanitization Tests..."
npm run test:frontend

echo "==> All automated test suites passed!"
