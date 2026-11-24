import unittest
from pathlib import Path
from studio.security import (
    validate_host_header,
    get_allowed_cors_origin,
    sanitize_identifier,
    is_safe_path,
    redact_sensitive_data,
    get_security_headers
)

class TestSecurityShield(unittest.TestCase):

    def test_validate_host_header(self):
        # Valid loopback hosts
        self.assertTrue(validate_host_header("localhost", 7777))
        self.assertTrue(validate_host_header("localhost:7777", 7777))
        self.assertTrue(validate_host_header("127.0.0.1", 7777))
        self.assertTrue(validate_host_header("127.0.0.1:7777", 7777))
        self.assertTrue(validate_host_header("[::1]:7777", 7777))

        # Invalid/spoofed hosts (DNS rebinding attempts)
        self.assertFalse(validate_host_header("attacker.com", 7777))
        self.assertFalse(validate_host_header("attacker.com:7777", 7777))
        self.assertFalse(validate_host_header("evil-subdomain.localhost.com", 7777))
        self.assertFalse(validate_host_header("", 7777))
        self.assertFalse(validate_host_header(None, 7777))

    def test_get_allowed_cors_origin(self):
        # Allowed loopback origins
        self.assertEqual(get_allowed_cors_origin("http://localhost:7777"), "http://localhost:7777")
        self.assertEqual(get_allowed_cors_origin("http://127.0.0.1:3000"), "http://127.0.0.1:3000")
        self.assertEqual(get_allowed_cors_origin("null"), "null")

        # Blocked external origins
        self.assertIsNone(get_allowed_cors_origin("http://malicious-website.com"))
        self.assertIsNone(get_allowed_cors_origin("https://phishing.org"))
        self.assertIsNone(get_allowed_cors_origin(""))

    def test_sanitize_identifier(self):
        # Valid identifiers
        self.assertEqual(sanitize_identifier("7f270c91-8b98-45aa-9bfd-311aa2a47b72"), "7f270c91-8b98-45aa-9bfd-311aa2a47b72")
        self.assertEqual(sanitize_identifier("project_alpha-123"), "project_alpha-123")

        # Path traversal attempts
        self.assertIsNone(sanitize_identifier("../../etc/passwd"))
        self.assertIsNone(sanitize_identifier("../secret.json"))
        self.assertIsNone(sanitize_identifier("..\\windows\\win.ini"))
        self.assertIsNone(sanitize_identifier("/absolute/path"))
        self.assertIsNone(sanitize_identifier("bad;rm -rf"))
        self.assertIsNone(sanitize_identifier(""))

    def test_is_safe_path(self):
        base_dir = Path("/home/user/project").resolve()
        safe_child = base_dir / "subdir" / "file.txt"
        escaped_child = Path("/home/user/other/file.txt")

        self.assertTrue(is_safe_path(safe_child, [base_dir]))
        self.assertFalse(is_safe_path(escaped_child, [base_dir]))

    def test_redact_sensitive_data(self):
        # Gemini API Key
        raw_gemini = "curl -H 'x-goog-api-key: AIzaSyA1234567890123456789012345678901' https://generativelanguage.googleapis.com"
        redacted = redact_sensitive_data(raw_gemini)
        self.assertNotIn("AIzaSyA1234567890123456789012345678901", redacted)
        self.assertIn("[REDACTED_GEMINI_KEY]", redacted)

        # OpenAI API Key
        raw_openai = "sk-12345678901234567890123456789012"
        self.assertIn("[REDACTED_API_KEY]", redact_sensitive_data(raw_openai))

        # Bearer JWT
        raw_bearer = "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c"
        redacted_jwt = redact_sensitive_data(raw_bearer)
        self.assertNotIn("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9", redacted_jwt)
        self.assertIn("Bearer [REDACTED_JWT]", redacted_jwt)

        # Passwords in JSON
        raw_json = '{"user": "admin", "password": "SuperSecretPassword123"}'
        redacted_json = redact_sensitive_data(raw_json)
        self.assertNotIn("SuperSecretPassword123", redacted_json)
        self.assertIn("[REDACTED]", redacted_json)

    def test_get_security_headers(self):
        headers = get_security_headers()
        self.assertIn("Content-Security-Policy", headers)
        self.assertEqual(headers["X-Content-Type-Options"], "nosniff")
        self.assertEqual(headers["X-Frame-Options"], "SAMEORIGIN")

if __name__ == "__main__":
    unittest.main()
