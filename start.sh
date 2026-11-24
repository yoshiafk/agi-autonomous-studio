#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

PORT="${PORT:-7777}"
MODE="daemon"
USE_DOCKER=false
OPEN_BROWSER=true

open_browser() {
    local url="$1"
    if [ "$OPEN_BROWSER" = false ]; then
        return 0
    fi
    if command -v wslview >/dev/null 2>&1; then
        wslview "$url" >/dev/null 2>&1 || true
    elif command -v cmd.exe >/dev/null 2>&1; then
        cmd.exe /c start "$url" >/dev/null 2>&1 || true
    elif command -v xdg-open >/dev/null 2>&1; then
        xdg-open "$url" >/dev/null 2>&1 || true
    elif command -v open >/dev/null 2>&1; then
        open "$url" >/dev/null 2>&1 || true
    else
        python3 -m webbrowser "$url" >/dev/null 2>&1 || true
    fi
}

# Parse CLI arguments
for arg in "$@"; do
    case "$arg" in
        status|--status)
            python3 server.py status --port "$PORT"
            exit 0
            ;;
        stop|--stop)
            python3 server.py stop --port "$PORT"
            exit 0
            ;;
        restart|--restart)
            python3 server.py restart --port "$PORT"
            exit 0
            ;;
        --docker)
            USE_DOCKER=true
            ;;
        --foreground|-f)
            MODE="foreground"
            ;;
        --daemon|-d)
            MODE="daemon"
            ;;
        --no-browser)
            OPEN_BROWSER=false
            ;;
    esac
done

echo "======================================================="
echo "Antigravity Autonomous Studio Launcher"
echo "======================================================="

# Check if already running on port
if curl -s "http://127.0.0.1:${PORT}/health" >/dev/null 2>&1; then
    echo "[✓] Studio server is already running on port ${PORT}"
    echo "    Opening: http://localhost:${PORT}/?auto=true"
    open_browser "http://localhost:${PORT}/?auto=true"
    exit 0
fi

# If user explicitly requested Docker
if [ "$USE_DOCKER" = true ]; then
    if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
        echo "Starting with Docker Compose..."
        if [ -z "$ANTIGRAVITY_DATA_DIR" ] && [ -d "/mnt/c/Users" ]; then
            WIN_CANDIDATE=$(ls -d /mnt/?/Users/*/.gemini/antigravity 2>/dev/null | head -n 1)
            if [ -n "$WIN_CANDIDATE" ]; then
                export ANTIGRAVITY_DATA_DIR="$WIN_CANDIDATE"
                export ANTIGRAVITY_CONFIG_DIR="$(dirname "$WIN_CANDIDATE")/config"
            fi
        fi
        docker compose up -d
        echo "Running at: http://localhost:${PORT}/?auto=true"
        open_browser "http://localhost:${PORT}/?auto=true"
        exit 0
    else
        echo "[!] Docker requested but Docker daemon is not available. Falling back to native Python..."
    fi
fi

# Native Python (Instant, zero dependencies, works everywhere)
if command -v python3 >/dev/null 2>&1; then
    if [ "$MODE" = "daemon" ]; then
        echo "Starting in background daemon mode (pure Python 3)..."
        python3 server.py --daemon --port "$PORT" $( [ "$OPEN_BROWSER" = true ] && echo "--open-browser" )
        exit 0
    else
        echo "Starting in foreground (pure Python 3)..."
        python3 server.py --port "$PORT" $( [ "$OPEN_BROWSER" = true ] && echo "--open-browser" )
        exit 0
    fi
elif command -v python >/dev/null 2>&1; then
    if [ "$MODE" = "daemon" ]; then
        echo "Starting in background daemon mode (pure Python)..."
        python server.py --daemon --port "$PORT" $( [ "$OPEN_BROWSER" = true ] && echo "--open-browser" )
        exit 0
    else
        echo "Starting in foreground (pure Python)..."
        python server.py --port "$PORT" $( [ "$OPEN_BROWSER" = true ] && echo "--open-browser" )
        exit 0
    fi
else
    echo "Error: Python 3 was not found on your system."
    echo "Please install Python 3.8+ to run Antigravity Studio."
    exit 1
fi
