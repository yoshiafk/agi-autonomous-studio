@echo off
setlocal
cd /d "%~dp0"

set PORT=7777
set CMD_ARG=%1

if "%CMD_ARG%"=="status" (
    python server.py status 2>nul || py -3 server.py status 2>nul || py server.py status 2>nul
    goto :eof
)
if "%CMD_ARG%"=="stop" (
    python server.py stop 2>nul || py -3 server.py stop 2>nul || py server.py stop 2>nul
    goto :eof
)
if "%CMD_ARG%"=="restart" (
    python server.py restart 2>nul || py -3 server.py restart 2>nul || py server.py restart 2>nul
    goto :eof
)

echo =======================================================
echo  Antigravity Autonomous Studio Launcher (Windows)
echo =======================================================

curl -s http://localhost:%PORT%/health >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo [OK] Studio is already running on port %PORT%!
    start http://localhost:%PORT%/?auto=true
    goto :eof
)

python --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Starting native Python daemon...
    python server.py --daemon --port %PORT% --open-browser
    goto :eof
)

py -3 --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Starting native Python daemon via py launcher...
    py -3 server.py --daemon --port %PORT% --open-browser
    goto :eof
)

py --version >nul 2>&1
if %ERRORLEVEL% EQU 0 (
    echo Starting native Python daemon via py...
    py server.py --daemon --port %PORT% --open-browser
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

echo Error: Neither Python 3.8+ nor Docker was found on your system.
pause
