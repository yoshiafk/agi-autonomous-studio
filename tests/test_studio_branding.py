"""
Antigravity Autonomous Studio - Branding & Icon Contract Tests
Verifies official Antigravity app icons, favicons, PWA manifest, and header branding.
"""

import json
import re
import unittest
from pathlib import Path
from PIL import Image

REPO_ROOT = Path(__file__).resolve().parent.parent
PUBLIC_DIR = REPO_ROOT / "public"
ASSETS_DIR = PUBLIC_DIR / "assets"


class TestStudioBranding(unittest.TestCase):
    """Test suite ensuring proper Antigravity branding and icon assets."""

    def test_official_icon_assets_exist(self):
        """Verify all standard Antigravity icons and favicons exist with non-zero size."""
        required_assets = [
            ASSETS_DIR / "antigravity-icon.png",
            ASSETS_DIR / "logo.svg",
            ASSETS_DIR / "favicon.ico",
            PUBLIC_DIR / "favicon.ico",
            PUBLIC_DIR / "apple-touch-icon.png",
            ASSETS_DIR / "icon-16.png",
            ASSETS_DIR / "icon-32.png",
            ASSETS_DIR / "icon-48.png",
            ASSETS_DIR / "icon-64.png",
            ASSETS_DIR / "icon-128.png",
            ASSETS_DIR / "icon-192.png",
            ASSETS_DIR / "icon-256.png",
            ASSETS_DIR / "icon-512.png",
        ]
        for asset in required_assets:
            self.assertTrue(asset.is_file(), f"Missing required icon asset: {asset.name}")
            self.assertGreater(asset.stat().st_size, 100, f"Asset {asset.name} is too small or empty")

    def test_antigravity_icon_dimensions_and_mode(self):
        """Verify the master antigravity-icon.png is 256x256 RGBA."""
        icon_path = ASSETS_DIR / "antigravity-icon.png"
        with Image.open(icon_path) as im:
            self.assertEqual(im.size, (256, 256), "Master icon must be exactly 256x256")
            self.assertEqual(im.mode, "RGBA", "Master icon must preserve RGBA transparency")

    def test_favicon_ico_validity(self):
        """Verify public/favicon.ico is a valid ICO file and contains multiple resolutions."""
        favicon_path = PUBLIC_DIR / "favicon.ico"
        with Image.open(favicon_path) as im:
            self.assertEqual(im.format, "ICO", "favicon.ico must be a valid ICO container")

    def test_index_html_branding_contracts(self):
        """Verify index.html contains proper favicon links and the navbar icon image."""
        html_path = PUBLIC_DIR / "index.html"
        content = html_path.read_text(encoding="utf-8")

        self.assertIn('<link rel="icon" type="image/svg+xml" href="/assets/logo.svg">', content)
        self.assertIn('<link rel="shortcut icon" href="/favicon.ico">', content)
        self.assertIn('<link rel="apple-touch-icon"', content)
        self.assertIn('/assets/antigravity-icon.png', content)
        self.assertNotIn('>AG</div>', content, "Outdated generic text badge AG must be replaced by proper icon")

    def test_manifest_icons_contract(self):
        """Verify manifest.json declares standard PWA icon resolutions."""
        manifest_path = PUBLIC_DIR / "manifest.json"
        data = json.loads(manifest_path.read_text(encoding="utf-8"))

        self.assertIn("icons", data)
        srcs = [icon["src"] for icon in data["icons"]]
        self.assertIn("/assets/icon-192.png", srcs)
        self.assertIn("/assets/icon-512.png", srcs)
        self.assertIn("/assets/antigravity-icon.png", srcs)
        self.assertIn("/assets/logo.svg", srcs)

    def test_service_worker_asset_caching(self):
        """Verify service worker STATIC_ASSETS includes new branding assets."""
        sw_path = PUBLIC_DIR / "sw.js"
        content = sw_path.read_text(encoding="utf-8")

        self.assertIn("/assets/antigravity-icon.png", content)
        self.assertIn("/favicon.ico", content)
        self.assertIn("agi-studio-cache-v3", content)

    def test_zero_emoji_compliance(self):
        """Strict compliance check to ensure no emoji characters in modified branding files."""
        emoji_pattern = re.compile(
            r"[\U00010000-\U0010ffff]|[\u2600-\u27ff]|[\u2300-\u23ff]|[\u2b50-\u2b55]"
        )
        checked_files = [
            PUBLIC_DIR / "index.html",
            PUBLIC_DIR / "manifest.json",
            PUBLIC_DIR / "sw.js",
            Path(__file__)
        ]
        for f in checked_files:
            text = f.read_text(encoding="utf-8")
            matches = emoji_pattern.findall(text)
            self.assertEqual(len(matches), 0, f"Found emojis in {f.name}: {matches}")


if __name__ == "__main__":
    unittest.main()
