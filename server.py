#!/usr/bin/env python3
"""
Antigravity Multi-Project Virtual Office Visualizer Backend
Zero external dependencies (Python 3 standard library only).
Provides:
  - Static Web UI serving
  - Multi-project auto-discovery from ~/.gemini/config/projects & conversation_summaries.db
  - Live Server-Sent Events (SSE) tailing transcript.jsonl
  - Session activation hooks
"""

import os
import sys
import json
import time
import urllib.parse
import sqlite3
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

# Environment & Path Resolution
PORT = int(os.environ.get("PORT", 7777))

def resolve_antigravity_paths():
    """Detects Antigravity data & config paths across Docker, WSL, and Windows."""
    # 1. Check explicit environment overrides
    env_data = os.environ.get("ANTIGRAVITY_DATA_DIR")
    env_config = os.environ.get("ANTIGRAVITY_CONFIG_DIR")
    if env_data and os.path.exists(env_data):
        return Path(env_data), Path(env_config or "/data/config")

    # 2. Check Docker container mounts
    if os.path.exists("/data/antigravity"):
        return Path("/data/antigravity"), Path("/data/config")

    # 3. Check WSL Linux mounts
    home = Path.home()
    wsl_win_data = Path("/mnt/c/Users/yosyf/.gemini/antigravity")
    wsl_win_config = Path("/mnt/c/Users/yosyf/.gemini/config")
    if wsl_win_data.exists():
        return wsl_win_data, wsl_win_config

    # 4. Check native user home (Linux or Windows)
    native_data = home / ".gemini" / "antigravity"
    native_config = home / ".gemini" / "config"
    if native_data.exists():
        return native_data, native_config

    return wsl_win_data, wsl_win_config

DATA_DIR, CONFIG_DIR = resolve_antigravity_paths()
PUBLIC_DIR = Path(__file__).resolve().parent / "public"

print(f"[*] Antigravity Data Dir:   {DATA_DIR}")
print(f"[*] Antigravity Config Dir: {CONFIG_DIR}")
print(f"[*] Static Web UI Dir:      {PUBLIC_DIR}")

# Global state for active session broadcast
LATEST_ACTIVATION = {"conversation_id": None, "workspace": None, "timestamp": 0}

def get_db_connection():
    """Returns read-only, immutable SQLite connection to conversation_summaries.db."""
    db_path = DATA_DIR / "conversation_summaries.db"
    if not db_path.exists():
        return None
    try:
        # Use URI mode with ro and immutable=1 to avoid NTFS locking issues
        uri = f"file:{db_path.as_posix()}?mode=ro&immutable=1"
        return sqlite3.connect(uri, uri=True, timeout=2.0)
    except Exception as e:
        print(f"[!] SQLite connection error: {e}", file=sys.stderr)
        return None

def scan_projects():
    """Scans and groups all projects from ~/.gemini/config/projects and database."""
    projects_dict = {}

    # 1. Read registered project manifests from ~/.gemini/config/projects/*.json
    projects_dir = CONFIG_DIR / "projects"
    if projects_dir.exists():
        for p_file in projects_dir.glob("*.json"):
            try:
                data = json.loads(p_file.read_text(encoding="utf-8"))
                p_id = data.get("id") or p_file.stem
                p_name = data.get("name") or p_id
                
                # Extract workspace paths
                paths = []
                resources = data.get("projectResources", {}).get("resources", [])
                for r in resources:
                    folder_uri = r.get("gitFolder", {}).get("folderUri", "")
                    if folder_uri:
                        # Unquote file:///z%3A/home/yoshiafk/...
                        decoded = urllib.parse.unquote(folder_uri).replace("file:///", "")
                        # Extract folder name
                        folder_name = decoded.rstrip("/").split("/")[-1]
                        paths.append({"name": folder_name, "path": decoded})

                projects_dict[p_id] = {
                    "id": p_id,
                    "name": p_name,
                    "folders": paths,
                    "display_name": p_name if p_name != p_id else (paths[0]["name"] if paths else p_id),
                    "active": False,
                    "total_conversations": 0,
                    "latest_conversation_id": None,
                    "latest_modified": "",
                    "conversations": []
                }
            except Exception as e:
                pass

    # 2. Query conversation_summaries.db for active conversations and recent titles
    conn = get_db_connection()
    if conn:
        try:
            cur = conn.cursor()
            cur.execute("""
                SELECT conversation_id, title, project_id, workspace_uris, not_fully_idle, last_modified_time, step_count
                FROM conversation_summaries
                ORDER BY last_modified_time DESC
            """)
            rows = cur.fetchall()

            for conv_id, title, p_id, w_uris, not_fully_idle, mod_time, steps in rows:
                p_key = p_id if p_id else "outside-of-project"
                
                # Derive display name if project not in manifests
                if p_key not in projects_dict:
                    folder_name = "General / Scratch"
                    if w_uris:
                        try:
                            uris_list = json.loads(w_uris)
                            if uris_list:
                                decoded = urllib.parse.unquote(uris_list[0]).replace("file:///", "")
                                folder_name = decoded.rstrip("/").split("/")[-1]
                        except Exception:
                            folder_name = p_key
                    projects_dict[p_key] = {
                        "id": p_key,
                        "name": folder_name,
                        "folders": [{"name": folder_name, "path": ""}],
                        "display_name": folder_name,
                        "active": False,
                        "total_conversations": 0,
                        "latest_conversation_id": None,
                        "latest_modified": "",
                        "conversations": []
                    }

                p_entry = projects_dict[p_key]
                p_entry["total_conversations"] += 1
                if not_fully_idle == 1:
                    p_entry["active"] = True

                if not p_entry["latest_conversation_id"]:
                    p_entry["latest_conversation_id"] = conv_id
                    p_entry["latest_modified"] = mod_time

                # Keep up to 8 recent conversations per project
                if len(p_entry["conversations"]) < 8:
                    p_entry["conversations"].append({
                        "id": conv_id,
                        "title": title or "(Untitled Session)",
                        "active": bool(not_fully_idle == 1),
                        "modified": mod_time,
                        "steps": steps
                    })
        except Exception as e:
            print(f"[!] Error querying conversation_summaries: {e}", file=sys.stderr)
        finally:
            conn.close()

    # Sort projects: Active first, then by latest modified timestamp
    sorted_projects = sorted(
        projects_dict.values(),
        key=lambda p: (1 if p["active"] else 0, p["latest_modified"]),
        reverse=True
    )
    return sorted_projects

def find_active_conversation():
    """Finds the currently running conversation (not_fully_idle = 1) or most recent."""
    conn = get_db_connection()
    if not conn:
        return None
    try:
        cur = conn.cursor()
        # First check explicitly active conversation
        cur.execute("""
            SELECT conversation_id, project_id, title, not_fully_idle, last_modified_time
            FROM conversation_summaries
            WHERE not_fully_idle = 1
            ORDER BY last_modified_time DESC
            LIMIT 1
        """)
        row = cur.fetchone()
        if not row:
            # Fallback to the latest modified
            cur.execute("""
                SELECT conversation_id, project_id, title, not_fully_idle, last_modified_time
                FROM conversation_summaries
                ORDER BY last_modified_time DESC
                LIMIT 1
            """)
            row = cur.fetchone()
        if row:
            return {
                "conversation_id": row[0],
                "project_id": row[1] or "outside-of-project",
                "title": row[2] or "(Untitled Session)",
                "active": bool(row[3] == 1),
                "modified": row[4]
            }
        return None
    except Exception as e:
        print(f"[!] Error finding active conversation: {e}", file=sys.stderr)
        return None
    finally:
        conn.close()


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """Handles requests in separate threads for SSE streaming."""
    daemon_threads = True


class OfficeRequestHandler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Silence routine static asset logs, log only API and SSE
        if "/api/" in self.path:
            super().log_message(format, *args)

    def send_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")

    def do_OPTIONS(self):
        self.send_response(200)
        self.send_cors_headers()
        self.end_headers()

    def do_HEAD(self):
        self.do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/activate":
            # Hook notification from notify_office.py
            content_length = int(self.headers.get("Content-Length", 0))
            body = self.rfile.read(content_length).decode("utf-8") if content_length > 0 else "{}"
            try:
                data = json.loads(body)
                global LATEST_ACTIVATION
                LATEST_ACTIVATION = {
                    "conversation_id": data.get("conversationId"),
                    "workspace": data.get("workspacePaths", [""])[0] if data.get("workspacePaths") else "",
                    "timestamp": time.time()
                }
                print(f"[+] Activation received: {LATEST_ACTIVATION}")
                self.send_response(200)
                self.send_cors_headers()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"status":"ok"}')
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(str(e).encode("utf-8"))
        else:
            self.send_response(404)
            self.end_headers()

    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # 1. API: List all discovered projects
        if path == "/api/projects":
            projects = scan_projects()
            self.send_response(200)
            self.send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(json.dumps(projects).encode("utf-8"))
            return

        # 2. API: Get currently active conversation
        if path == "/api/projects/active":
            active = find_active_conversation()
            self.send_response(200)
            self.send_cors_headers()
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(json.dumps(active or {}).encode("utf-8"))
            return

        # 3. API: Server-Sent Events (SSE) live streaming
        if path == "/api/events":
            conv_id = query.get("conversation_id", [None])[0]
            if not conv_id:
                active_info = find_active_conversation()
                conv_id = active_info.get("conversation_id") if active_info else None

            if not conv_id:
                self.send_response(404)
                self.send_cors_headers()
                self.end_headers()
                self.wfile.write(b'{"error": "No conversation found"}')
                return

            self.handle_sse_stream(conv_id)
            return

        # 4. Static Frontend Assets
        self.serve_static_file(path)

    def handle_sse_stream(self, conv_id):
        """Streams steps and events from transcript.jsonl using Server-Sent Events."""
        transcript_path = DATA_DIR / "brain" / conv_id / ".system_generated" / "logs" / "transcript.jsonl"
        plan_path = DATA_DIR / "brain" / conv_id / ".system_generated" / "swarm" / "plan.json"

        self.send_response(200)
        self.send_cors_headers()
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.send_header("X-Accel-Buffering", "no")
        self.end_headers()

        # Send initial connection event
        init_event = json.dumps({"connected": True, "conversation_id": conv_id})
        self.wfile.write(f"event: init\ndata: {init_event}\n\n".encode("utf-8"))
        self.wfile.flush()

        last_line_idx = 0
        last_heartbeat = time.time()
        last_plan_mtime = 0

        try:
            while True:
                # 1. Read transcript.jsonl
                if transcript_path.exists():
                    try:
                        with open(transcript_path, "r", encoding="utf-8", errors="replace") as f:
                            lines = f.readlines()
                            if len(lines) > last_line_idx:
                                for line in lines[last_line_idx:]:
                                    line_str = line.strip()
                                    if line_str:
                                        self.wfile.write(f"event: step\ndata: {line_str}\n\n".encode("utf-8"))
                                last_line_idx = len(lines)
                                self.wfile.flush()
                    except Exception as e:
                        pass

                # 2. Check swarm plan.json
                if plan_path.exists():
                    try:
                        mtime = plan_path.stat().st_mtime
                        if mtime > last_plan_mtime:
                            plan_data = plan_path.read_text(encoding="utf-8")
                            self.wfile.write(f"event: swarm_plan\ndata: {plan_data}\n\n".encode("utf-8"))
                            self.wfile.flush()
                            last_plan_mtime = mtime
                    except Exception:
                        pass

                # 3. Check for external session activation signal
                global LATEST_ACTIVATION
                if LATEST_ACTIVATION.get("timestamp", 0) > last_heartbeat:
                    act_json = json.dumps(LATEST_ACTIVATION)
                    self.wfile.write(f"event: activate\ndata: {act_json}\n\n".encode("utf-8"))
                    self.wfile.flush()

                # 4. Periodic heartbeat
                now = time.time()
                if now - last_heartbeat > 5.0:
                    self.wfile.write(f"event: heartbeat\ndata: {{\"time\": {now}}}\n\n".encode("utf-8"))
                    self.wfile.flush()
                    last_heartbeat = now

                time.sleep(0.4)
        except (BrokenPipeError, ConnectionResetError):
            pass

    def serve_static_file(self, req_path):
        """Serves HTML, JS, CSS, and SVG files from the public directory."""
        if req_path in ("/", ""):
            req_path = "/index.html"

        # Sanitize path to prevent directory traversal
        clean_path = req_path.lstrip("/").replace("..", "")
        file_path = PUBLIC_DIR / clean_path

        if not file_path.exists() or file_path.is_dir():
            file_path = PUBLIC_DIR / "index.html"

        ext = file_path.suffix.lower()
        mime_types = {
            ".html": "text/html; charset=utf-8",
            ".js": "application/javascript; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".json": "application/json; charset=utf-8",
            ".svg": "image/svg+xml",
            ".png": "image/png",
            ".ico": "image/x-icon"
        }
        content_type = mime_types.get(ext, "application/octet-stream")

        try:
            content = file_path.read_bytes()
            self.send_response(200)
            self.send_cors_headers()
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(content)))
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(str(e).encode("utf-8"))


def run():
    server_address = ("0.0.0.0", PORT)
    httpd = ThreadedHTTPServer(server_address, OfficeRequestHandler)
    print(f"\n=======================================================")
    print(f"🚀 Antigravity Virtual Office Visualizer Live!")
    print(f"🌐 Local Browser URL:    http://localhost:{PORT}")
    print(f"📊 Auto-Follow Active:   http://localhost:{PORT}/?auto=true")
    print(f"=======================================================\n")
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\nShutting down server.")
        httpd.server_close()

if __name__ == "__main__":
    run()
