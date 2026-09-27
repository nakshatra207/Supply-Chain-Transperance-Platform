@echo off
setlocal EnableDelayedExpansion
title Organic Trace - Stop Stack

cd /d "%~dp0"

echo ======================================================================
echo    Organic Trace - Stopping All Services
echo ======================================================================
echo.

where python >nul 2>nul
if %ERRORLEVEL% equ 0 (
    python run.py --stop
    goto done
)

echo [INFO] Stopping processes on ports 8545, 5000, 5173...

powershell -Command "$ports = @(8545, 5000, 5173); foreach ($p in $ports) { $conns = Get-NetTCPConnection -LocalPort $p -ErrorAction SilentlyContinue; if ($conns) { foreach ($c in $conns) { try { Stop-Process -Id $c.OwningProcess -Force -ErrorAction SilentlyContinue; Write-Host ('  Killed PID ' + $c.OwningProcess + ' on port ' + $p) } catch {} } } }"

where docker >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [INFO] Stopping Docker PostgreSQL container...
    docker compose down >nul 2>nul
    echo [OK] Docker stopped.
)

:done
echo.
echo [OK] All Organic Trace services stopped.
ping -n 3 127.0.0.1 >nul 2>&1
exit /b 0
