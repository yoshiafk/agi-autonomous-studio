#!/usr/bin/env python3
"""
Antigravity Autonomous Studio - Server Shim (Backward Compatibility)
Delegates execution to the production-hardened studio.core runtime.
"""

import sys
from pathlib import Path

# Ensure repository root is on sys.path
REPO_ROOT = Path(__file__).resolve().parent
if str(REPO_ROOT) not in sys.path:
    sys.path.insert(0, str(REPO_ROOT))

from studio.core import run, DATA_DIR, CONFIG_DIR, PORT, HOST, ThreadedHTTPServer, OfficeRequestHandler

if __name__ == "__main__":
    run()
