"""
studio.telemetry - SQLite query engine, manifest cache, and transcript analyzer.
Reads Antigravity state using immutable read-only connections and provides fast
session detection across workspaces.
"""

import sys
import re
import json
import time
import sqlite3
import urllib.parse
from pathlib import Path

_PROJECT_MANIFESTS_CACHE = {"data": {}, "last_scanned": 0}

AGENT_STYLE_PRESETS = {
    "lead-architect": {"name": "Lead Architect", "role": "Planner & Coordinator", "color": "#4f46e5", "hair": "#b45309", "shirt": "#e0e7ff", "station": "📋 Strategy Easel"},
    "core-developer": {"name": "Core Developer", "role": "Full-Stack Engineer", "color": "#059669", "hair": "#334155", "shirt": "#d1fae5", "station": "📍 Desk 1"},
    "research-analyst": {"name": "Research Analyst", "role": "Researcher", "color": "#7c3aed", "hair": "#d97706", "shirt": "#ede9fe", "station": "📚 Knowledge Archive"},
    "devops-qa": {"name": "DevOps & QA", "role": "DevOps & QA", "color": "#d97706", "hair": "#475569", "shirt": "#fef3c7", "station": "🖥️ CI/CD Server Bay"},
    "git-postmaster": {"name": "Git Postmaster", "role": "Git Postmaster", "color": "#0891b2", "hair": "#1e293b", "shirt": "#cffafe", "station": "📮 Git Post Office"},
    "code-reviewer": {"name": "Code Reviewer", "role": "Senior Code Reviewer", "color": "#6366f1", "hair": "#1e293b", "shirt": "#e0e7ff", "station": "🔍 Review Desk"},
    "security-auditor": {"name": "Security Auditor", "role": "Security Engineer", "color": "#ef4444", "hair": "#0f172a", "shirt": "#fee2e2", "station": "🛡️ Security Vault"},
    "test-engineer": {"name": "Test Engineer", "role": "QA & Test Engineer", "color": "#f59e0b", "hair": "#475569", "shirt": "#fef3c7", "station": "🖥️ CI/CD Server Bay"},
    "web-performance-auditor": {"name": "Web Perf Auditor", "role": "Performance Engineer", "color": "#14b8a6", "hair": "#334155", "shirt": "#ccfbf1", "station": "⚡ Performance Lab"},
    "ai-architect": {"name": "AI Architect", "role": "AI Systems Architect", "color": "#8b5cf6", "hair": "#1e1b4b", "shirt": "#ede9fe", "station": "🧠 AI Architecture Pod"},
    "deployment-expert": {"name": "Deployment Expert", "role": "CI/CD & Release Engineer", "color": "#06b6d4", "hair": "#164e63", "shirt": "#cffafe", "station": "📮 Git Post Office"},
    "performance-optimizer": {"name": "Perf Optimizer", "role": "Core Web Vitals Specialist", "color": "#10b981", "hair": "#064e3b", "shirt": "#d1fae5", "station": "⚡ Performance Lab"},
    "browser": {"name": "Browser Agent", "role": "Web Automation Specialist", "color": "#3b82f6", "hair": "#1e3a8a", "shirt": "#dbeafe", "station": "🌐 Web Terminal"},
    "image-generator": {"name": "Creative Designer", "role": "Visual & Asset Designer", "color": "#ec4899", "hair": "#831843", "shirt": "#fce7f3", "station": "🎨 Creative Studio"}
}

def get_available_subagents(config_dir: Path) -> list:
    """Discovers all available agent personas from plugins, user configs, and presets."""
    agents_map = {}

    # 1. Baseline core specialists
    baseline_keys = ["lead-architect", "core-developer", "research-analyst", "devops-qa", "git-postmaster"]
    for k in baseline_keys:
        preset = AGENT_STYLE_PRESETS[k]
        agents_map[k] = {
            "id": k,
            "name": preset["name"],
            "role": preset["role"],
            "description": f"Standard {preset['role']} specialist",
            "source": "builtin",
            "color": preset["color"],
            "hair": preset["hair"],
            "shirt": preset["shirt"],
            "station": preset["station"]
        }

    # 2. Scan plugin and user agent markdown files
    config_p = Path(config_dir)
    agent_paths = []
    if config_p.exists():
        agent_paths.extend(config_p.glob("plugins/*/agents/*.md"))
        agent_paths.extend(config_p.glob("agents/*.md"))

    for af in agent_paths:
        try:
            content = af.read_text(encoding="utf-8")
            raw_id = af.stem.lower()

            name_m = re.search(r"^name:\s*(.+)$", content, re.MULTILINE)
            desc_m = re.search(r"^description:\s*(.+)$", content, re.MULTILINE)

            agent_id = name_m.group(1).strip().lower() if name_m else raw_id
            description = desc_m.group(1).strip() if desc_m else ""
            source = af.parent.parent.name if "plugins" in str(af) else "user"

            preset = AGENT_STYLE_PRESETS.get(agent_id) or AGENT_STYLE_PRESETS.get(raw_id)
            if not preset:
                colors = ["#6366f1", "#ec4899", "#8b5cf6", "#14b8a6", "#f59e0b", "#3b82f6", "#10b981", "#ef4444"]
                c_idx = abs(hash(agent_id)) % len(colors)
                preset = {
                    "name": agent_id.replace("-", " ").title(),
                    "role": agent_id.replace("-", " ").title(),
                    "color": colors[c_idx],
                    "hair": "#334155",
                    "shirt": "#f1f5f9",
                    "station": "📍 Studio Workstation"
                }

            agents_map[agent_id] = {
                "id": agent_id,
                "name": preset["name"],
                "role": preset["role"],
                "description": description or preset.get("description", ""),
                "source": source,
                "color": preset["color"],
                "hair": preset["hair"],
                "shirt": preset["shirt"],
                "station": preset["station"]
            }
        except Exception:
            pass

    return list(agents_map.values())

def get_project_manifests(config_dir: Path, ttl=10.0) -> dict:
    """Returns cached project manifests from config_dir/projects/*.json with a TTL."""
    now = time.time()
    if (now - _PROJECT_MANIFESTS_CACHE["last_scanned"] < ttl) and _PROJECT_MANIFESTS_CACHE["data"]:
        return _PROJECT_MANIFESTS_CACHE["data"]

    manifests = {}
    projects_dir = Path(config_dir) / "projects"
    if projects_dir.exists():
        for p_file in projects_dir.glob("*.json"):
            try:
                data = json.loads(p_file.read_text(encoding="utf-8"))
                p_id = data.get("id") or p_file.stem
                p_name = data.get("name") or p_id

                paths = []
                resources = data.get("projectResources", {}).get("resources", [])
                for r in resources:
                    folder_uri = r.get("gitFolder", {}).get("folderUri", "")
                    if folder_uri:
                        decoded = urllib.parse.unquote(folder_uri).replace("file:///", "")
                        folder_name = decoded.rstrip("/").split("/")[-1]
                        paths.append({"name": folder_name, "path": decoded})

                manifests[p_id] = {
                    "id": p_id,
                    "name": p_name,
                    "folders": paths,
                    "display_name": p_name if p_name != p_id else (paths[0]["name"] if paths else p_id),
                }
            except Exception:
                pass

    _PROJECT_MANIFESTS_CACHE["data"] = manifests
    _PROJECT_MANIFESTS_CACHE["last_scanned"] = now
    return manifests

def get_db_connection(data_dir: Path):
    """Returns read-only, immutable SQLite connection to conversation_summaries.db."""
    db_path = Path(data_dir) / "conversation_summaries.db"
    if not db_path.exists():
        return None
    try:
        uri = f"file:{db_path.as_posix()}?mode=ro&immutable=1"
        return sqlite3.connect(uri, uri=True, timeout=2.0)
    except Exception as e:
        print(f"[!] SQLite connection error: {e}", file=sys.stderr)
        return None

def scan_projects(data_dir: Path, config_dir: Path) -> list:
    """Scans and groups all projects using in-memory manifest cache and database."""
    manifests = get_project_manifests(config_dir)
    projects_dict = {}

    for p_id, m in manifests.items():
        projects_dict[p_id] = {
            "id": p_id,
            "name": m["name"],
            "folders": m["folders"],
            "display_name": m["display_name"],
            "active": False,
            "total_conversations": 0,
            "latest_conversation_id": None,
            "latest_modified": "",
            "conversations": []
        }

    conn = get_db_connection(data_dir)
    if conn:
        try:
            mapping_file = Path(config_dir) / "conversation_project_map.json"
            conv_map = {}
            if mapping_file.exists():
                try:
                    conv_map = json.loads(mapping_file.read_text(encoding="utf-8"))
                except Exception:
                    pass

            cur = conn.cursor()
            cur.execute("""
                SELECT conversation_id, title, project_id, workspace_uris, not_fully_idle, last_modified_time, step_count
                FROM conversation_summaries
                ORDER BY last_modified_time DESC
            """)
            rows = cur.fetchall()

            for conv_id, title, p_id, w_uris, not_fully_idle, mod_time, steps in rows:
                p_key = conv_map.get(conv_id) or p_id or "outside-of-project"

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

    return sorted(
        projects_dict.values(),
        key=lambda p: (1 if p["active"] else 0, p["latest_modified"]),
        reverse=True
    )

def find_all_active_sessions(data_dir: Path, config_dir: Path, exclude_conv=None) -> list:
    """Returns list of active or recently active sessions across all workspaces."""
    conn = get_db_connection(data_dir)
    if not conn:
        return []
    try:
        manifests = get_project_manifests(config_dir)
        proj_names = {pid: m["display_name"] for pid, m in manifests.items()}

        mapping_file = Path(config_dir) / "conversation_project_map.json"
        conv_map = {}
        if mapping_file.exists():
            try:
                conv_map = json.loads(mapping_file.read_text(encoding="utf-8"))
            except Exception:
                pass

        cur = conn.cursor()
        cur.execute("""
            SELECT conversation_id, project_id, title, not_fully_idle, last_modified_time, step_count
            FROM conversation_summaries
            ORDER BY last_modified_time DESC
            LIMIT 50
        """)
        rows = cur.fetchall()

        active_sessions = []
        recent_sessions = []

        for row in rows:
            cid = row[0]
            raw_pid = row[1] or "outside-of-project"
            title = row[2] or "(Untitled Session)"
            is_active = bool(row[3] == 1)
            mtime = row[4]
            steps = row[5] or 0
            resolved_pid = conv_map.get(cid) or raw_pid

            if exclude_conv and cid == exclude_conv:
                continue

            p_display = proj_names.get(resolved_pid, resolved_pid)

            session_item = {
                "conversation_id": cid,
                "project_id": resolved_pid,
                "project_name": p_display,
                "title": title,
                "active": is_active,
                "modified": mtime,
                "steps": steps
            }

            if is_active:
                active_sessions.append(session_item)
            elif len(recent_sessions) < 6:
                recent_sessions.append(session_item)

        return active_sessions if active_sessions else recent_sessions[:4]
    except Exception as e:
        print(f"[!] Error finding active sessions: {e}", file=sys.stderr)
        return []
    finally:
        conn.close()

def find_active_conversation(data_dir: Path, config_dir: Path, project_filter=None, exclude_conv=None):
    """Finds the currently running conversation or most recent session matching filter."""
    sessions = find_all_active_sessions(data_dir, config_dir, exclude_conv=exclude_conv)
    if project_filter:
        for s in sessions:
            if s["project_id"] == project_filter or s["project_name"].lower() == project_filter.lower():
                return s

        conn = get_db_connection(data_dir)
        if conn:
            try:
                cur = conn.cursor()
                cur.execute("""
                    SELECT conversation_id, project_id, title, not_fully_idle, last_modified_time
                    FROM conversation_summaries
                    WHERE project_id = ?
                    ORDER BY last_modified_time DESC
                    LIMIT 1
                """, (project_filter,))
                row = cur.fetchone()
                if row:
                    manifests = get_project_manifests(config_dir)
                    p_disp = manifests.get(row[1], {}).get("display_name", row[1])
                    return {
                        "conversation_id": row[0],
                        "project_id": row[1],
                        "project_name": p_disp,
                        "title": row[2] or "(Untitled Session)",
                        "active": bool(row[3] == 1),
                        "modified": row[4]
                    }
            except Exception:
                pass
            finally:
                conn.close()

    return sessions[0] if sessions else None
