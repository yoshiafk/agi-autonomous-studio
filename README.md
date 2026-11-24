# Antigravity Autonomous Studio

A live 2D architectural tech studio visualizer that monitors and renders **Google Antigravity agents, subagents, and swarm teams** performing real-time development across all your projects.

---

## Key Capabilities

- **Zero Docker Prerequisite**: Runs on pure Python standard library (`http.server`, `sqlite3`, `subprocess`, `json`) with **zero third-party pip dependencies**. Starts in <150ms on any machine with Python 3.8+.
- **Master Steering Cockpit**: Full-width dedicated steering dock below the canvas displaying live agent context utilization (`%` and `k / 200k`), color-coded token health, and human-in-the-loop steering controls (`Nudge`, `Pause/Resume`, `Breakout`).
- **Modern Architectural Tech Studio Canvas**:
  - **Collaborative Pods**: Pod Alpha (Core Engineering) and Pod Beta (Intelligence & Code Review) with dual curved IDE screens, vertical PR diff review monitors, and token streams.
  - **Specialist Stations**: Architecture Drafting Bench with blueprint sheets, QA Mobile Device Test Bench with live test logs, CI/CD Server Bay with raised antistatic flooring, and Git Remote Dispatch with 3D parabolic uplink antenna.
  - **Breakout Lounge & Cafe**: Barista espresso bar, curved Scandinavian sofa, mid-century armchair, and knowledge archive bookshelf for natural idle distribution.
  - **Night Mode Skyline Horizon**: Architectural skyscraper skyline with illuminated office windows and blinking aviation beacons.
- **Uniform Specialists Roster**: Balanced, high-density roster tiles featuring 2-letter agent monograms, live status indicators, station tags, and micro context capacity meters.
- **8-Bit Chiptune Soundscape**: Audio telemetry synthesis providing acoustic feedback for agent steps, tool executions, terminal commands, and milestone achievements.
- **Multi-Session Auto-Follow**: Seamlessly auto-switches to whichever project or conversation is actively running in Antigravity without hijacking focus.

---

## Quick Start

### Option 1: Install as an Antigravity Plugin (Recommended)
Clone directly into your Antigravity plugins directory to enable the `/studio` chat command and agent integration:

**Linux / macOS / WSL**:
```bash
git clone https://github.com/yoshiafk/agi-autonomous-studio.git ~/.gemini/config/plugins/antigravity-studio
```

**Windows (PowerShell)**:
```powershell
git clone https://github.com/yoshiafk/agi-autonomous-studio.git "$env:USERPROFILE\.gemini\config\plugins\antigravity-studio"
```

Once installed, simply type `/studio` in any Antigravity conversation or ask your agent to "open studio".

---

### Option 2: 1-Line Universal Installer

**Linux / macOS / WSL**:
```bash
curl -fsSL https://raw.githubusercontent.com/yoshiafk/agi-autonomous-studio/master/install.sh | bash
```

**Windows (PowerShell)**:
```powershell
irm https://raw.githubusercontent.com/yoshiafk/agi-autonomous-studio/master/install.ps1 | iex
```

---

### Option 3: Standalone Native Python (Zero Pip Packages)

Clone and run instantly with no build step:

```bash
git clone https://github.com/yoshiafk/agi-autonomous-studio.git
cd agi-autonomous-studio

# Start in background daemon mode (non-blocking)
python3 server.py --daemon --open-browser

# Check daemon status
python3 server.py status

# Stop daemon
python3 server.py stop
```

---

### Option 4: Docker Compose (Optional Containerized Mode)

If you prefer containerized isolation:

```bash
git clone https://github.com/yoshiafk/agi-autonomous-studio.git
cd agi-autonomous-studio
docker compose up -d
```

---

## CLI Command Reference

`server.py` and `studio.core` provide complete lifecycle management:

| Command | Action |
| :--- | :--- |
| `python server.py --daemon` | Start server as a detached background daemon and verify health |
| `python server.py status` | Check whether studio server is running and print port/PID metadata |
| `python server.py stop` | Gracefully terminate active studio daemon process |
| `python server.py restart` | Stop active daemon and start fresh instance |
| `python server.py --port 7777` | Run server in foreground (ideal for Docker or debugging) |
| `python server.py --open-browser` | Launch default browser to `http://localhost:7777/?auto=true` |

---

## Browser URL Patterns

- **Auto-Follow Active Agent**:
  `http://localhost:7777/?auto=true`
- **Lock to a Specific Project**:
  `http://localhost:7777/?project=web-frontend`
  `http://localhost:7777/?project=api-service`
- **Lock to a Specific Conversation**:
  `http://localhost:7777/?conversation=<conversation_id>`

---

## Security & Architecture

- **Zero-Dependency Core**: Pure Python standard library implementation eliminates security attack surfaces from third-party pip packages.
- **Loopback Isolation & Host Shield**: Server binds to `127.0.0.1` by default and validates HTTP Host headers against DNS rebinding attacks.
- **Path Traversal Protection**: Enforces `os.path.realpath` boundary containment on all file reads.
- **Read-Only Telemetry**: Antigravity transcript and database queries use immutable read-only modes (`?mode=ro&immutable=1`), preventing any lock contention.
- **Zero-Emoji Compliance**: Clean, vector-based SVG iconography and canvas rendering.
