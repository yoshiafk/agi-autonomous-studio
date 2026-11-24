#!/usr/bin/env bash
set -e

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

PORT="${PORT:-7777}"

open_browser() {
    local url="$1"
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

echo "======================================================="
echo "Antigravity Autonomous Studio Launcher"
echo "======================================================="

# Check if already running on port
if curl -s "http://localhost:${PORT}/health" >/dev/null 2>&1; then
    echo "Studio server is already running on port ${PORT}"
    echo "Opening: http://localhost:${PORT}/?auto=true"
    open_browser "http://localhost:${PORT}/?auto=true"
    exit 0
fi

# Detect Docker vs Native Python
if command -v docker >/dev/null 2>&1 && docker info >/dev/null 2>&1; then
    echo "Starting with Docker Compose..."
    # If in WSL, auto-resolve Windows host path if ANTIGRAVITY_DATA_DIR not exported
    if [ -z "$ANTIGRAVITY_DATA_DIR" ] && [ -d "/mnt/c/Users" ]; then
        WIN_CANDIDATE=$(ls -d /mnt/?/Users/*/.gemini/antigravity 2>/dev/null | head -n 1)
        if [ -n "$WIN_CANDIDATE" ]; then
            export ANTIGRAVITY_DATA_DIR="$WIN_CANDIDATE"
            export ANTIGRAVITY_CONFIG_DIR="$(dirname "$WIN_CANDIDATE")/config"
            echo "Auto-detected Windows Host Data: $ANTIGRAVITY_DATA_DIR"
            if [ ! -f .env ]; then
                cat <<EOF > .env
PORT=${PORT}
ANTIGRAVITY_DATA_DIR=${ANTIGRAVITY_DATA_DIR}
ANTIGRAVITY_CONFIG_DIR=${ANTIGRAVITY_CONFIG_DIR}
EOF
            fi
        fi
    fi
    docker compose up -d
    echo "Running at: http://localhost:${PORT}/?auto=true"
    open_browser "http://localhost:${PORT}/?auto=true"
elif command -v python3 >/dev/null 2>&1; then
    echo "Docker unavailable; starting via native Python 3..."
    python3 server.py --port "$PORT" --open-browser
else
    echo "Error: Neither Docker nor Python 3 was found on your system."
    echo "Please install Python 3.8+ or Docker to run Antigravity Studio."
    exit 1
fi
