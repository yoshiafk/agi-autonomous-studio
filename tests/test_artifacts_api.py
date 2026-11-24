import unittest
import tempfile
import json
import urllib.request
import urllib.error
import threading
from pathlib import Path
from studio.core import ThreadedHTTPServer, OfficeRequestHandler, find_available_port, DATA_DIR
from studio.paths import get_conversation_artifacts, read_artifact_file

class TestArtifactsAPI(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.test_port = find_available_port("127.0.0.1", 8910)
        cls.server = ThreadedHTTPServer(("127.0.0.1", cls.test_port), OfficeRequestHandler)
        cls.server_thread = threading.Thread(target=cls.server.serve_forever)
        cls.server_thread.daemon = True
        cls.server_thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def test_get_conversation_artifacts_helper(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_p = Path(tmp_dir)
            brain_dir = tmp_p / "brain" / "test-conv-123"
            brain_dir.mkdir(parents=True)

            plan_f = brain_dir / "migration_plan.md"
            plan_f.write_text("# Migration Plan\n- Step 1", encoding="utf-8")
            walk_f = brain_dir / "walkthrough.md"
            walk_f.write_text("# Walkthrough\nResults here", encoding="utf-8")
            other_f = brain_dir / ".hidden.md"
            other_f.write_text("hidden", encoding="utf-8")

            artifacts = get_conversation_artifacts(tmp_p, "test-conv-123")
            self.assertEqual(len(artifacts), 2)
            names = [a["name"] for a in artifacts]
            self.assertIn("migration_plan.md", names)
            self.assertIn("walkthrough.md", names)
            self.assertNotIn(".hidden.md", names)

            # Check kinds
            plan_item = next(a for a in artifacts if a["name"] == "migration_plan.md")
            self.assertEqual(plan_item["kind"], "plan")
            walk_item = next(a for a in artifacts if a["name"] == "walkthrough.md")
            self.assertEqual(walk_item["kind"], "walkthrough")

    def test_read_artifact_file_security_and_content(self):
        with tempfile.TemporaryDirectory() as tmp_dir:
            tmp_p = Path(tmp_dir)
            brain_dir = tmp_p / "brain" / "test-conv-123"
            brain_dir.mkdir(parents=True)

            secret_outside = tmp_p / "secret.txt"
            secret_outside.write_text("CLASSIFIED", encoding="utf-8")

            art = brain_dir / "plan.md"
            art.write_text("# Safe Content", encoding="utf-8")

            # Safe read
            content = read_artifact_file(tmp_p, "test-conv-123", "plan.md")
            self.assertEqual(content, "# Safe Content")

            # Traversal blocked
            traversal_content = read_artifact_file(tmp_p, "test-conv-123", "../secret.txt")
            self.assertIsNone(traversal_content)

    def test_artifacts_http_endpoints_invalid_param_rejected(self):
        url = f"http://127.0.0.1:{self.test_port}/api/artifacts/content?conversation_id=../../etc&file=passwd"
        req = urllib.request.Request(url, headers={"Host": f"127.0.0.1:{self.test_port}"})
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(req, timeout=3)
        self.assertEqual(ctx.exception.code, 400)

if __name__ == "__main__":
    unittest.main()
