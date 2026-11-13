# ==============================================================================
# scripts/test.ps1 — Windows PowerShell Automated Test Suite Runner
# ==============================================================================
$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location $RootDir

Write-Host "==> [1/3] Running Solidity Smart Contract Tests..." -ForegroundColor Cyan
npm run test:contracts

Write-Host "==> [2/3] Running Backend Unit, DSA, Security & E2E Tests..." -ForegroundColor Cyan
npm run test:backend

Write-Host "==> [3/3] Running Frontend Unit Tests..." -ForegroundColor Cyan
npm run test:frontend

Write-Host "==> All automated test suites passed!" -ForegroundColor Green
