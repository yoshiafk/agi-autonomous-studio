"""
tests.test_ui_contrast - WCAG 2.1 Accessibility & Contrast Ratio Test Suite
Validates that all theme custom properties and semantic status pill tokens
achieve WCAG 2.1 AA (min 4.5:1) and AAA (target 7:1+) contrast standards across
Day, Sunset, and Night themes.
"""

import re
import unittest
from pathlib import Path

def calculate_luminance(r: int, g: int, b: int) -> float:
    def channel(c: int) -> float:
        norm = c / 255.0
        return norm / 12.92 if norm <= 0.03928 else ((norm + 0.055) / 1.055) ** 2.4
    return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b)

def hex_to_rgb(hex_str: str) -> tuple:
    cleaned = hex_str.strip().lstrip("#")
    if len(cleaned) == 3:
        cleaned = "".join([c * 2 for c in cleaned])
    return (int(cleaned[0:2], 16), int(cleaned[2:4], 16), int(cleaned[4:6], 16))

def calculate_contrast(color1_hex: str, color2_hex: str) -> float:
    l1 = calculate_luminance(*hex_to_rgb(color1_hex))
    l2 = calculate_luminance(*hex_to_rgb(color2_hex))
    return (max(l1, l2) + 0.05) / (min(l1, l2) + 0.05)

def parse_css_theme_vars(css_content: str, selector: str) -> dict:
    pattern = rf"{re.escape(selector)}\s*\{{([^}}]+)\}}"
    match = re.search(pattern, css_content, re.DOTALL)
    if not match:
        return {}
    body = match.group(1)
    tokens = {}
    for line in body.splitlines():
        line = line.strip()
        if line.startswith("--") and ":" in line:
            parts = line.split(":", 1)
            var_name = parts[0].strip()
            var_val = parts[1].split(";")[0].strip()
            tokens[var_name] = var_val
    return tokens

class TestUIThemeContrast(unittest.TestCase):

    @classmethod
    def setUpClass(cls):
        style_path = Path(__file__).resolve().parent.parent / "public" / "style.css"
        cls.css_content = style_path.read_text(encoding="utf-8")
        cls.day_tokens = parse_css_theme_vars(cls.css_content, ":root, body.theme-day")
        cls.sunset_tokens = parse_css_theme_vars(cls.css_content, "body.theme-sunset")
        cls.night_tokens = parse_css_theme_vars(cls.css_content, "body.theme-night")

    def test_tokens_present(self):
        for name, tokens in [("Day", self.day_tokens), ("Sunset", self.sunset_tokens), ("Night", self.night_tokens)]:
            self.assertIn("--surface-card", tokens, f"Missing --surface-card in {name}")
            self.assertIn("--text-primary", tokens, f"Missing --text-primary in {name}")
            self.assertIn("--text-secondary", tokens, f"Missing --text-secondary in {name}")
            self.assertIn("--text-muted", tokens, f"Missing --text-muted in {name}")
            self.assertIn("--pill-focus-bg", tokens, f"Missing --pill-focus-bg in {name}")
            self.assertIn("--pill-focus-text", tokens, f"Missing --pill-focus-text in {name}")
            self.assertIn("--pill-idle-bg", tokens, f"Missing --pill-idle-bg in {name}")
            self.assertIn("--pill-idle-text", tokens, f"Missing --pill-idle-text in {name}")
            self.assertIn("--pill-working-bg", tokens, f"Missing --pill-working-bg in {name}")
            self.assertIn("--pill-working-text", tokens, f"Missing --pill-working-text in {name}")

    def test_day_theme_contrast(self):
        t = self.day_tokens
        surface = t["--surface-card"]

        # Primary text (Target AAA >= 7.0:1)
        cr_primary = calculate_contrast(t["--text-primary"], surface)
        self.assertGreaterEqual(cr_primary, 10.0, f"Day primary text contrast {cr_primary:.2f} < 10.0")

        # Secondary text (Target AAA >= 7.0:1)
        cr_sec = calculate_contrast(t["--text-secondary"], surface)
        self.assertGreaterEqual(cr_sec, 7.0, f"Day secondary text contrast {cr_sec:.2f} < 7.0")

        # Muted text (Target AA >= 4.5:1)
        cr_muted = calculate_contrast(t["--text-muted"], surface)
        self.assertGreaterEqual(cr_muted, 4.5, f"Day muted text contrast {cr_muted:.2f} < 4.5")

        # Status pills (Focus, Idle, Working, Resting, Paused)
        self.assertGreaterEqual(calculate_contrast(t["--pill-focus-text"], t["--pill-focus-bg"]), 7.0)
        self.assertGreaterEqual(calculate_contrast(t["--pill-idle-text"], t["--pill-idle-bg"]), 7.0)
        self.assertGreaterEqual(calculate_contrast(t["--pill-working-text"], t["--pill-working-bg"]), 4.5)
        self.assertGreaterEqual(calculate_contrast(t["--pill-resting-text"], t["--pill-resting-bg"]), 4.5)
        self.assertGreaterEqual(calculate_contrast(t["--pill-paused-text"], t["--pill-paused-bg"]), 4.5)

    def test_sunset_theme_contrast(self):
        t = self.sunset_tokens
        surface = t["--surface-card"]

        # Primary text (Target AAA >= 7.0:1)
        cr_primary = calculate_contrast(t["--text-primary"], surface)
        self.assertGreaterEqual(cr_primary, 10.0, f"Sunset primary text contrast {cr_primary:.2f} < 10.0")

        # Secondary text (Target AAA >= 7.0:1)
        cr_sec = calculate_contrast(t["--text-secondary"], surface)
        self.assertGreaterEqual(cr_sec, 7.0, f"Sunset secondary text contrast {cr_sec:.2f} < 7.0")

        # Muted text (Target AA >= 4.5:1)
        cr_muted = calculate_contrast(t["--text-muted"], surface)
        self.assertGreaterEqual(cr_muted, 4.5, f"Sunset muted text contrast {cr_muted:.2f} < 4.5")

        # Status pills (Focus, Idle, Working, Resting, Paused)
        self.assertGreaterEqual(calculate_contrast(t["--pill-focus-text"], t["--pill-focus-bg"]), 7.0)
        self.assertGreaterEqual(calculate_contrast(t["--pill-idle-text"], t["--pill-idle-bg"]), 7.0)
        self.assertGreaterEqual(calculate_contrast(t["--pill-working-text"], t["--pill-working-bg"]), 4.5)
        self.assertGreaterEqual(calculate_contrast(t["--pill-resting-text"], t["--pill-resting-bg"]), 4.5)
        self.assertGreaterEqual(calculate_contrast(t["--pill-paused-text"], t["--pill-paused-bg"]), 4.5)

    def test_night_theme_contrast(self):
        t = self.night_tokens
        surface = t["--surface-card"]

        # Primary text (Target AAA >= 7.0:1)
        cr_primary = calculate_contrast(t["--text-primary"], surface)
        self.assertGreaterEqual(cr_primary, 10.0, f"Night primary text contrast {cr_primary:.2f} < 10.0")

        # Secondary text (Target AAA >= 7.0:1)
        cr_sec = calculate_contrast(t["--text-secondary"], surface)
        self.assertGreaterEqual(cr_sec, 7.0, f"Night secondary text contrast {cr_sec:.2f} < 7.0")

        # Muted text (Target AA >= 4.5:1)
        cr_muted = calculate_contrast(t["--text-muted"], surface)
        self.assertGreaterEqual(cr_muted, 4.5, f"Night muted text contrast {cr_muted:.2f} < 4.5")

        # Status pills (Focus, Idle, Working, Resting, Paused)
        self.assertGreaterEqual(calculate_contrast(t["--pill-focus-text"], t["--pill-focus-bg"]), 7.0)
        self.assertGreaterEqual(calculate_contrast(t["--pill-idle-text"], t["--pill-idle-bg"]), 7.0)
        self.assertGreaterEqual(calculate_contrast(t["--pill-working-text"], t["--pill-working-bg"]), 4.5)
        self.assertGreaterEqual(calculate_contrast(t["--pill-resting-text"], t["--pill-resting-bg"]), 4.5)
        self.assertGreaterEqual(calculate_contrast(t["--pill-paused-text"], t["--pill-paused-bg"]), 4.5)

if __name__ == "__main__":
    unittest.main()
