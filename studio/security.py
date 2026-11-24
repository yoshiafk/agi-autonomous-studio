"""
studio.security - Defense-in-depth security hardening for Antigravity Autonomous Studio.
Protects local developer data against DNS rebinding, cross-origin data theft,
directory traversal, and credential leakage over SSE telemetry streams.
"""

import re
import urllib.parse
from pathlib import Path

# Sensitive credential patterns for real-time redaction
SECRET_PATTERNS = [
    (re.compile(r'AIza[0-9A-Za-z\-_]{30,45}'), '[REDACTED_GEMINI_KEY]'),
    (re.compile(r'sk-ant-[a-zA-Z0-9\-_]{32,}'), '[REDACTED_ANTHROPIC_KEY]'),
    (re.compile(r'sk-(?:proj-|svcacct-)?[a-zA-Z0-9\-_]{32,}'), '[REDACTED_API_KEY]'),
    (re.compile(r'(?:ghp|gho|ghu|ghs|ghr)_[a-zA-Z0-9]{36,}'), '[REDACTED_GITHUB_TOKEN]'),
    (re.compile(r'github_pat_[a-zA-Z0-9_]{30,}'), '[REDACTED_GITHUB_PAT]'),
    (re.compile(r'Bearer\s+[A-Za-z0-9\-_=]+\.[A-Za-z0-9\-_=]+\.?[A-Za-z0-9\-_.+/=]*'), 'Bearer [REDACTED_JWT]'),
    (re.compile(r'(["\']?(?:password|secret|token|apiKey|api_key|authToken|auth_token)["\']?\s*[:=]\s*["\']?)([^"\'\s,;]{4,})(["\']?)', re.IGNORECASE), r'\1[REDACTED]\3'),
]

IDENTIFIER_REGEX = re.compile(r'^[a-zA-Z0-9_\-\.]{1,128}$')
DOS_RESERVED = {"CON", "PRN", "AUX", "NUL"} | {f"COM{i}" for i in range(1, 10)} | {f"LPT{i}" for i in range(1, 10)}

def validate_host_header(host_header: str, port: int, allowed_extra: list = None) -> bool:
    """
    Validates incoming HTTP Host header against allowed loopback hosts to prevent DNS rebinding.
    """
    if not host_header:
        return False

    host_clean = host_header.strip().lower()

    # Allowed loopback host strings
    allowed_bases = {"localhost", "127.0.0.1", "[::1]", "0.0.0.0"}
    if allowed_extra:
        for ext in allowed_extra:
            allowed_bases.add(ext.lower())

    # Split into host part and optional port part
    if ":" in host_clean and not host_clean.startswith("["):
        parts = host_clean.split(":")
        h_part, p_part = parts[0], parts[1]
    elif "]:" in host_clean:
        parts = host_clean.split("]:")
        h_part, p_part = parts[0] + "]", parts[1]
    else:
        h_part, p_part = host_clean, None

    if h_part not in allowed_bases:
        return False

    if p_part and port and p_part != str(port):
        return False

    return True

def get_allowed_cors_origin(origin_header: str) -> str | None:
    """
    Returns the specific allowed CORS origin if origin matches loopback.
    Never returns wildcard '*' or 'null' for local state-accessing APIs.
    """
    if not origin_header:
        return None

    origin_clean = origin_header.strip().lower()

    # Allow local loopback origins across any port
    loopback_prefixes = (
        "http://localhost",
        "http://127.0.0.1",
        "http://[::1]",
        "https://localhost",
        "https://127.0.0.1"
    )

    for prefix in loopback_prefixes:
        if origin_clean == prefix or origin_clean.startswith(prefix + ":"):
            return origin_header.strip()

    return None

def sanitize_identifier(identifier: str) -> str | None:
    """
    Sanitizes conversation IDs, project names, and parameters.
    Blocks directory traversal ('..', '/', '\\'), Windows DOS device names, and control characters.
    """
    if not identifier or not isinstance(identifier, str):
        return None

    cleaned = identifier.strip()
    if cleaned == "." or ".." in cleaned or "/" in cleaned or "\\" in cleaned:
        return None

    if not IDENTIFIER_REGEX.match(cleaned):
        return None

    base_name = cleaned.split(".")[0].upper()
    if base_name in DOS_RESERVED:
        return None

    return cleaned

def is_safe_path(target_path: Path, allowed_roots: list) -> bool:
    """
    Verifies that target_path resolves strictly inside one of the allowed_roots.
    """
    try:
        resolved_target = target_path.resolve()
        for root in allowed_roots:
            if not root:
                continue
            resolved_root = Path(root).resolve()
            # Python 3.9+ is_relative_to or boundary check fallback
            try:
                if resolved_target.is_relative_to(resolved_root):
                    return True
            except AttributeError:
                import os
                root_str = str(resolved_root).rstrip(os.sep) + os.sep
                target_str = str(resolved_target)
                if target_str == str(resolved_root) or target_str.startswith(root_str):
                    return True
        return False
    except Exception:
        return False

def redact_sensitive_data(text: str) -> str:
    """
    Scrubs credentials, keys, and tokens from text or JSON chunks before broadcasting over SSE.
    """
    if not text or not isinstance(text, str):
        return text

    scrubbed = text
    for pattern, replacement in SECRET_PATTERNS:
        scrubbed = pattern.sub(replacement, scrubbed)

    return scrubbed

def get_security_headers() -> dict:
    """
    Returns standard defense-in-depth security headers.
    Allows necessary CDNs for styling (gstatic, tailwind, google fonts).
    """
    return {
        "Content-Security-Policy": (
            "default-src 'self' 'unsafe-inline' data:; "
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.gstatic.com https://cdn.tailwindcss.com; "
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
            "font-src 'self' data: https://fonts.gstatic.com; "
            "connect-src 'self' ws: http: https:; "
            "img-src 'self' data: blob:;"
        ),
        "X-Content-Type-Options": "nosniff",
        "X-Frame-Options": "SAMEORIGIN",
        "Referrer-Policy": "no-referrer"
    }
