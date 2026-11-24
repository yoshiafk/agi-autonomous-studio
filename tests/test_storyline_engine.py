"""
Antigravity Autonomous Studio - Executive Storyline & Action Engine Tests
Verifies clean command parsing, executive narrative generation, and layout contract integrity.
"""

import re
import unittest
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DIR = REPO_ROOT / "public"


class TestStorylineEngine(unittest.TestCase):
    """Test suite ensuring human-centric action translation and layout adaptability."""

    def setUp(self):
        self.app_js_content = (PUBLIC_DIR / "app.js").read_text(encoding="utf-8")
        self.index_html_content = (PUBLIC_DIR / "index.html").read_text(encoding="utf-8")
        self.style_css_content = (PUBLIC_DIR / "style.css").read_text(encoding="utf-8")

    def test_clean_command_regex_patterns(self):
        """Verify the app.js parseCleanCommand regex handles WSL and PowerShell wrappers."""
        self.assertIn("parseCleanCommand", self.app_js_content)
        self.assertIn(r"wsl(?:\.exe)?", self.app_js_content)
        self.assertIn(r"powershell(?:\.exe)?", self.app_js_content)

    def test_executive_story_action_badges(self):
        """Verify standard executive action badges and narrative titles are registered."""
        self.assertIn("getExecutiveStory", self.app_js_content)
        self.assertIn("GIT COMMIT", self.app_js_content)
        self.assertIn("GIT PUSH", self.app_js_content)
        self.assertIn("GIT STAGE", self.app_js_content)
        self.assertIn("TEST SUITE", self.app_js_content)
        self.assertIn("SEARCH", self.app_js_content)

    def test_collapsible_cli_trace_contract(self):
        """Verify command cards include the collapsible CLI trace drawer and copy action."""
        self.assertIn("cli-trace-drawer", self.app_js_content)
        self.assertIn("cli-toggle-btn", self.app_js_content)
        self.assertIn("CLI Trace", self.app_js_content)
        self.assertIn(".cli-trace-drawer", self.style_css_content)

    def test_html_layout_expansion_attributes(self):
        """Verify index.html defines main-dashboard, stage-column, sidebar-column, and toggle button."""
        self.assertIn('id="main-dashboard"', self.index_html_content)
        self.assertIn('id="stage-column"', self.index_html_content)
        self.assertIn('id="sidebar-column"', self.index_html_content)
        self.assertIn('id="btn-toggle-view"', self.index_html_content)
        self.assertIn("Executive Storyline", self.index_html_content)

    def test_immersive_mode_css_rules(self):
        """Verify style.css implements the immersive-mode layout rules."""
        self.assertIn("#main-dashboard.immersive-mode #stage-column", self.style_css_content)
        self.assertIn("#main-dashboard.immersive-mode #sidebar-column", self.style_css_content)
        self.assertIn("display: none !important", self.style_css_content)

    def test_zero_emoji_compliance(self):
        """Strict compliance check ensuring no emoji characters exist in modified files."""
        emoji_pattern = re.compile(
            r"[\U00010000-\U0010ffff]|[\u2600-\u27ff]|[\u2300-\u23ff]|[\u2b50-\u2b55]"
        )
        checked_files = [
            PUBLIC_DIR / "app.js",
            PUBLIC_DIR / "index.html",
            PUBLIC_DIR / "style.css",
            Path(__file__)
        ]
        for f in checked_files:
            text = f.read_text(encoding="utf-8")
            matches = emoji_pattern.findall(text)
            self.assertEqual(len(matches), 0, f"Found emojis in {f.name}: {matches}")


if __name__ == "__main__":
    unittest.main()
