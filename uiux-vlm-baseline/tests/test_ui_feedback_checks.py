import sys
import unittest
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "scripts"))

from ui_feedback_checks import run_check
from ui_feedback_types import DetectedComponent


class UiFeedbackChecksTest(unittest.TestCase):
    def setUp(self):
        self.img = Image.new("RGB", (400, 260), (30, 34, 44))
        d = ImageDraw.Draw(self.img)
        d.rounded_rectangle((40, 40, 140, 90), radius=10, fill=(40, 100, 220))
        d.rounded_rectangle((180, 44, 280, 94), radius=10, fill=(40, 100, 220))
        d.text((68, 55), "OK", fill=(255, 255, 255))
        d.text((208, 59), "OK", fill=(255, 255, 255))
        self.components = {
            "a": DetectedComponent("a", [40, 40, 140, 90], "button"),
            "b": DetectedComponent("b", [180, 44, 280, 94], "button"),
            "c": DetectedComponent("c", [340, 40, 390, 90], "button"),
            "panel": DetectedComponent("panel", [40, 120, 220, 220], "panel"),
            "content": DetectedComponent("content", [70, 145, 190, 195], "content"),
        }

    def test_alignment_fail(self):
        r = run_check({"id":"align", "type":"alignment", "targets":["a","b"], "edge":"top", "tolerance_px":2}, self.components, self.img)
        self.assertEqual(r.status, "fail")

    def test_size_pass(self):
        r = run_check({"id":"size", "type":"size_consistency", "targets":["a","b"], "tolerance_px":6}, self.components, self.img)
        self.assertEqual(r.status, "pass")

    def test_spacing_fail(self):
        r = run_check({"id":"space", "type":"spacing_consistency", "targets":["a","b","c"], "axis":"x", "tolerance_px":5}, self.components, self.img)
        self.assertEqual(r.status, "fail")

    def test_padding_pass(self):
        r = run_check({"id":"pad", "type":"padding_balance", "target":"panel", "content":"content", "tolerance_px":12}, self.components, self.img)
        self.assertEqual(r.status, "pass")

    def test_centering_explicit_fail(self):
        self.components["off"] = DetectedComponent("off", [46, 48, 70, 72], "icon")
        r = run_check({"id":"center", "type":"content_centering", "target":"a", "content":"off", "tolerance_px":5}, self.components, self.img)
        self.assertEqual(r.status, "fail")

    def test_contrast_fail_for_low_threshold_sample(self):
        r = run_check({"id":"contrast", "type":"contrast", "target":"a", "min_ratio":7}, self.components, self.img)
        self.assertIn(r.status, {"fail", "needs_review"})


if __name__ == "__main__":
    unittest.main()
