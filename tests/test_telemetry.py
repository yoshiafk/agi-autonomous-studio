import unittest
import tempfile
import shutil
from pathlib import Path
from studio.telemetry import get_available_subagents, AGENT_STYLE_PRESETS

class TestSubagentDiscovery(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.mkdtemp()
        self.config_dir = Path(self.temp_dir)

    def tearDown(self):
        shutil.rmtree(self.temp_dir, ignore_errors=True)

    def test_baseline_subagents_present_when_no_plugins(self):
        agents = get_available_subagents(self.config_dir)
        agent_ids = {a["id"] for a in agents}
        self.assertIn("lead-architect", agent_ids)
        self.assertIn("core-developer", agent_ids)
        self.assertIn("research-analyst", agent_ids)
        self.assertIn("devops-qa", agent_ids)
        self.assertIn("git-postmaster", agent_ids)

    def test_discover_plugin_subagents_from_markdown(self):
        # Create a mock plugin directory structure: plugins/agent-skills/agents/code-reviewer.md
        plugin_agents_dir = self.config_dir / "plugins" / "agent-skills" / "agents"
        plugin_agents_dir.mkdir(parents=True, exist_ok=True)
        reviewer_file = plugin_agents_dir / "code-reviewer.md"
        reviewer_file.write_text(
            "---\nname: code-reviewer\ndescription: Senior code reviewer evaluating changes.\n---\nPrompt instructions...",
            encoding="utf-8"
        )

        security_file = plugin_agents_dir / "security-auditor.md"
        security_file.write_text(
            "---\nname: security-auditor\ndescription: Security engineer focused on vulnerability detection.\n---\nPrompt instructions...",
            encoding="utf-8"
        )

        agents = get_available_subagents(self.config_dir)
        agents_dict = {a["id"]: a for a in agents}

        self.assertIn("code-reviewer", agents_dict)
        self.assertEqual(agents_dict["code-reviewer"]["source"], "agent-skills")
        self.assertEqual(agents_dict["code-reviewer"]["name"], "Code Reviewer")

        self.assertIn("security-auditor", agents_dict)
        self.assertEqual(agents_dict["security-auditor"]["source"], "agent-skills")
        self.assertEqual(agents_dict["security-auditor"]["station"], "Security Operations")

    def test_fallback_palette_for_unknown_custom_agent(self):
        # User defined custom agent: agents/custom-bot.md
        user_agents_dir = self.config_dir / "agents"
        user_agents_dir.mkdir(parents=True, exist_ok=True)
        custom_file = user_agents_dir / "custom-bot.md"
        custom_file.write_text(
            "---\nname: custom-bot\ndescription: A novel custom agent bot\n---\nPrompt...",
            encoding="utf-8"
        )

        agents = get_available_subagents(self.config_dir)
        agents_dict = {a["id"]: a for a in agents}

        self.assertIn("custom-bot", agents_dict)
        self.assertEqual(agents_dict["custom-bot"]["source"], "user")
        self.assertTrue(agents_dict["custom-bot"]["color"].startswith("#"))
        self.assertEqual(agents_dict["custom-bot"]["station"], "Studio Workstation")

if __name__ == "__main__":
    unittest.main()
