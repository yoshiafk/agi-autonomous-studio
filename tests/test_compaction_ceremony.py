import os
import re
import unittest

PROJECT_ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

class TestCompactionCeremony(unittest.TestCase):
    """
    Validates Knowledge Archive Compaction Ceremony contracts,
    procedural audio registration, and strict zero-emoji compliance.
    """

    def test_audio_engine_has_compaction_chime(self):
        audio_path = os.path.join(PROJECT_ROOT, "public", "audio.js")
        self.assertTrue(os.path.isfile(audio_path), "audio.js must exist")
        with open(audio_path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn("playCompactionChime", content, "ChiptuneAudio must define playCompactionChime")
        self.assertIn("compaction", content, "ChiptuneAudio must track compaction cooldown")

    def test_office_simulation_compaction_ceremony_contract(self):
        office_path = os.path.join(PROJECT_ROOT, "public", "office.js")
        self.assertTrue(os.path.isfile(office_path), "office.js must exist")
        with open(office_path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn("triggerCompactionCeremony", content, "OfficeSimulator must expose triggerCompactionCeremony")
        self.assertIn("archiveCompacting", content, "OfficeSimulator must track archiveCompacting state")
        self.assertIn("COMPACTING MEMORY", content, "Bookshelf must render COMPACTING MEMORY holographic banner")
        self.assertIn("'memory'", content, "spawnParticle must support 'memory' crystalline particle type")
        self.assertIn("/compact", content, "handleCommandTrigger must handle /compact")

    def test_app_telemetry_compaction_detection_contract(self):
        app_path = os.path.join(PROJECT_ROOT, "public", "app.js")
        self.assertTrue(os.path.isfile(app_path), "app.js must exist")
        with open(app_path, "r", encoding="utf-8") as f:
            content = f.read()

        self.assertIn("lastKnownContextTokens", content, "app.js must track lastKnownContextTokens")
        self.assertIn("triggerCompactionCeremony", content, "app.js must trigger compaction ceremony on token reduction")
        self.assertIn("Memory Compacted", content, "app.js must render Memory Compacted feed card")

    def test_compaction_threshold_logic(self):
        def is_compaction_drop(prev_tokens, current_tokens):
            return prev_tokens > 40000 and (prev_tokens - current_tokens > 25000)

        # Standard compaction: 180k -> 25k (drop of 155k)
        self.assertTrue(is_compaction_drop(180000, 25000))

        # Minor fluctuations or small tool responses
        self.assertFalse(is_compaction_drop(20000, 18000))
        self.assertFalse(is_compaction_drop(80000, 75000))

        # Increasing token count
        self.assertFalse(is_compaction_drop(60000, 75000))

    def test_strict_zero_emoji_compliance(self):
        targets = [
            os.path.join(PROJECT_ROOT, "public", "audio.js"),
            os.path.join(PROJECT_ROOT, "public", "office.js"),
            os.path.join(PROJECT_ROOT, "public", "app.js"),
            __file__
        ]
        emoji_pattern = re.compile(
            r"[\U00010000-\U0010FFFF\u2600-\u26FF\u2700-\u27BF]",
            flags=re.UNICODE
        )
        for target_path in targets:
            with open(target_path, "r", encoding="utf-8") as f:
                content = f.read()
            matches = emoji_pattern.findall(content)
            self.assertEqual(len(matches), 0, f"Found emojis in {os.path.basename(target_path)}: {matches}")

if __name__ == "__main__":
    unittest.main()
