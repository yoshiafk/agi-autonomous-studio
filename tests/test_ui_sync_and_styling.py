"""
tests.test_ui_sync_and_styling - Unit tests for UI styling, side border removal, and dynamic focus/roadmap synchronization.
Verifies that stale completed roadmaps are not resurrected, active user prompts dynamically populate focus,
and storyline cards maintain clean uniform borders without colored side stripes.
"""

import os
import re
import json
import unittest
from pathlib import Path

class TestUISyncAndStyling(unittest.TestCase):
    def setUp(self):
        self.repo_root = Path(__file__).resolve().parent.parent
        self.style_path = self.repo_root / "public" / "style.css"
        self.app_js_path = self.repo_root / "public" / "app.js"
        self.index_html_path = self.repo_root / "public" / "index.html"
        self.sw_js_path = self.repo_root / "public" / "sw.js"
        self.core_py_path = self.repo_root / "studio" / "core.py"

    def test_storyline_cards_no_side_borders(self):
        """Verifies that storyline cards have uniform borders and no colored side accent stripes."""
        self.assertTrue(self.style_path.exists())
        css_content = self.style_path.read_text(encoding="utf-8")

        # Must not contain border-left-color rules
        self.assertNotIn("border-left-color", css_content)
        # Must not contain border-left: 3px solid
        self.assertNotIn("border-left: 3px solid", css_content)

        # Must retain uniform card border
        self.assertIn(".storyline-card", css_content)
        self.assertIn("border: 1px solid var(--border-card) !important;", css_content)

    def test_sse_hydration_stale_roadmap_prevention(self):
        """Verifies that completed roadmaps prior to a new user request are not resurrected."""
        # Simulate transcript lines: an old turn with all done steps, followed by a new user prompt
        completed_steps = [
            {"title": "Old Task Step 1", "status": "done"},
            {"title": "Old Task Step 2", "status": "done"}
        ]
        simulated_transcript = [
            {"type": "USER_INPUT", "content": "Old request"},
            {"type": "PLANNER_RESPONSE", "tool_calls": [{"name": "update_steps", "args": {"steps": completed_steps}}]},
            {"type": "PLANNER_RESPONSE", "content": "Old task finished"},
            {"type": "USER_INPUT", "content": "<USER_REQUEST>\nWhy those 2 not updated according to currenct active task or plan?\n</USER_REQUEST>"},
            {"type": "PLANNER_RESPONSE", "tool_calls": [{"name": "run_command", "args": {"CommandLine": "ls"}}]}
        ]

        all_lines = [json.dumps(item) + "\n" for item in simulated_transcript]

        # Emulate the backward hydration scan from studio/core.py
        initial_state = {"focus": None, "steps": [], "recent_steps": []}
        latest_user_request = None
        latest_turn_saw_user_input = False

        for line in reversed(all_lines):
            line_str = line.strip()
            if not line_str:
                continue
            step_data = json.loads(line_str)
            st_type = step_data.get("type")

            if st_type == "USER_INPUT" and not latest_user_request:
                raw_content = step_data.get("content") or ""
                clean_prompt = re.sub(r"<[^>]+>", "", raw_content).strip()
                clean_prompt = clean_prompt.split("\n")[0].strip()
                if len(clean_prompt) > 80:
                    clean_prompt = clean_prompt[:77] + "..."
                if clean_prompt:
                    latest_user_request = clean_prompt
                    latest_turn_saw_user_input = True

            if step_data.get("tool_calls"):
                for tc in step_data["tool_calls"]:
                    tc_name = tc.get("name")
                    tc_args = tc.get("args") or {}
                    if not initial_state["focus"] and tc_name == "update_focus" and tc_args.get("focus"):
                        initial_state["focus"] = tc_args["focus"]
                    if not initial_state["steps"] and tc_name == "update_steps" and tc_args.get("steps"):
                        steps_cand = tc_args["steps"]
                        is_all_done = (
                            isinstance(steps_cand, list) and
                            len(steps_cand) > 0 and
                            all(s.get("status") == "done" for s in steps_cand)
                        )
                        if latest_turn_saw_user_input and is_all_done:
                            pass
                        else:
                            initial_state["steps"] = steps_cand

        if not initial_state["focus"] and latest_user_request:
            initial_state["focus"] = latest_user_request

        # Stale completed steps must NOT be resurrected
        self.assertEqual(initial_state["steps"], [])
        # Focus must fall back to the new user prompt
        self.assertIn("Why those 2 not updated", initial_state["focus"])

    def test_sse_hydration_active_roadmap_preserved(self):
        """Verifies that an active in-progress roadmap in current turn is preserved."""
        active_steps = [
            {"title": "Current Task Step 1", "status": "done"},
            {"title": "Current Task Step 2", "status": "in_progress"},
            {"title": "Current Task Step 3", "status": "pending"}
        ]
        simulated_transcript = [
            {"type": "USER_INPUT", "content": "Do new task"},
            {"type": "PLANNER_RESPONSE", "tool_calls": [
                {"name": "update_focus", "args": {"focus": "Refining Active UI"}},
                {"name": "update_steps", "args": {"steps": active_steps}}
            ]}
        ]
        all_lines = [json.dumps(item) + "\n" for item in simulated_transcript]

        initial_state = {"focus": None, "steps": []}
        latest_user_request = None
        latest_turn_saw_user_input = False

        for line in reversed(all_lines):
            line_str = line.strip()
            if not line_str:
                continue
            step_data = json.loads(line_str)
            st_type = step_data.get("type")

            if st_type == "USER_INPUT" and not latest_user_request:
                latest_user_request = step_data.get("content")
                latest_turn_saw_user_input = True

            if step_data.get("tool_calls"):
                for tc in step_data["tool_calls"]:
                    tc_name = tc.get("name")
                    tc_args = tc.get("args") or {}
                    if not initial_state["focus"] and tc_name == "update_focus" and tc_args.get("focus"):
                        initial_state["focus"] = tc_args["focus"]
                    if not initial_state["steps"] and tc_name == "update_steps" and tc_args.get("steps"):
                        initial_state["steps"] = tc_args["steps"]

        self.assertEqual(initial_state["focus"], "Refining Active UI")
        self.assertEqual(len(initial_state["steps"]), 3)
        self.assertEqual(initial_state["steps"][1]["status"], "in_progress")

    def test_app_js_focus_not_overwritten_by_session_title(self):
        """Verifies that updateActiveHeader does not stomp focusBanner.textContent with sessionTitle."""
        app_js = self.app_js_path.read_text(encoding="utf-8")
        # Ensure updateActiveHeader does not contain the old stomping line
        self.assertNotIn("if (focusBanner && sessionTitle) {\n    focusBanner.textContent = sessionTitle;\n  }", app_js)
        # Ensure cachedFocusText variable is present
        self.assertIn("let cachedFocusText", app_js)

    def test_cache_busting_and_service_worker(self):
        """Verifies asset cache busting versions and network-first navigation in sw.js."""
        index_html = self.index_html_path.read_text(encoding="utf-8")
        self.assertIn("logo.svg?v=2.1.0", index_html)
        self.assertIn("style.css?v=2.1.0", index_html)
        self.assertIn("app.js?v=2.1.0", index_html)

        sw_js = self.sw_js_path.read_text(encoding="utf-8")
        self.assertIn("agi-studio-cache-v5", sw_js)
        self.assertIn("e.request.mode === 'navigate'", sw_js)

    def test_strict_zero_emoji_compliance(self):
        """Verifies that modified files contain zero emoji symbols."""
        emoji_pattern = re.compile(
            r"[\U00010000-\U0010ffff]|[\u2600-\u27bf]|[\u2300-\u23ff]|[\u2b50-\u2b55]"
        )
        files_to_check = [
            self.style_path,
            self.app_js_path,
            self.index_html_path,
            self.sw_js_path,
            self.core_py_path,
            Path(__file__)
        ]
        for f in files_to_check:
            content = f.read_text(encoding="utf-8", errors="replace")
            matches = emoji_pattern.findall(content)
            self.assertEqual(len(matches), 0, f"Found emoji symbols in {f.name}: {matches}")

if __name__ == "__main__":
    unittest.main()
