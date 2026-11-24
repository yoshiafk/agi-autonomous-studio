#!/usr/bin/env bash
# Start Antigravity Office Visualizer via Docker or Host Python

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" >/dev/null 2>&1 && pwd)"
cd "$DIR"

if command -v docker >/dev/null 2>&1; then
    echo "🐳 Starting Antigravity Office Visualizer with Docker..."
    docker compose up -d
    echo "✅ Running at: http://localhost:7777"
else
    echo "🐍 Docker not found, starting via local Python..."
    python3 server.py
fi
