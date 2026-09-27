@echo off
setlocal EnableDelayedExpansion
title Organic Trace - Full Stack Runner

:: Move to script directory (handles paths with spaces safely)
cd /d "%~dp0"

echo ======================================================================
echo    Organic Trace - Blockchain-Based Organic Farming Traceability
echo ======================================================================
echo.

:: Check if Python is installed and accessible
where python >nul 2>nul
if %ERRORLEVEL% equ 0 goto use_python

:: Fallback to Native Windows Batch Runner if Python is not installed
echo [WARN] Python was not found in PATH. Using native Windows fallback...
echo.

:: Check Node.js
where node >nul 2>nul
if %ERRORLEVEL% neq 0 (
    echo [ERROR] Node.js is required but not installed or not in PATH!
    echo Please install Node.js 18+ from https://nodejs.org
    pause
    exit /b 1
)

:: Prepare environment files
if not exist .env (
    if exist .env.example (
        copy .env.example .env >nul
        echo [OK] Created root .env from .env.example
    )
)

if not exist frontend\.env (
    if exist frontend\.env.example (
        copy frontend\.env.example frontend\.env >nul
        echo [OK] Created frontend\.env from frontend\.env.example
    ) else (
        echo VITE_API_URL=http://localhost:5000> frontend\.env
        echo [OK] Created frontend\.env
    )
)

:: Start Postgres via Docker if available
where docker >nul 2>nul
if %ERRORLEVEL% equ 0 (
    echo [INFO] Starting PostgreSQL container with Docker Compose...
    docker compose up -d >nul 2>nul
    if %ERRORLEVEL% equ 0 (
        echo [OK] Docker PostgreSQL container started.
    ) else (
        echo [WARN] Docker daemon might not be running. If using Docker Desktop, please start it.
    )
) else (
    echo [INFO] Docker not detected. Make sure PostgreSQL is running locally on port 5432.
)

:: Wait 3 seconds for database
ping -n 4 127.0.0.1 >nul 2>&1

:: Database Migration
echo [INFO] Running Prisma database migration...
pushd backend
call npx prisma migrate deploy >nul 2>nul
if %ERRORLEVEL% neq 0 (
    call npx prisma db push >nul 2>nul
)
popd

:: Start Hardhat Blockchain Node in its own window
echo [INFO] Starting Hardhat Local Blockchain in background window...
start "Organic Trace - Hardhat Blockchain (Port 8545)" cmd /k "cd /d "%~dp0contracts" && echo Starting Hardhat Node... && npx hardhat node"

:: Wait for Hardhat Node on port 8545
echo [INFO] Waiting for Hardhat Node to initialize...
powershell -Command "$ready = $false; for ($i=0; $i -lt 25; $i++) { try { $res = Invoke-RestMethod -Uri 'http://127.0.0.1:8545' -Method Post -Body '{\"jsonrpc\":\"2.0\",\"method\":\"eth_chainId\",\"params\":[],\"id\":1}' -ContentType 'application/json' -TimeoutSec 2 -ErrorAction Stop; if ($res.result) { $ready = $true; break } } catch { Start-Sleep -Seconds 1 } }; if (-not $ready) { exit 1 }"
if %ERRORLEVEL% neq 0 (
    echo [WARN] Hardhat node did not respond on port 8545 within 25 seconds.
) else (
    echo [OK] Hardhat local blockchain is online.
)

:: Deploy Smart Contract
echo [INFO] Compiling and deploying smart contract...
pushd contracts
call npx hardhat run scripts/deploy.js --network localhost
popd

:: Seed Database
echo [INFO] Seeding database with demo data...
pushd backend
call node prisma/seed.js >nul 2>nul
popd

:: Start Backend API in its own window
echo [INFO] Starting Express Backend in background window...
start "Organic Trace - Backend API (Port 5000)" cmd /k "cd /d "%~dp0backend" && echo Starting Express Backend... && npm run dev"

:: Start Frontend UI in its own window
echo [INFO] Starting React Frontend in background window...
start "Organic Trace - Frontend UI (Port 5173)" cmd /k "cd /d "%~dp0frontend" && echo Starting Vite Dev Server... && npm run dev"

:: Wait 5 seconds and open browser
ping -n 6 127.0.0.1 >nul 2>&1
echo [INFO] Launching browser...
start http://localhost:5173

echo.
echo ======================================================================
echo    [SUCCESS] Organic Trace is running!
echo ======================================================================
echo    Frontend:   http://localhost:5173
echo    Backend:    http://localhost:5000/api/health
echo    Blockchain: http://127.0.0.1:8545
echo.
echo    Demo Accounts (Password: Demo@1234):
echo      - Farmer:  farmer@example.com
echo      - Partner: partner@example.com
echo      - Admin:   admin@example.com
echo.
echo    To stop all services, run stop.bat
echo ======================================================================
echo.
pause
exit /b 0

:use_python
echo [OK] Python detected. Handing off to orchestrator run.py...
echo.
python run.py %*
if %ERRORLEVEL% neq 0 (
    echo.
    echo [ERROR] Process exited with code %ERRORLEVEL%.
    pause
)
exit /b %ERRORLEVEL%
