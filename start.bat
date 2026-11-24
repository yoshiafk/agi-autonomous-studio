@echo off
setlocal
cd /d "%~dp0"

set PORT=7777

echo =======================================================
echo  Antigravity Autonomous Studio Launcher (Windows)
echo =======================================================

curl -s http://localhost:%PORT%/health >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Studio is already running on port %PORT%!
    start http://localhost:%PORT%/?auto=true
    goto :eof
)

docker info >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Starting via Docker Compose...
    docker compose up -d
    echo Visualizer running at http://localhost:%PORT%
    start http://localhost:%PORT%/?auto=true
    goto :eof
)

python --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Docker not running. Starting via Python...
    start "Antigravity Studio" python server.py --port %PORT% --open-browser
    goto :eof
)

py -3 --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Docker not running. Starting via py launcher...
    start "Antigravity Studio" py -3 server.py --port %PORT% --open-browser
    goto :eof
)

echo Error: Neither Docker nor Python was found on your system.
pause
