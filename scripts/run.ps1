# ==============================================================================
# scripts/run.ps1 — Windows PowerShell Execution Script (Windows 10 / Windows 11)
# ==============================================================================
param(
    [switch]$Docker
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location $RootDir

if ($Docker) {
    Write-Host "==> Starting Organic Trace via Docker Compose..." -ForegroundColor Cyan
    docker compose up -d --build
    Write-Host "==> Frontend: http://localhost:5173 | Backend: http://localhost:5000 | RPC: http://localhost:8545" -ForegroundColor Green
    exit 0
}

python run.py start
