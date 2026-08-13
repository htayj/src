import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]


class UiFeedbackCliTest(unittest.TestCase):
    def test_cli_outputs_files(self):
        with tempfile.TemporaryDirectory() as td:
            tmp = Path(td)
            img_path = tmp / "ui.png"
            img = Image.new("RGB", (240, 160), (24, 28, 38))
            d = ImageDraw.Draw(img)
            d.rounded_rectangle((30, 40, 120, 92), radius=10, fill=(37, 99, 235))
            d.text((58, 57), "OK", fill=(255, 255, 255))
            img.save(img_path)
            spec_path = tmp / "spec.json"
            spec_path.write_text(json.dumps({"version":1, "components":[{"id":"button", "role":"button", "box":[30,40,120,92]}], "checks":[{"id":"contrast", "type":"contrast", "target":"button", "min_ratio":3}], "auto_checks":{"enabled":False}}))
            out_json = tmp / "report.json"
            out_md = tmp / "report.md"
            ann = tmp / "ann.png"
            subprocess.run([sys.executable, str(ROOT / "scripts" / "ui_feedback_analyzer.py"), "--image", "ui.png", "--spec", "spec.json", "--out-json", "report.json", "--out-md", "report.md", "--annotate", "ann.png", "--fail-on", "never"], cwd=tmp, check=True)
            report = json.loads(out_json.read_text())
            self.assertIn("summary", report)
            self.assertEqual(report["artifacts"].get("markdown"), "report.md")
            self.assertEqual(report["artifacts"].get("annotation"), "ann.png")
            self.assertTrue(out_md.exists())
            self.assertTrue(ann.exists())
            with Image.open(ann) as annotated:
                self.assertEqual(annotated.size, img.size)


if __name__ == "__main__":
    unittest.main()
