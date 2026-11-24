"""
studio.paths - Cross-platform path auto-discovery engine.
Dynamically resolves Antigravity data & config paths across Docker, native Windows,
macOS, Linux, and WSL2 environments with zero hardcoded usernames.
"""

import os
import glob
import time
import subprocess
from pathlib import Path

def get_conversation_artifacts(data_dir: Path, conv_id: str) -> list:
    """
    Scans data_dir/brain/<conv_id>/ for markdown and json artifacts.
    Returns list of metadata dicts sorted by modification time descending.
    """
    brain_dir = Path(data_dir) / "brain" / conv_id
    if not brain_dir.is_dir():
        return []

    artifacts = []
    try:
        for f in brain_dir.iterdir():
            if f.is_file() and (f.suffix.lower() in [".md", ".json"]) and not f.name.startswith(".") and not f.name.endswith(".metadata.json"):
                try:
                    stat = f.stat()
                    is_plan = "plan" in f.name.lower()
                    is_walkthrough = "walkthrough" in f.name.lower()
                    kind = "plan" if is_plan else ("walkthrough" if is_walkthrough else "doc")

                    title = f.stem.replace("_", " ").replace("-", " ").title()
                    artifacts.append({
                        "name": f.name,
                        "title": title,
                        "kind": kind,
                        "size_bytes": stat.st_size,
                        "modified_at": stat.st_mtime,
                        "modified_iso": time.strftime("%Y-%m-%d %H:%M:%S", time.localtime(stat.st_mtime))
                    })
                except Exception:
                    pass
    except Exception as e:
        import sys
        print(f"[!] Error reading artifacts: {e}", file=sys.stderr)

    artifacts.sort(key=lambda x: x["modified_at"], reverse=True)
    return artifacts

def read_artifact_file(data_dir: Path, conv_id: str, filename: str) -> str | None:
    """
    Reads the contents of an artifact file within data_dir/brain/<conv_id>/
    after verifying security boundaries.
    """
    brain_dir = Path(data_dir) / "brain" / conv_id
    if not brain_dir.is_dir():
        return None

    target = brain_dir / filename
    try:
        resolved = target.resolve()
        resolved_brain = brain_dir.resolve()
        # Verify boundary containment
        try:
            if not resolved.is_relative_to(resolved_brain):
                return None
        except AttributeError:
            brain_str = str(resolved_brain).rstrip(os.sep) + os.sep
            if str(resolved) != str(resolved_brain) and not str(resolved).startswith(brain_str):
                return None

        if not resolved.is_file():
            return None
        return resolved.read_text(encoding="utf-8", errors="replace")
    except Exception:
        return None

def resolve_antigravity_paths(custom_data=None, custom_config=None):
    """
    Detects Antigravity data & config paths across CLI arguments, Docker container
    mounts, native user homes (Windows, macOS, Linux), and WSL2 mounted drives.
    Uses candidate freshness (latest conversation mtime) to select active workspace.
    """
    # 0. Check explicit custom arguments
    if custom_data and os.path.exists(custom_data):
        cfg = Path(custom_config) if (custom_config and os.path.exists(custom_config)) else Path(custom_data).parent / "config"
        return Path(custom_data), cfg

    # 1. Check explicit environment overrides
    env_data = os.environ.get("ANTIGRAVITY_DATA_DIR")
    env_config = os.environ.get("ANTIGRAVITY_CONFIG_DIR")
    if env_data and os.path.exists(env_data):
        cfg = Path(env_config) if (env_config and os.path.exists(env_config)) else Path(env_data).parent / "config"
        return Path(env_data), cfg

    # 2. Check Docker container mounts
    if os.path.exists("/data/antigravity"):
        return Path("/data/antigravity"), Path("/data/config")

    # 3. Collect viable candidates across platforms
    candidates = []

    # 3a. Native user home (Windows, macOS, or native Linux)
    home = Path.home()
    native_data = home / ".gemini" / "antigravity"
    native_config = home / ".gemini" / "config"
    if native_data.exists():
        candidates.append((native_data, native_config))

    # 3b. WSL environment: query Windows USERPROFILE via cmd.exe
    try:
        res = subprocess.run(["cmd.exe", "/c", "echo %USERPROFILE%"], capture_output=True, text=True, timeout=2)
        if res.returncode == 0 and res.stdout.strip():
            win_profile = res.stdout.strip().replace("\r", "")
            res_wsl = subprocess.run(["wslpath", win_profile], capture_output=True, text=True, timeout=2)
            if res_wsl.returncode == 0 and res_wsl.stdout.strip():
                wsl_home = Path(res_wsl.stdout.strip())
                wsl_data = wsl_home / ".gemini" / "antigravity"
                wsl_config = wsl_home / ".gemini" / "config"
                if wsl_data.exists():
                    candidates.append((wsl_data, wsl_config))
    except Exception:
        pass

    # 3c. WSL environment: scan all mounted Windows drives (/mnt/?/Users/*/.gemini/antigravity)
    for cand_str in glob.glob("/mnt/?/Users/*/.gemini/antigravity"):
        cand_p = Path(cand_str)
        if cand_p.is_dir():
            candidates.append((cand_p, cand_p.parent / "config"))

    # 4. If candidates found, select the one with the freshest conversation activity
    if candidates:
        def get_freshness(pair):
            data_p = pair[0]
            db = data_p / "conversation_summaries.db"
            if db.exists():
                try:
                    return db.stat().st_mtime
                except Exception:
                    pass
            brain = data_p / "brain"
            if brain.exists():
                try:
                    return brain.stat().st_mtime
                except Exception:
                    pass
            return 0

        unique_candidates = []
        seen = set()
        for c in candidates:
            resolved_str = str(c[0].resolve())
            if resolved_str not in seen:
                seen.add(resolved_str)
                unique_candidates.append(c)

        unique_candidates.sort(key=get_freshness, reverse=True)
        return unique_candidates[0]

    # 5. Fallback to native path even if not yet created
    return native_data, native_config

def get_public_dir():
    """Returns the absolute path to the public static web UI directory."""
    return Path(__file__).resolve().parent.parent / "public"
