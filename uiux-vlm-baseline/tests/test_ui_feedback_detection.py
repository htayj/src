import sys
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from ui_feedback_detection import build_components, detect_components


class UiFeedbackDetectionTest(unittest.TestCase):
    def make_image(self):
        img = Image.new("RGB", (420, 260), (24, 28, 38))
        d = ImageDraw.Draw(img)
        d.rounded_rectangle((40, 40, 180, 96), radius=12, fill=(37, 99, 235))
        d.rounded_rectangle((220, 40, 360, 96), radius=12, fill=(37, 99, 235))
        d.rounded_rectangle((40, 140, 180, 230), radius=14, fill=(52, 61, 82))
        d.rounded_rectangle((220, 140, 360, 230), radius=14, fill=(52, 61, 82))
        return img

    def test_detects_no_badge_components(self):
        comps = detect_components(self.make_image())
        self.assertGreaterEqual(len(comps), 2)
        self.assertTrue(any(c.role == "button" for c in comps))

    def test_spec_boxes_are_preserved(self):
        img = self.make_image()
        spec = {"components": [{"id":"primary", "role":"button", "box":[40,40,180,96]}]}
        comps, diag = build_components(img, spec)
        by_id = {c.id: c for c in comps}
        self.assertEqual(by_id["primary"].box, [40, 40, 180, 96])
        self.assertEqual(by_id["primary"].source, "spec")

    def test_selector_matches_role(self):
        img = self.make_image()
        spec = {"components": [{"id":"buttons", "selector":{"role":"button"}}]}
        comps, _diag = build_components(img, spec)
        self.assertTrue(any(c.id.startswith("buttons") for c in comps))


if __name__ == "__main__":
    unittest.main()
