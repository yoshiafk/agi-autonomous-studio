---
name: studio
description: Launch, inspect, and manage the Antigravity Autonomous Studio — a live 2D virtual office visualizer showing real-time multi-agent activity, auto-following active sessions, and audio telemetry. Use when the user asks to "launch studio", "open office visualizer", "check agent studio", or invokes the /studio slash command.
---

# Antigravity Autonomous Studio

Antigravity Autonomous Studio is a live 2D architectural virtual office visualizer that streams real-time agent actions, tool executions, subagent lifecycles, and context health directly from the Antigravity engine. It works completely standalone with pure Python (zero pip packages required) or optionally via Docker.

## Key Capabilities
- **Real-Time Telemetry**: Live SSE stream of agent actions, tool calls, and roadmap progress.
- **Multi-Session Auto-Detection**: Automatically tracks whichever conversation or project is currently active without hijacking focus.
- **8-Bit Chiptune Soundscape**: Procedural audio feedback for agent steps, tool executions, and milestone completion.
- **Instant State Hydration**: Pre-computed server state ensures seamless, lag-free session switching (<15ms).
- **Master Steering Cockpit**: Real-time context capacity gauge and operator steering controls (Nudge, Pause, Breakout).

## Usage Instructions

When the user asks to open, launch, or view the studio visualizer, or invokes `/studio`:
1. **Check Server Status**: Check if the studio server is listening on port 7777:
   - Command: `curl -s http://127.0.0.1:7777/health`
2. **Start if Inactive**: If the server is not running, launch it in detached daemon mode:
   - Linux / macOS / WSL: `python3 server.py --daemon` (or `./start.sh --daemon`)
   - Windows native: `python server.py --daemon` (or `start.bat`)
   - Optional Docker: `docker compose up -d`
   *(The `--daemon` flag verifies server readiness within 1 second and exits cleanly so your turn is never blocked).*
3. **Open Visualizer**: Provide the user with the direct link to the live visualizer:
   - [Antigravity Studio Visualizer](http://localhost:7777/?auto=true)
4. **Session Inspection**: To view currently active or detected agent conversations, query `GET http://127.0.0.1:7777/api/sessions/active`.
5. **Manage Server**:
   - Check status: `python3 server.py status`
   - Stop server: `python3 server.py stop`
   - Restart server: `python3 server.py restart`
