# ==============================================================================
# scripts/stop.ps1 — Windows PowerShell Clean Shutdown Script
# ==============================================================================
param(
    [switch]$Docker
)

$ErrorActionPreference = "Stop"
$RootDir = Split-Path -Parent $PSScriptRoot
Set-Location $RootDir

if ($Docker) {
    Write-Host "==> Stopping Docker Compose stack..." -ForegroundColor Cyan
    docker compose down
    exit 0
}

python run.py stop
