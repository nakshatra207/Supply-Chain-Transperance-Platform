# ==============================================================================
# scripts/build.ps1 — Windows PowerShell Build Script (Windows 10 / Windows 11)
# ==============================================================================
param(
    [switch]$Docker
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location $RootDir

Write-Host "==> [1/4] Installing workspace dependencies..." -ForegroundColor Cyan
Push-Location contracts; npm install --no-audit --no-fund; Pop-Location
Push-Location backend; npm install --no-audit --no-fund; Pop-Location
Push-Location frontend; npm install --no-audit --no-fund; Pop-Location

Write-Host "==> [2/4] Compiling Solidity Smart Contracts..." -ForegroundColor Cyan
Push-Location contracts; npx hardhat compile; Pop-Location

Write-Host "==> [3/4] Generating Prisma Database Client..." -ForegroundColor Cyan
Push-Location backend; npx prisma generate; Pop-Location

Write-Host "==> [4/4] Building Production Frontend Bundle..." -ForegroundColor Cyan
Push-Location frontend; npm run build; Pop-Location

if ($Docker) {
    Write-Host "==> [Docker] Building container image..." -ForegroundColor Cyan
    docker build -t organic-trace:latest .
}

Write-Host "==> Build completed successfully." -ForegroundColor Green
