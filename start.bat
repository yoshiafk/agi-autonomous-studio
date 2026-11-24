@echo off
echo Starting Antigravity Office Visualizer...
cd /d "%~dp0"
docker compose up -d
echo Visualizer running at http://localhost:7777
start http://localhost:7777/?auto=true
