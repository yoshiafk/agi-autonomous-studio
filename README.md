# 🏢 Antigravity Virtual Dev Office Visualizer

An animated, retro 2D pixel-art office simulator that visualizes **Google Antigravity agents, subagents, and swarm workers** doing real-time development across all your projects.

---

## 🌟 Key Features

- **Multi-Project Auto-Discovery**: Automatically scans and monitors all projects in `~/.gemini/config/projects/` (`my-page-pimcore`, `semeja`, `case-management`, `serba-service-center`, etc.).
- **Automatic Triggering on Future Projects**: Configured with Antigravity Global Lifecycle Hooks (`SessionStart` in `~/.gemini/config/hooks.json`). Any project added in the future automatically awakens the visualizer with zero manual setup.
- **Auto-Follow Mode**: Keep `http://localhost:7777` open in a browser tab or second monitor. Whenever you prompt Antigravity in any workspace, the office automatically switches view and animates that project.
- **Live Event Streaming (SSE)**: Streams tool calls (`invoke_subagent`, `run_command`, `write_file`, `edit_file`, `search_web`), thinking states, and step completions directly from `transcript.jsonl`.
- **Animated Developer Sprites**:
  - **Coordinator**: Plans sprint milestones at the Strategy Whiteboard.
  - **Coder Subagents**: Type rapidly at dual-monitor desks with glowing code displays.
  - **QA & Test Engineers**: Walk over to the Test Server Rack when Docker/pytest/Playwright tests run.
  - **Researchers**: Study docs and RFC schemas.
  - **Break Room**: Agents enjoy coffee at the watercooler when steps finish.

---

## 🚀 Quick Start

### Option A: Install as an Antigravity Plugin (Recommended)
Clone directly into your Antigravity plugins directory to enable the `/studio` chat command:

```bash
# macOS / Linux / WSL
git clone https://github.com/yoshiafk/agi-autonomous-studio.git ~/.gemini/config/plugins/antigravity-studio

# Windows (PowerShell)
git clone https://github.com/yoshiafk/agi-autonomous-studio.git "$env:USERPROFILE\.gemini\config\plugins\antigravity-studio"
```

Once installed, simply type `/studio` in any Antigravity conversation or run `./start.sh` (or `start.bat` on Windows).

---

### Option B: 1-Line Universal Installer

**Linux / macOS / WSL**:
```bash
curl -fsSL https://raw.githubusercontent.com/yoshiafk/agi-autonomous-studio/master/install.sh | bash
```

**Windows (PowerShell)**:
```powershell
irm https://raw.githubusercontent.com/yoshiafk/agi-autonomous-studio/master/install.ps1 | iex
```

---

### Option C: Run via Docker Compose

```bash
git clone https://github.com/yoshiafk/agi-autonomous-studio.git
cd agi-autonomous-studio
docker compose up -d
```

---

### Option D: Native Python 3 (Zero Pip Dependencies)

`server.py` relies solely on standard Python libraries (`http.server`, `sqlite3`, `pathlib`, `json`).

```bash
git clone https://github.com/yoshiafk/agi-autonomous-studio.git
cd agi-autonomous-studio
python3 server.py --open-browser
```

---

## 🔗 Browser URL Patterns

- **Auto-Follow Active Agent**:
  `http://localhost:7777/?auto=true`
- **Lock to a Specific Project**:
  `http://localhost:7777/?project=my-page-pimcore`
  `http://localhost:7777/?project=semeja`
- **Lock to a Specific Conversation**:
  `http://localhost:7777/?conversation=<conversation_id>`

---

## 🛡️ Data Safety & Architecture

- **Read-Only Guarantee**: Both Docker and the backend mount and query Antigravity directories (`brain/`, `config/`) strictly as **read-only (`:ro`)**.
- **Immutable SQLite**: Uses SQLite URI `?mode=ro&immutable=1` to ensure zero file-locking conflicts with Antigravity's active database.
- **Port**: Hosted on `7777`, completely isolated from other local services.
