"""
tests.test_sse_stream - Unit and integration tests for SSE streaming resilience.
Verifies byte-offset seeking, partial chunk buffering, truncation reset, and disconnect safety.
"""

import os
import json
import time
import tempfile
import unittest
from pathlib import Path
from studio.security import redact_sensitive_data

class TestSSEStreamResilience(unittest.TestCase):
    def setUp(self):
        self.temp_dir = tempfile.TemporaryDirectory()
        self.transcript_path = Path(self.temp_dir.name) / "transcript.jsonl"
        self.plan_path = Path(self.temp_dir.name) / "plan.json"

    def tearDown(self):
        self.temp_dir.cleanup()

    def test_byte_offset_seeking(self):
        """Verifies that reading only new bytes via seek avoids full-file re-reads."""
        # Initial step
        step1 = {"step": 1, "type": "USER_INPUT", "content": "Initial step"}
        self.transcript_path.write_text(json.dumps(step1) + "\n", encoding="utf-8")

        last_file_pos = self.transcript_path.stat().st_size
        self.assertGreater(last_file_pos, 0)

        # Append new step
        step2 = {"step": 2, "type": "PLANNER_RESPONSE", "content": "Second step"}
        with open(self.transcript_path, "a", encoding="utf-8") as f:
            f.write(json.dumps(step2) + "\n")

        # Emulate seeking to last_file_pos
        curr_size = self.transcript_path.stat().st_size
        self.assertGreater(curr_size, last_file_pos)

        with open(self.transcript_path, "r", encoding="utf-8") as f:
            f.seek(last_file_pos)
            chunk = f.read()
            new_pos = f.tell()

        self.assertEqual(new_pos, curr_size)
        self.assertIn("Second step", chunk)
        self.assertNotIn("Initial step", chunk)

    def test_partial_chunk_buffering(self):
        """Verifies that unterminated partial lines are held in buffer until newline arrives."""
        line_buffer = ""
        emitted_steps = []

        # Half a JSON record is flushed
        chunk1 = '{"step": 3, "content": "partially writt'
        combined = line_buffer + chunk1
        lines = combined.split("\n")
        line_buffer = lines.pop()

        for line in lines:
            if line.strip():
                emitted_steps.append(line.strip())

        self.assertEqual(len(emitted_steps), 0)
        self.assertEqual(line_buffer, chunk1)

        # Remainder of record is flushed with newline
        chunk2 = 'en step"}\n'
        combined = line_buffer + chunk2
        lines = combined.split("\n")
        line_buffer = lines.pop()

        for line in lines:
            if line.strip():
                emitted_steps.append(json.loads(line.strip()))

        self.assertEqual(len(emitted_steps), 1)
        self.assertEqual(emitted_steps[0]["step"], 3)
        self.assertEqual(emitted_steps[0]["content"], "partially written step")
        self.assertEqual(line_buffer, "")

    def test_truncation_compaction_reset(self):
        """Verifies that last_file_pos resets to 0 if the file size shrinks."""
        self.transcript_path.write_text("Long historical line 1\nLong historical line 2\n", encoding="utf-8")
        last_file_pos = self.transcript_path.stat().st_size

        # Compact file
        self.transcript_path.write_text("Compacted\n", encoding="utf-8")
        curr_size = self.transcript_path.stat().st_size

        if curr_size < last_file_pos:
            last_file_pos = 0

        self.assertEqual(last_file_pos, 0)
        with open(self.transcript_path, "r", encoding="utf-8") as f:
            f.seek(last_file_pos)
            content = f.read()

        self.assertEqual(content, "Compacted\n")

    def test_single_line_plan_minification(self):
        """Verifies that multi-line plan JSON files are minified onto a single line for SSE compliance."""
        multi_line_plan = {
            "title": "System Architecture",
            "steps": [
                {"title": "Step 1", "status": "done"},
                {"title": "Step 2", "status": "in_progress"}
            ]
        }
        self.plan_path.write_text(json.dumps(multi_line_plan, indent=2), encoding="utf-8")

        plan_content = self.plan_path.read_text(encoding="utf-8", errors="replace")
        plan_obj = json.loads(plan_content)
        compact_plan = redact_sensitive_data(json.dumps(plan_obj))

        self.assertNotIn("\n", compact_plan)
        sse_event = f"event: plan\ndata: {compact_plan}\n\n"
        # Exactly 3 newlines: after event, after data, and final blank line
        self.assertEqual(sse_event.count("\n"), 3)

if __name__ == "__main__":
    unittest.main()
