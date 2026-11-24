"""
Unit tests for Antigravity Autonomous Studio Daemon & Plugin Integration.
"""

import os
import json
import socket
import unittest
from pathlib import Path
from studio.core import (
    get_pid_file_path,
    is_server_healthy,
    find_available_port,
    get_status
)

class TestDaemonAndPluginIntegration(unittest.TestCase):
    def test_pid_file_path_resolution(self):
        pid_path = get_pid_file_path()
        self.assertIsInstance(pid_path, Path)
        self.assertEqual(pid_path.name, ".studio.pid")

    def test_find_available_port(self):
        port = find_available_port("127.0.0.1", 18880, max_attempts=5)
        self.assertGreaterEqual(port, 18880)
        # Port should be bindable
        with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
            s.bind(("127.0.0.1", port))
            self.assertTrue(True)

    def test_is_server_healthy_closed_port(self):
        # Port 19999 is closed, should return None
        result = is_server_healthy("127.0.0.1", 19999)
        self.assertIsNone(result)

    def test_get_status_closed_port(self):
        # On closed port, get_status returns 1
        status_code = get_status("127.0.0.1", 19999)
        self.assertEqual(status_code, 1)

    def test_plugin_manifest_structure(self):
        plugin_json = Path(__file__).resolve().parent.parent / "plugin.json"
        self.assertTrue(plugin_json.is_file(), "plugin.json must exist")
        data = json.loads(plugin_json.read_text(encoding="utf-8"))
        self.assertEqual(data.get("name"), "antigravity-studio")
        self.assertIn("skills", data)
        self.assertIn("rules", data)

        repo_root = Path(__file__).resolve().parent.parent
        for skill_dir in data.get("skills", []):
            self.assertTrue((repo_root / skill_dir).is_dir(), f"Skill directory {skill_dir} must exist")
        for rule_dir in data.get("rules", []):
            self.assertTrue((repo_root / rule_dir).is_dir(), f"Rule directory {rule_dir} must exist")

    def test_studio_skill_and_rule_exist(self):
        repo_root = Path(__file__).resolve().parent.parent
        skill_file = repo_root / "skills" / "studio" / "SKILL.md"
        rule_file = repo_root / "rules" / "studio.md"
        self.assertTrue(skill_file.is_file(), "skills/studio/SKILL.md must exist")
        self.assertTrue(rule_file.is_file(), "rules/studio.md must exist")

if __name__ == "__main__":
    unittest.main()
