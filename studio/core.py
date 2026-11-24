"""
studio.core - Production-hardened HTTP & SSE server for Antigravity Autonomous Studio.
Implements loopback isolation, DNS rebinding guards, locked CORS, path traversal shields,
real-time secret redaction, and keep-alive SSE streams.
"""

import os
import sys
import json
import time
import socket
import signal
import argparse
import subprocess
import urllib.parse
import urllib.request
from pathlib import Path
from http.server import HTTPServer, BaseHTTPRequestHandler
from socketserver import ThreadingMixIn

from studio.paths import resolve_antigravity_paths, get_public_dir, get_conversation_artifacts, read_artifact_file
from studio.security import (
    validate_host_header,
    get_allowed_cors_origin,
    sanitize_identifier,
    is_safe_path,
    redact_sensitive_data,
    get_security_headers
)
from studio.telemetry import (
    scan_projects,
    find_all_active_sessions,
    find_active_conversation,
    get_available_subagents,
    calculate_session_analytics
)

# Global runtime state
PORT = int(os.environ.get("PORT", 7777))
HOST = os.environ.get("HOST", "127.0.0.1")
DATA_DIR, CONFIG_DIR = resolve_antigravity_paths()
PUBLIC_DIR = get_public_dir()
LATEST_ACTIVATION = {"conversation_id": None, "workspace": None, "timestamp": 0}

class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    """Handles requests in separate daemon threads with socket reuse."""
    daemon_threads = True
    allow_reuse_address = True

class OfficeRequestHandler(BaseHTTPRequestHandler):
    """Production request handler with security shields and SSE streaming."""

    def log_message(self, format, *args):
        # Silence routine static asset logs in console; log only API & SSE
        if "/api/" in self.path or "/health" in self.path:
            super().log_message(format, *args)

    def send_cors_and_security_headers(self):
        """Applies strict CORS and standard security headers."""
        origin = self.headers.get("Origin")
        allowed_origin = get_allowed_cors_origin(origin)
        if allowed_origin:
            self.send_header("Access-Control-Allow-Origin", allowed_origin)
            self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
            self.send_header("Access-Control-Allow-Headers", "Content-Type, X-Requested-With")
            self.send_header("Vary", "Origin")

        for h_name, h_val in get_security_headers().items():
            self.send_header(h_name, h_val)

    def verify_host(self) -> bool:
        """Enforces DNS rebinding protection by validating Host header."""
        host_header = self.headers.get("Host", "")
        current_port = getattr(self.server, "server_address", (None, PORT))[1]
        allowed_extra = ["antigravity-studio", "antigravity-office-visualizer"] if HOST == "0.0.0.0" else None
        if not validate_host_header(host_header, current_port, allowed_extra=allowed_extra):
            self.send_response(403)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"403 Forbidden: Invalid or untrusted Host header.\n")
            return False
        return True

    def do_OPTIONS(self):
        if not self.verify_host():
            return
        self.send_response(200)
        self.send_cors_and_security_headers()
        self.end_headers()

    def do_HEAD(self):
        if not self.verify_host():
            return
        self.send_response(200)
        self.send_cors_and_security_headers()
        self.end_headers()

    def do_POST(self):
        """Receives session activation events from Antigravity hooks."""
        if not self.verify_host():
            return

        parsed = urllib.parse.urlparse(self.path)
        if parsed.path == "/api/activate":
            content_length = int(self.headers.get("Content-Length", 0))
            post_body = self.rfile.read(content_length)
            try:
                data = json.loads(post_body.decode("utf-8"))
                LATEST_ACTIVATION["conversation_id"] = data.get("conversation_id")
                LATEST_ACTIVATION["workspace"] = data.get("workspace")
                LATEST_ACTIVATION["timestamp"] = time.time()
                self.send_response(200)
                self.send_cors_and_security_headers()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"status": "ok"}')
            except Exception as e:
                self.send_response(400)
                self.end_headers()
                self.wfile.write(str(e).encode("utf-8"))
            return

        self.send_response(404)
        self.end_headers()

    def do_GET(self):
        """Dispatches API endpoints, SSE streams, and static PWA assets."""
        if not self.verify_host():
            return

        parsed = urllib.parse.urlparse(self.path)
        path = parsed.path
        query = urllib.parse.parse_qs(parsed.query)

        # Health & Telemetry Status
        if path == "/health":
            self.send_response(200)
            self.send_cors_and_security_headers()
            self.send_header("Content-Type", "application/json")
            self.end_headers()
            health_info = {
                "status": "ok",
                "version": "1.0.0",
                "data_dir": str(DATA_DIR),
                "config_dir": str(CONFIG_DIR),
                "host": HOST,
                "port": PORT
            }
            self.wfile.write(json.dumps(health_info).encode("utf-8"))
            return

        # API: All Projects
        if path == "/api/projects":
            projects = scan_projects(DATA_DIR, CONFIG_DIR)
            self.send_response(200)
            self.send_cors_and_security_headers()
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(json.dumps(projects).encode("utf-8"))
            return

        # API: Available Plugin & Subagent Personas
        if path == "/api/agents/available":
            agents = get_available_subagents(CONFIG_DIR)
            self.send_response(200)
            self.send_cors_and_security_headers()
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(json.dumps(agents).encode("utf-8"))
            return

        # API: Single Active Project
        if path == "/api/projects/active":
            project_filter = query.get("project", [None])[0]
            exclude_raw = query.get("exclude_conv_id", [None])[0]
            exclude_conv = sanitize_identifier(exclude_raw) if exclude_raw else None
            active = find_active_conversation(DATA_DIR, CONFIG_DIR, project_filter=project_filter, exclude_conv=exclude_conv)
            self.send_response(200)
            self.send_cors_and_security_headers()
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(json.dumps(active or {}).encode("utf-8"))
            return

        # API: All Active Sessions
        if path == "/api/sessions/active":
            exclude_raw = query.get("exclude_conv_id", [None])[0]
            exclude_conv = sanitize_identifier(exclude_raw) if exclude_raw else None
            sessions = find_all_active_sessions(DATA_DIR, CONFIG_DIR, exclude_conv=exclude_conv)
            self.send_response(200)
            self.send_cors_and_security_headers()
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(json.dumps(sessions).encode("utf-8"))
            return

        # API: Conversation Artifacts List
        if path == "/api/artifacts":
            raw_conv_id = query.get("conversation_id", [None])[0]
            conv_id = None
            if raw_conv_id:
                conv_id = sanitize_identifier(raw_conv_id)
                if not conv_id:
                    self.send_response(400)
                    self.send_cors_and_security_headers()
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(b'{"error": "Invalid conversation_id parameter"}')
                    return
            else:
                active_info = find_active_conversation(DATA_DIR, CONFIG_DIR)
                conv_id = active_info.get("conversation_id") if active_info else None

            if not conv_id:
                self.send_response(404)
                self.send_cors_and_security_headers()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"error": "No conversation found"}')
                return

            artifacts = get_conversation_artifacts(DATA_DIR, conv_id)
            self.send_response(200)
            self.send_cors_and_security_headers()
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(json.dumps(artifacts).encode("utf-8"))
            return

        # API: Conversation Artifact Content Stream
        if path == "/api/artifacts/content":
            raw_conv_id = query.get("conversation_id", [None])[0]
            raw_file = query.get("file", [None])[0]
            conv_id = sanitize_identifier(raw_conv_id) if raw_conv_id else None
            filename = sanitize_identifier(raw_file) if raw_file else None

            if not conv_id or not filename:
                self.send_response(400)
                self.send_cors_and_security_headers()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"error": "Missing or invalid conversation_id or file parameter"}')
                return

            content = read_artifact_file(DATA_DIR, conv_id, filename)
            if content is None:
                self.send_response(404)
                self.send_cors_and_security_headers()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"error": "Artifact file not found or access denied"}')
                return

            self.send_response(200)
            self.send_cors_and_security_headers()
            self.send_header("Content-Type", "text/markdown; charset=utf-8")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(content.encode("utf-8", errors="replace"))
            return

        # API: Real-Time Session Telemetry & Analytics
        if path == "/api/analytics":
            raw_conv_id = query.get("conversation_id", [None])[0]
            conv_id = None
            if raw_conv_id:
                conv_id = sanitize_identifier(raw_conv_id)
                if not conv_id:
                    self.send_response(400)
                    self.send_cors_and_security_headers()
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(b'{"error": "Invalid conversation_id parameter"}')
                    return
            else:
                active_info = find_active_conversation(DATA_DIR, CONFIG_DIR)
                conv_id = active_info.get("conversation_id") if active_info else None

            if not conv_id:
                self.send_response(404)
                self.send_cors_and_security_headers()
                self.send_header("Content-Type", "application/json")
                self.end_headers()
                self.wfile.write(b'{"error": "No conversation found"}')
                return

            analytics = calculate_session_analytics(DATA_DIR, conv_id)
            self.send_response(200)
            self.send_cors_and_security_headers()
            self.send_header("Content-Type", "application/json")
            self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(json.dumps(analytics).encode("utf-8"))
            return

        # API: Server-Sent Events (SSE) Live Stream
        if path == "/api/events":
            raw_conv_id = query.get("conversation_id", [None])[0]
            conv_id = None
            if raw_conv_id:
                conv_id = sanitize_identifier(raw_conv_id)
                if not conv_id:
                    self.send_response(400)
                    self.send_cors_and_security_headers()
                    self.send_header("Content-Type", "application/json")
                    self.end_headers()
                    self.wfile.write(b'{"error": "Invalid conversation_id parameter"}')
                    return
            else:
                active_info = find_active_conversation(DATA_DIR, CONFIG_DIR)
                conv_id = active_info.get("conversation_id") if active_info else None

            if not conv_id:
                self.send_response(404)
                self.send_cors_and_security_headers()
                self.end_headers()
                self.wfile.write(b'{"error": "No conversation found"}')
                return

            self.handle_sse_stream(conv_id)
            return

        # Static Assets & PWA Delivery
        self.serve_static_file(path)

    def handle_sse_stream(self, conv_id: str):
        """Streams steps and events from transcript.jsonl with secret scrubbing and keep-alive heartbeats."""
        transcript_path = DATA_DIR / "brain" / conv_id / ".system_generated" / "logs" / "transcript.jsonl"
        plan_path = DATA_DIR / "brain" / conv_id / ".system_generated" / "swarm" / "plan.json"

        # Verify path containment
        if not is_safe_path(transcript_path, [DATA_DIR]):
            self.send_response(403)
            self.end_headers()
            return

        self.send_response(200)
        self.send_cors_and_security_headers()
        self.send_header("Content-Type", "text/event-stream")
        self.send_header("Cache-Control", "no-cache")
        self.send_header("Connection", "keep-alive")
        self.send_header("X-Accel-Buffering", "no")
        self.end_headers()

        init_event = json.dumps({"connected": True, "conversation_id": conv_id})
        self.wfile.write(f"event: init\ndata: {init_event}\n\n".encode("utf-8"))
        self.wfile.flush()

        initial_state = {
            "conversation_id": conv_id,
            "total_steps": 0,
            "focus": None,
            "steps": [],
            "recent_steps": [],
            "artifacts_count": len(get_conversation_artifacts(DATA_DIR, conv_id)),
            "analytics": calculate_session_analytics(DATA_DIR, conv_id)
        }

        last_line_idx = 0
        if transcript_path.exists():
            try:
                with open(transcript_path, "r", encoding="utf-8", errors="replace") as f:
                    all_lines = f.readlines()
                initial_state["total_steps"] = len(all_lines)
                last_line_idx = len(all_lines)

                recent_raw = []
                for line in reversed(all_lines):
                    line_str = line.strip()
                    if not line_str:
                        continue
                    try:
                        step_data = json.loads(line_str)
                        if not initial_state["focus"] and step_data.get("tool_calls"):
                            for tc in step_data["tool_calls"]:
                                if tc.get("name") == "update_focus" and tc.get("args", {}).get("focus"):
                                    initial_state["focus"] = tc["args"]["focus"]
                        if not initial_state["steps"] and step_data.get("tool_calls"):
                            for tc in step_data["tool_calls"]:
                                if tc.get("name") == "update_steps" and tc.get("args", {}).get("steps"):
                                    initial_state["steps"] = tc["args"]["steps"]
                        if len(recent_raw) < 25:
                            recent_raw.append(step_data)
                        if initial_state["focus"] and initial_state["steps"] and len(recent_raw) >= 25:
                            break
                    except Exception:
                        pass
                initial_state["recent_steps"] = list(reversed(recent_raw))
            except Exception as e:
                print(f"[!] Fast hydration read error: {e}", file=sys.stderr)

        if not initial_state["steps"] and plan_path.exists():
            try:
                plan_data = json.loads(plan_path.read_text(encoding="utf-8", errors="replace"))
                if "steps" in plan_data:
                    initial_state["steps"] = plan_data["steps"]
            except Exception:
                pass

        # Send redacted initial state event
        hydrated_json = redact_sensitive_data(json.dumps(initial_state))
        self.wfile.write(f"event: initial_state\ndata: {hydrated_json}\n\n".encode("utf-8"))
        self.wfile.flush()

        last_plan_mtime = plan_path.stat().st_mtime if plan_path.exists() else 0
        last_heartbeat = time.time()
        last_activation_seen = LATEST_ACTIVATION["timestamp"]

        try:
            while True:
                time.sleep(0.25)
                now = time.time()

                # Keep-alive heartbeat comment every 15 seconds
                if now - last_heartbeat >= 15.0:
                    self.wfile.write(b": ping\n\n")
                    self.wfile.flush()
                    last_heartbeat = now

                # Broadcast hook activations
                if LATEST_ACTIVATION["timestamp"] > last_activation_seen:
                    last_activation_seen = LATEST_ACTIVATION["timestamp"]
                    act_data = json.dumps(LATEST_ACTIVATION)
                    self.wfile.write(f"event: activate\ndata: {act_data}\n\n".encode("utf-8"))
                    self.wfile.flush()

                # Stream new transcript lines
                if transcript_path.exists():
                    try:
                        with open(transcript_path, "r", encoding="utf-8", errors="replace") as f:
                            lines = f.readlines()
                        if len(lines) > last_line_idx:
                            new_lines = lines[last_line_idx:]
                            last_line_idx = len(lines)
                            for line in new_lines:
                                line_clean = line.strip()
                                if line_clean:
                                    scrubbed_line = redact_sensitive_data(line_clean)
                                    self.wfile.write(f"event: step\ndata: {scrubbed_line}\n\n".encode("utf-8"))
                            self.wfile.flush()
                    except Exception:
                        pass

                # Stream plan updates
                if plan_path.exists():
                    try:
                        pmtime = plan_path.stat().st_mtime
                        if pmtime > last_plan_mtime:
                            last_plan_mtime = pmtime
                            plan_content = plan_path.read_text(encoding="utf-8", errors="replace")
                            scrubbed_plan = redact_sensitive_data(plan_content)
                            self.wfile.write(f"event: plan\ndata: {scrubbed_plan}\n\n".encode("utf-8"))
                            self.wfile.flush()
                    except Exception:
                        pass

        except (BrokenPipeError, ConnectionResetError):
            pass

    def serve_static_file(self, req_path: str):
        """Safely serves frontend and PWA static assets with correct MIME types."""
        clean_path = req_path.lstrip("/")
        if not clean_path or clean_path == "/":
            clean_path = "index.html"

        file_path = (PUBLIC_DIR / clean_path).resolve()

        if not is_safe_path(file_path, [PUBLIC_DIR]) or not file_path.is_file():
            self.send_response(404)
            self.send_header("Content-Type", "text/plain; charset=utf-8")
            self.end_headers()
            self.wfile.write(b"404 Not Found")
            return

        ext = file_path.suffix.lower()
        mime_types = {
            ".html": "text/html; charset=utf-8",
            ".js": "application/javascript; charset=utf-8",
            ".css": "text/css; charset=utf-8",
            ".json": "application/json; charset=utf-8",
            ".svg": "image/svg+xml",
            ".png": "image/png",
            ".ico": "image/x-icon",
            ".webmanifest": "application/manifest+json"
        }
        content_type = mime_types.get(ext, "application/octet-stream")

        try:
            content = file_path.read_bytes()
            self.send_response(200)
            self.send_cors_and_security_headers()
            self.send_header("Content-Type", content_type)
            self.send_header("Content-Length", str(len(content)))
            # Development and active studio visualizer: ensure live UI scripts always refresh
            if ext in [".js", ".css", ".html"]:
                self.send_header("Cache-Control", "no-cache, must-revalidate")
            elif ext in [".png", ".svg", ".ico"]:
                self.send_header("Cache-Control", "public, max-age=600")
            else:
                self.send_header("Cache-Control", "no-cache")
            self.end_headers()
            self.wfile.write(content)
        except Exception as e:
            self.send_response(500)
            self.end_headers()
            self.wfile.write(str(e).encode("utf-8"))

def get_pid_file_path() -> Path:
    """Returns path to the runtime PID tracking file."""
    repo_root = Path(__file__).resolve().parent.parent
    try:
        test_file = repo_root / ".pid_test"
        test_file.touch()
        test_file.unlink()
        return repo_root / ".studio.pid"
    except Exception:
        fallback = Path.home() / ".gemini" / "antigravity"
        fallback.mkdir(parents=True, exist_ok=True)
        return fallback / ".studio.pid"

def is_server_healthy(host: str, port: int) -> dict | None:
    """Probes the /health endpoint to check server availability."""
    url = f"http://{host}:{port}/health"
    try:
        req = urllib.request.Request(url, headers={"Host": f"{host}:{port}"})
        with urllib.request.urlopen(req, timeout=1.2) as response:
            if response.status == 200:
                return json.loads(response.read().decode("utf-8"))
    except Exception:
        pass
    return None

def get_running_pid() -> tuple[int | None, dict | None]:
    """Returns active PID and metadata if process is alive, cleaning up stale PID files."""
    pid_file = get_pid_file_path()
    if not pid_file.exists():
        return None, None
    try:
        data = json.loads(pid_file.read_text(encoding="utf-8"))
        pid = data.get("pid")
        if pid:
            try:
                os.kill(pid, 0)
                return pid, data
            except (OSError, ProcessLookupError):
                try:
                    pid_file.unlink()
                except Exception:
                    pass
    except Exception:
        pass
    return None, None

def stop_daemon(host: str = "127.0.0.1", port: int = 7777) -> int:
    """Gracefully stops any active Antigravity Studio instance."""
    pid, data = get_running_pid()
    pid_file = get_pid_file_path()

    if not pid:
        healthy = is_server_healthy(host, port)
        if healthy:
            print(f"[i] Antigravity Studio is active on port {port}, but no local PID file was found (may be running in Docker or another shell).")
            return 0
        print("[i] Antigravity Studio is not currently running.")
        return 0

    print(f"[*] Stopping Antigravity Studio (PID {pid})...")
    try:
        os.kill(pid, signal.SIGTERM)
    except Exception:
        pass

    for _ in range(30):
        time.sleep(0.1)
        try:
            os.kill(pid, 0)
        except (OSError, ProcessLookupError):
            break
    else:
        try:
            if sys.platform == "win32":
                subprocess.run(["taskkill", "/F", "/PID", str(pid)], capture_output=True)
            else:
                os.kill(pid, signal.SIGKILL)
        except Exception:
            pass

    if pid_file.exists():
        try:
            pid_file.unlink()
        except Exception:
            pass

    print("[✓] Antigravity Studio stopped successfully.")
    return 0

def start_daemon(host: str, port: int, open_browser: bool, data_dir: str = None, config_dir: str = None) -> int:
    """Spawns Antigravity Studio as a detached background daemon."""
    healthy = is_server_healthy(host, port)
    if healthy:
        print(f"[✓] Antigravity Studio is already active at http://{host}:{port}/?auto=true")
        if open_browser:
            import webbrowser
            try:
                webbrowser.open(f"http://{host}:{port}/?auto=true")
            except Exception:
                pass
        return 0

    server_script = Path(__file__).resolve().parent.parent / "server.py"
    cmd = [sys.executable, str(server_script), "--host", host, "--port", str(port)]
    if data_dir:
        cmd.extend(["--data-dir", str(data_dir)])
    if config_dir:
        cmd.extend(["--config-dir", str(config_dir)])

    if sys.platform == "win32":
        DETACHED_PROCESS = 0x00000008
        CREATE_NEW_PROCESS_GROUP = 0x00000200
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            creationflags=DETACHED_PROCESS | CREATE_NEW_PROCESS_GROUP,
            close_fds=True
        )
    else:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
            start_new_session=True,
            close_fds=True
        )

    pid_file = get_pid_file_path()
    pid_data = {
        "pid": proc.pid,
        "host": host,
        "port": port,
        "started_at": time.strftime("%Y-%m-%d %H:%M:%S")
    }
    try:
        pid_file.write_text(json.dumps(pid_data, indent=2), encoding="utf-8")
    except Exception:
        pass

    for _ in range(30):
        time.sleep(0.1)
        if is_server_healthy(host, port):
            print(f"[✓] Antigravity Studio started in background (PID {proc.pid})")
            print(f"    Visualizer URL: http://{host}:{port}/?auto=true")
            if open_browser:
                import webbrowser
                try:
                    webbrowser.open(f"http://{host}:{port}/?auto=true")
                except Exception:
                    pass
            return 0

    print("[!] Server spawned but did not respond to health check in time.")
    return 1

def get_status(host: str, port: int) -> int:
    """Reports current daemon running status."""
    pid, data = get_running_pid()
    healthy = is_server_healthy(host, port)

    if healthy:
        active_pid = pid or healthy.get("pid", "Active Server")
        print("=======================================================")
        print("Antigravity Autonomous Studio: ACTIVE")
        print(f"Status:       Running (PID: {active_pid})")
        print(f"Host:         {healthy.get('host', host)}")
        print(f"Port:         {healthy.get('port', port)}")
        print(f"Data Dir:     {healthy.get('data_dir', 'N/A')}")
        print(f"Config Dir:   {healthy.get('config_dir', 'N/A')}")
        print(f"Dashboard:    http://{host}:{port}/?auto=true")
        print("=======================================================")
        return 0
    else:
        print("=======================================================")
        print("Antigravity Autonomous Studio: STOPPED")
        print(f"Host:         {host}")
        print(f"Port:         {port} (Closed)")
        print("Launch with:  python server.py --daemon")
        print("=======================================================")
        return 1

def find_available_port(host: str, start_port: int, max_attempts: int = 10) -> int:
    """Finds an open port starting from start_port up to start_port + max_attempts."""
    for p in range(start_port, start_port + max_attempts):
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            try:
                s.bind((host, p))
                return p
            except OSError:
                continue
    return start_port

def run():
    """Main CLI runtime for Antigravity Autonomous Studio."""
    global PORT, HOST, DATA_DIR, CONFIG_DIR

    parser = argparse.ArgumentParser(description="Antigravity Autonomous Studio")
    parser.add_argument("command", nargs="?", choices=["start", "stop", "status", "restart"], default=None, help="Action command")
    parser.add_argument("--daemon", "--start", dest="daemon_flag", action="store_true", help="Run server as a detached background daemon")
    parser.add_argument("--stop", dest="stop_flag", action="store_true", help="Stop running background daemon")
    parser.add_argument("--status", dest="status_flag", action="store_true", help="Check status of background daemon")
    parser.add_argument("--restart", dest="restart_flag", action="store_true", help="Restart background daemon")
    parser.add_argument("--port", "-p", type=int, default=int(os.environ.get("PORT", 7777)), help="Port to listen on (default: 7777)")
    parser.add_argument("--host", default=os.environ.get("HOST", "127.0.0.1"), help="Host address to bind (default: 127.0.0.1)")
    parser.add_argument("--data-dir", default=None, help="Explicit Antigravity data directory")
    parser.add_argument("--config-dir", default=None, help="Explicit Antigravity config directory")
    parser.add_argument("--open-browser", action="store_true", help="Automatically launch default browser")
    args, _ = parser.parse_known_args()

    host = args.host
    port = args.port

    # Handle lifecycle actions
    action = args.command
    if args.stop_flag or action == "stop":
        sys.exit(stop_daemon(host, port))
    if args.status_flag or action == "status":
        sys.exit(get_status(host, port))
    if args.restart_flag or action == "restart":
        stop_daemon(host, port)
        time.sleep(0.3)
        sys.exit(start_daemon(host, port, args.open_browser, args.data_dir, args.config_dir))
    if args.daemon_flag or action == "start":
        sys.exit(start_daemon(host, port, args.open_browser, args.data_dir, args.config_dir))

    # Foreground Execution
    HOST = host
    PORT = find_available_port(HOST, port)

    if args.data_dir:
        DATA_DIR, CONFIG_DIR = resolve_antigravity_paths(args.data_dir, args.config_dir)

    server_address = (HOST, PORT)
    httpd = ThreadedHTTPServer(server_address, OfficeRequestHandler)

    # Record PID in foreground as well
    pid_file = get_pid_file_path()
    try:
        pid_file.write_text(json.dumps({
            "pid": os.getpid(),
            "host": HOST,
            "port": PORT,
            "started_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }, indent=2), encoding="utf-8")
    except Exception:
        pass

    def shutdown_handler(signum, frame):
        print("\n[!] Gracefully shutting down Antigravity Studio...")
        if pid_file.exists():
            try:
                pid_file.unlink()
            except Exception:
                pass
        httpd.server_close()
        sys.exit(0)

    signal.signal(signal.SIGINT, shutdown_handler)
    signal.signal(signal.SIGTERM, shutdown_handler)

    print("\n=======================================================")
    print("Antigravity Autonomous Studio (Hardened Production)")
    print(f"Host:                    {HOST} (Loopback Isolated)")
    print(f"Data Dir:                {DATA_DIR}")
    print(f"Config Dir:              {CONFIG_DIR}")
    print(f"Local Web URL:           http://{HOST}:{PORT}")
    print(f"Desktop PWA:             http://{HOST}:{PORT}/?auto=true")
    print("=======================================================\n")

    if args.open_browser:
        import webbrowser
        try:
            webbrowser.open(f"http://127.0.0.1:{PORT}/?auto=true")
        except Exception:
            pass

    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        shutdown_handler(None, None)

if __name__ == "__main__":
    run()
