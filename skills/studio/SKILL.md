---
name: studio
description: Launch, inspect, and manage the Antigravity Autonomous Studio — a live 2D virtual office visualizer showing real-time multi-agent activity, auto-following active sessions, and audio telemetry. Use when the user asks to "launch studio", "open office visualizer", "check agent studio", or invokes the /studio slash command.
---

# Antigravity Autonomous Studio

Antigravity Autonomous Studio is a live 2D architectural virtual office visualizer that streams real-time agent actions, tool executions, subagent lifecycles, and context health directly from the Antigravity engine.

## Key Capabilities
- **Real-Time Telemetry**: Live SSE stream of agent actions, tool calls, and roadmap progress.
- **Multi-Session Auto-Detection**: Automatically tracks whichever conversation or project is currently active without hijacking focus.
- **8-Bit Chiptune Soundscape**: Procedural audio feedback for agent steps, tool executions, and milestone completion.
- **Instant State Hydration**: Pre-computed server state ensures seamless, lag-free session switching (<15ms).

## Usage Instructions

When the user asks to open, launch, or view the studio visualizer, or invokes `/studio`:
1. **Check Server Status**: Check if the studio server is listening on port 7777 (e.g. `curl -s http://localhost:7777/health` or `GET http://localhost:7777/api/sessions/active`).
2. **Start if Inactive**: If the server is not running:
   - On Linux/macOS/WSL: run `./start.sh` or `python3 server.py` in the background.
   - On Windows: run `start.bat` or `python server.py`.
   - On Docker: run `docker compose up -d`.
3. **Open Visualizer**: Provide the user with the direct link to the live visualizer:
   - Dashboard: [http://localhost:7777/?auto=true](http://localhost:7777/?auto=true)
4. **Session Inspection**: To view currently active or detected agent conversations, query `GET http://localhost:7777/api/sessions/active`.
