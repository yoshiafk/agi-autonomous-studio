import unittest
import urllib.request
import urllib.error
import json
import threading
import socket
from studio.core import ThreadedHTTPServer, OfficeRequestHandler, find_available_port

class TestServerAPIAndSecurity(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Pick an ephemeral port for testing
        cls.test_port = find_available_port("127.0.0.1", 8890)
        cls.server = ThreadedHTTPServer(("127.0.0.1", cls.test_port), OfficeRequestHandler)
        cls.server_thread = threading.Thread(target=cls.server.serve_forever)
        cls.server_thread.daemon = True
        cls.server_thread.start()

    @classmethod
    def tearDownClass(cls):
        cls.server.shutdown()
        cls.server.server_close()

    def test_health_endpoint_valid_host(self):
        url = f"http://127.0.0.1:{self.test_port}/health"
        req = urllib.request.Request(url, headers={"Host": f"127.0.0.1:{self.test_port}"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            self.assertEqual(resp.status, 200)
            data = json.loads(resp.read().decode("utf-8"))
            self.assertEqual(data["status"], "ok")
            self.assertEqual(data["version"], "1.0.0")
            # Verify security headers
            self.assertEqual(resp.headers.get("X-Content-Type-Options"), "nosniff")
            self.assertEqual(resp.headers.get("X-Frame-Options"), "SAMEORIGIN")

    def test_dns_rebinding_rejected(self):
        url = f"http://127.0.0.1:{self.test_port}/health"
        req = urllib.request.Request(url, headers={"Host": "malicious-phishing-site.com"})
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(req, timeout=3)
        self.assertEqual(ctx.exception.code, 403)

    def test_path_traversal_rejected(self):
        url = f"http://127.0.0.1:{self.test_port}/api/events?conversation_id=../../../../etc/passwd"
        req = urllib.request.Request(url, headers={"Host": f"127.0.0.1:{self.test_port}"})
        with self.assertRaises(urllib.error.HTTPError) as ctx:
            urllib.request.urlopen(req, timeout=3)
        self.assertEqual(ctx.exception.code, 400)

    def test_pwa_manifest_served(self):
        url = f"http://127.0.0.1:{self.test_port}/manifest.json"
        req = urllib.request.Request(url, headers={"Host": f"127.0.0.1:{self.test_port}"})
        with urllib.request.urlopen(req, timeout=3) as resp:
            self.assertEqual(resp.status, 200)
            data = json.loads(resp.read().decode("utf-8"))
            self.assertEqual(data["display"], "standalone")
            self.assertEqual(data["short_name"], "AGI Studio")

if __name__ == "__main__":
    unittest.main()
