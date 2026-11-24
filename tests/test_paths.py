import unittest
import tempfile
import os
from pathlib import Path
from studio.paths import resolve_antigravity_paths, get_public_dir

class TestPathsDiscovery(unittest.TestCase):

    def test_custom_data_override(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            custom_data = Path(tmpdir) / "antigravity"
            custom_data.mkdir()
            custom_config = Path(tmpdir) / "config"
            custom_config.mkdir()

            d, c = resolve_antigravity_paths(str(custom_data), str(custom_config))
            self.assertEqual(d, custom_data)
            self.assertEqual(c, custom_config)

    def test_env_var_override(self):
        with tempfile.TemporaryDirectory() as tmpdir:
            env_data = Path(tmpdir) / "env_antigravity"
            env_data.mkdir()
            env_config = Path(tmpdir) / "env_config"
            env_config.mkdir()

            old_d = os.environ.get("ANTIGRAVITY_DATA_DIR")
            old_c = os.environ.get("ANTIGRAVITY_CONFIG_DIR")
            try:
                os.environ["ANTIGRAVITY_DATA_DIR"] = str(env_data)
                os.environ["ANTIGRAVITY_CONFIG_DIR"] = str(env_config)

                d, c = resolve_antigravity_paths()
                self.assertEqual(d, env_data)
                self.assertEqual(c, env_config)
            finally:
                if old_d is not None:
                    os.environ["ANTIGRAVITY_DATA_DIR"] = old_d
                else:
                    os.environ.pop("ANTIGRAVITY_DATA_DIR", None)
                if old_c is not None:
                    os.environ["ANTIGRAVITY_CONFIG_DIR"] = old_c
                else:
                    os.environ.pop("ANTIGRAVITY_CONFIG_DIR", None)

    def test_get_public_dir_exists(self):
        pub_dir = get_public_dir()
        self.assertTrue(pub_dir.is_dir())
        self.assertTrue((pub_dir / "index.html").exists())
        self.assertTrue((pub_dir / "manifest.json").exists())

if __name__ == "__main__":
    unittest.main()
