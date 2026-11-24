"""
Antigravity Autonomous Studio
A live 2D architectural virtual office visualizer and telemetry engine for Google Antigravity.
"""

__version__ = "1.0.0"
__author__ = "yoshiafk"

from studio.paths import resolve_antigravity_paths
from studio.core import run, ThreadedHTTPServer, OfficeRequestHandler
