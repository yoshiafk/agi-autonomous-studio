import unittest
import tempfile
import json
import urllib.request
import urllib.error
import threading
from pathlib import Path
from studio.core import ThreadedHTTPServer, OfficeRequestHandler, find_available_port
from studio.telemetry import calculate_session_analytics

class TestAnalytics(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.test_port = find_available_port("127.0.0.1", 8920)
        cls.server = ThreadedHTTPServer(("127.0.0.1", cls.test_port), OfficeRequestHandler)
        cls.server_thread = threading.Thread(target=cls.server.serve_forever)
        cls.server_thread.daemon = True
        cls.server_thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def test_calculate_session_analytics_accurate_aggregation(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_p = Path(tmp_dir)
            logs_dir = tmp_p / "brain" / "conv-analytics" / ".system_generated" / "logs"
            logs_dir.mkdir(parents=True)

            transcript = logs_dir / "transcript.jsonl"
            lines = [
                json.dumps({
                    "step_index": 0, "source": "USER_EXPLICIT", "type": "USER_INPUT",
                    "content": "Build feature", "created_at": "2026-11-24T10:00:00Z"
                }),
                json.dumps({
                    "step_index": 1, "source": "MODEL", "type": "PLANNER_RESPONSE",
                    "model": "gemini-3.8-flash-high",
                    "input_tokens": 15000, "output_tokens": 500, "cache_read_tokens": 2000,
                    "created_at": "2026-11-24T10:00:05Z",
                    "tool_calls": [
                        {"name": "read_file", "args": {"Path": "file1.txt"}},
                        {"name": "run_command", "args": {"CommandLine": "ls"}}
                    ]
                }),
                json.dumps({
                    "step_index": 2, "source": "MODEL", "type": "PLANNER_RESPONSE",
                    "model": "gemini-3.8-flash-high",
                    "input_tokens": 20000, "output_tokens": 800, "cache_read_tokens": 3000,
                    "created_at": "2026-11-24T10:00:15Z",
                    "tool_calls": [
                        {"name": "run_command", "args": {"CommandLine": "npm test"}},
                        {"name": "edit_file", "args": {"Path": "file1.txt"}}
                    ]
                })
            ]
            transcript.write_text("\n".join(lines), encoding="utf-8")

            res = calculate_session_analytics(tmp_p, "conv-analytics")
            self.assertEqual(res["total_steps"], 3)
            self.assertEqual(res["total_input_tokens"], 35000)
            self.assertEqual(res["total_output_tokens"], 1300)
            self.assertEqual(res["total_cache_tokens"], 5000)
            self.assertEqual(res["models_used"], ["gemini-3.8-flash-high"])
            self.assertEqual(res["tool_counts"]["run_command"], 2)
            self.assertEqual(res["tool_counts"]["read_file"], 1)
            self.assertEqual(res["tool_counts"]["edit_file"], 1)
            self.assertEqual(res["tool_percentages"]["run_command"], 50.0)
            self.assertEqual(res["tool_percentages"]["read_file"], 25.0)
            self.assertEqual(res["tool_percentages"]["edit_file"], 25.0)
            self.assertEqual(res["first_step_time"], "2026-11-24T10:00:00Z")
            self.assertEqual(res["last_step_time"], "2026-11-24T10:00:15Z")

    def test_analytics_missing_session_graceful(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_p = Path(tmp_dir)
            res = calculate_session_analytics(tmp_p, "non-existent-conv")
            self.assertEqual(res["total_steps"], 0)
            self.assertEqual(res["total_input_tokens"], 0)
            self.assertEqual(res["tool_counts"], {})

    def test_analytics_http_endpoint_rejection_for_traversal(self):
        url = f"http://127.0.0.1:{self.test_port}/api/analytics?conversation_id=../../../../etc"
        req = urllib.request.Request(url, headers={"Host": f"127.0.0.1:{self.test_port}"})
        # Sanitizer strips ../ and returns 404
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(req, timeout=3)
        self.assertIn(ctx.exception.code, [400, 404])

if __name__ == "__main__":
    unittest.main()
