"""
studio.telemetry - SQLite query engine, manifest cache, and transcript analyzer.
Reads Antigravity state using immutable read-only connections and provides fast
session detection across workspaces.
"""

import sys
import json
import time
import sqlite3
import urllib.parse
from pathlib import Path

_PROJECT_MANIFESTS_CACHE = {"data": {}, "last_scanned": 0}

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
