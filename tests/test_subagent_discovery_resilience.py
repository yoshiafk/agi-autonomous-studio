"""
tests.test_subagent_discovery_resilience - Verifies discovery resilience with corrupt encodings and quoted names.
"""

import tempfile
import unittest
from pathlib import Path
from studio.telemetry import get_available_subagents

class TestSubagentDiscoveryResilience(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.config_dir = Path(self.temp_dir.name)
        self.agents_dir = self.config_dir / "agents"
        self.agents_dir.mkdir(parents=True, exist_ok=True)

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_quoted_frontmatter_name(self):
        """Verifies that quotes in frontmatter names are cleanly stripped."""
        agent_file = self.agents_dir / "custom-agent.md"
        agent_file.write_text(
            "---\nname: \"Special-Ops\"\ndescription: 'Special ops agent'\n---\nPrompt body",
            encoding="utf-8"
        )

        agents = get_available_subagents(self.config_dir)
        agent_ids = [a["id"] for a in agents]
        self.assertIn("special-ops", agent_ids)
        target = next(a for a in agents if a["id"] == "special-ops")
        self.assertEqual(target["description"], "Special ops agent")

    def test_non_utf8_encoding_resilience(self):
        """Verifies that non-UTF-8 bytes do not trigger UnicodeDecodeError."""
        agent_file = self.agents_dir / "latin1-agent.md"
        # Write bytes with high-order non-UTF8 byte 0xff
        raw_bytes = b"---\nname: latin-agent\ndescription: agent with \xff byte\n---\n"
        with open(agent_file, "wb") as f:
            f.write(raw_bytes)

        # Must not raise UnicodeDecodeError
        agents = get_available_subagents(self.config_dir)
        agent_ids = [a["id"] for a in agents]
        self.assertIn("latin-agent", agent_ids)

    def test_missing_frontmatter_fallback(self):
        """Verifies fallback to filename stem when frontmatter is missing."""
        agent_file = self.agents_dir / "fallback-coder.md"
        agent_file.write_text("No frontmatter, just raw prompt text.", encoding="utf-8")

        agents = get_available_subagents(self.config_dir)
        agent_ids = [a["id"] for a in agents]
        self.assertIn("fallback-coder", agent_ids)

if __name__ == "__main__":
    unittest.main()
