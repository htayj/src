#!/usr/bin/env python3
"""Generate no-badge local sample screenshots for the generic UI feedback tool."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "local_feedback_sample"
W, H = 1120, 720


def font(size: int, bold: bool = False):
    p = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
    return ImageFont.truetype(str(p), size) if p.exists() else ImageFont.load_default()

F_TITLE = font(28, True)
F_UI = font(20, True)
F_BODY = font(18)


def tile_pattern(size: int = 42):
    p = Image.new("RGB", (size, size), (46, 110, 98))
    d = ImageDraw.Draw(p)
    d.line((0, size - 1, size - 1, 0), fill=(102, 210, 185), width=5)
    d.ellipse((9, 10, 18, 19), fill=(205, 255, 235))
    d.rectangle((30, 28, 37, 35), fill=(21, 68, 58))
    return p


def fill_texture(img: Image.Image, rect, seam: bool = False):
    x1, y1, x2, y2 = rect
    pat = tile_pattern()
    region = Image.new("RGB", (x2 - x1, y2 - y1))
    split = region.width // 2
    for y in range(0, region.height, pat.height):
        for x in range(0, region.width, pat.width):
            tile = pat
            if seam and x >= split:
                shift = 9
                tile = Image.new("RGB", pat.size)
                tile.paste(pat.crop((shift, 0, pat.width, pat.height)), (0, 0))
                tile.paste(pat.crop((0, 0, shift, pat.height)), (pat.width - shift, 0))
            region.paste(tile, (x, y))
    img.paste(region, (x1, y1))


def draw_button(d, rect, text, fill=(37, 99, 235), text_fill=(255, 255, 255)):
    d.rounded_rectangle((rect[0]+4, rect[1]+6, rect[2]+4, rect[3]+6), radius=14, fill=(18, 23, 34))
    d.rounded_rectangle(rect, radius=14, fill=fill, outline=(170, 205, 255), width=2)
    tw = d.textlength(text, font=F_UI)
    d.text((rect[0] + (rect[2]-rect[0]-tw)/2, rect[1] + 18), text, fill=text_fill, font=F_UI)


def draw_card(d, rect, title="Card"):
    d.rounded_rectangle((rect[0]+4, rect[1]+6, rect[2]+4, rect[3]+6), radius=18, fill=(18, 23, 34))
    d.rounded_rectangle(rect, radius=18, fill=(52, 61, 82), outline=(100, 116, 145), width=2)
    d.text((rect[0]+24, rect[1]+22), title, fill=(235, 241, 250), font=F_UI)
    d.rounded_rectangle((rect[0]+24, rect[1]+70, rect[2]-24, rect[1]+84), radius=6, fill=(92, 108, 135))
    d.rounded_rectangle((rect[0]+24, rect[1]+104, rect[2]-58, rect[1]+118), radius=6, fill=(82, 96, 122))


def make(ok: bool) -> tuple[Image.Image, dict[str, Any]]:
    img = Image.new("RGB", (W, H), (24, 28, 38))
    d = ImageDraw.Draw(img)
    d.rounded_rectangle((56, 48, W-56, H-50), radius=26, fill=(38, 45, 60), outline=(80, 93, 116), width=2)
    d.text((86, 78), "Local UI feedback sample", fill=(245, 248, 252), font=F_TITLE)
    d.text((88, 116), "No A/B/C badges; spec-targeted checks plus auto detection.", fill=(180, 192, 210), font=F_BODY)

    b1 = (120, 176, 300, 238)
    b2 = (340, 176 if ok else 188, 520 if ok else 548, 238 if ok else 250)
    draw_button(d, b1, "Save")
    draw_button(d, b2, "Cancel")

    gap = 44
    c1 = (120, 288, 320, 468)
    c2 = (120 + 200 + gap, 288, 120 + 400 + gap, 468)
    c3 = (120 + 400 + 2*gap + (0 if ok else 28), 288, 120 + 600 + 2*gap + (0 if ok else 28), 468)
    for i, c in enumerate([c1, c2, c3], start=1):
        draw_card(d, c, f"Metric {i}")

    panel = (760, 172, 1010, 378)
    d.rounded_rectangle(panel, radius=20, fill=(50, 58, 76), outline=(105, 122, 150), width=2)
    inner = (panel[0]+38 + (0 if ok else 18), panel[1]+34, panel[2]-38, panel[3]-34 + (0 if ok else -10))
    d.rounded_rectangle(inner, radius=14, fill=(30, 36, 50), outline=(95, 110, 138), width=2)
    d.text((inner[0]+18, inner[1]+18), "Balanced content", fill=(210, 220, 235), font=F_BODY)

    icon_btn = (805, 430, 925, 550)
    d.ellipse(icon_btn, fill=(124, 58, 237), outline=(220, 210, 255), width=3)
    cx = (icon_btn[0]+icon_btn[2])//2 + (0 if ok else 12)
    cy = (icon_btn[1]+icon_btn[3])//2 + (0 if ok else -10)
    d.rounded_rectangle((cx-9, cy-34, cx+9, cy+34), radius=5, fill=(255,255,255))
    d.rounded_rectangle((cx-34, cy-9, cx+34, cy+9), radius=5, fill=(255,255,255))

    texture = (120, 520, 520, 626)
    fill_texture(img, texture, seam=not ok)
    d.rounded_rectangle(texture, radius=0, outline=(190, 255, 235), width=2)

    low = (570, 520, 730, 582)
    draw_button(d, low, "Low contrast", fill=(80, 88, 108), text_fill=(150, 154, 166) if not ok else (255,255,255))

    comps = [
        {"id":"primary", "role":"button", "box":list(b1)},
        {"id":"secondary", "role":"button", "box":list(b2)},
        {"id":"card1", "role":"card", "box":list(c1)},
        {"id":"card2", "role":"card", "box":list(c2)},
        {"id":"card3", "role":"card", "box":list(c3)},
        {"id":"panel", "role":"panel", "box":list(panel)},
        {"id":"panel_content", "role":"content", "box":list(inner)},
        {"id":"icon_button", "role":"button", "box":list(icon_btn)},
        {"id":"texture", "role":"texture", "box":list(texture)},
        {"id":"contrast_button", "role":"button", "box":list(low)},
    ]
    checks = [
        {"id":"buttons-top", "type":"alignment", "targets":["primary","secondary"], "edge":"top", "tolerance_px":3},
        {"id":"buttons-size", "type":"size_consistency", "targets":["primary","secondary"], "dimensions":["width","height"], "tolerance_px":6},
        {"id":"cards-spacing", "type":"spacing_consistency", "targets":["card1","card2","card3"], "axis":"x", "tolerance_px":8},
        {"id":"panel-padding", "type":"padding_balance", "target":"panel", "content":"panel_content", "tolerance_px":8},
        {"id":"icon-center", "type":"content_centering", "target":"icon_button", "content":"auto", "tolerance_px":6},
        {"id":"texture-seam", "type":"texture_continuity", "target":"texture", "threshold":8.0},
        {"id":"contrast", "type":"contrast", "target":"contrast_button", "min_ratio":4.5},
    ]
    return img, {"version":1, "id":"feedback_ok" if ok else "feedback_issues", "components": comps, "checks": checks, "auto_checks":{"enabled": False}}


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    for ok in [True, False]:
        img, spec = make(ok)
        stem = "feedback_ok" if ok else "feedback_issues"
        img.save(OUT / f"{stem}.png")
        (OUT / f"{stem}_spec.json").write_text(json.dumps(spec, indent=2), encoding="utf-8")
        if not ok:
            (OUT / "feedback_spec.json").write_text(json.dumps(spec, indent=2), encoding="utf-8")
    print(f"Wrote samples to {OUT}")


if __name__ == "__main__":
    main()
