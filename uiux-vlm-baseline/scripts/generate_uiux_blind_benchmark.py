#!/usr/bin/env python3
"""Generate a harder synthetic UI/UX benchmark without measurement/defect callouts.

These cases avoid visible guide lines, pixel annotations, or labels like "phase seam".
They still include A/B/C badges so questions can refer to components.
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "blind_images"
MANIFEST = ROOT / "data" / "blind_manifest.jsonl"
W, H = 1280, 768


def font(size: int, bold: bool = False):
    p = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
    return ImageFont.truetype(p, size) if Path(p).exists() else ImageFont.load_default()

F_TITLE = font(32, True)
F_LABEL = font(40, True)
F_BODY = font(24)
F_SMALL = font(16)


def base(title: str, subtitle: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGB", (W, H), (24, 26, 34))
    d = ImageDraw.Draw(img)
    # subtle grid, no measurement cue
    for x in range(0, W, 32):
        d.line([(x, 0), (x, H)], fill=(31, 34, 44), width=1)
    for y in range(0, H, 32):
        d.line([(0, y), (W, y)], fill=(31, 34, 44), width=1)
    d.rounded_rectangle((96, 76, W - 96, H - 70), radius=28, fill=(39, 43, 55), outline=(84, 91, 112), width=2)
    d.text((126, 106), title, fill=(238, 242, 248), font=F_TITLE)
    d.text((128, 150), subtitle, fill=(172, 183, 202), font=F_BODY)
    return img, d


def badge(d, x: int, y: int, label: str):
    d.ellipse((x, y, x + 50, y + 50), fill=(250, 250, 250), outline=(18, 20, 27), width=2)
    tw = d.textlength(label, font=F_LABEL)
    d.text((x + 25 - tw / 2, y + 2), label, fill=(20, 25, 35), font=F_LABEL)


def button(d, rect, label, fill=(50, 116, 216), radius=20, texture=True):
    x1, y1, x2, y2 = rect
    d.rounded_rectangle((x1 + 6, y1 + 8, x2 + 6, y2 + 8), radius=radius, fill=(18, 20, 27))
    d.rounded_rectangle(rect, radius=radius, fill=fill, outline=(169, 205, 255), width=3)
    if texture:
        stripe = tuple(min(255, c + 26) for c in fill)
        for k in range(x1 - (y2 - y1), x2 + (y2 - y1), 24):
            d.line([(k, y2 - 6), (k + (y2 - y1), y1 + 6)], fill=stripe, width=4)
        d.rounded_rectangle(rect, radius=radius, outline=(169, 205, 255), width=3)
    badge(d, x1 - 18, y1 - 20, label)


def tile_pattern(size=48):
    p = Image.new("RGB", (size, size), (42, 105, 96))
    d = ImageDraw.Draw(p)
    d.line((0, size - 1, size - 1, 0), fill=(91, 190, 170), width=5)
    d.line((-size // 2, size - 1, size - 1, -size // 2), fill=(62, 143, 128), width=5)
    d.ellipse((12, 12, 22, 22), fill=(198, 255, 230))
    d.ellipse((34, 33, 42, 41), fill=(22, 64, 58))
    return p


def fill_tiled(img, rect, broken: bool):
    x1, y1, x2, y2 = rect
    p = tile_pattern()
    region = Image.new("RGB", (x2 - x1, y2 - y1), (0, 0, 0))
    for y in range(0, region.height, p.height):
        for x in range(0, region.width, p.width):
            tile = p
            if broken and x >= region.width // 2:
                tile = Image.new("RGB", p.size)
                tile.paste(p.crop((9, 0, p.width, p.height)), (0, 0))
                tile.paste(p.crop((0, 0, 9, p.height)), (p.width - 9, 0))
            region.paste(tile, (x, y))
    mask = Image.new("L", region.size, 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((0, 0, region.width - 1, region.height - 1), radius=24, fill=255)
    img.paste(region, (x1, y1), mask)


def footer(d, case_id):
    d.text((108, H - 48), f"Synthetic UI/UX blind benchmark • {case_id}", fill=(119, 130, 151), font=F_SMALL)


def save(img, case_id):
    path = OUT_DIR / f"{case_id}.png"
    img.save(path)
    return str(path.relative_to(ROOT))


def case_alignment(case_id: str, offset: int) -> dict[str, Any]:
    img, d = base("Button alignment check", "Are buttons A and B horizontally aligned along their top edges?")
    a = (282, 332, 542, 434)
    b = (720, 332 + offset, 980, 434 + offset)
    button(d, a, "A")
    button(d, b, "B")
    footer(d, case_id)
    return {"id": case_id, "image": save(img, case_id), "category": "blind_alignment", "question": "Are buttons A and B horizontally aligned along their top edges? Answer yes or no, and if no estimate the vertical offset in pixels.", "expected_answer": "yes" if offset == 0 else "no", "expected_offset_px": offset, "scoring": "yes_no_offset"}


def case_texture(case_id: str, broken: bool) -> dict[str, Any]:
    img, d = base("Texture tiling check", "Does the texture tile cleanly on button C, without visible seams?")
    c = (370, 292, 910, 490)
    d.rounded_rectangle((c[0] + 8, c[1] + 10, c[2] + 8, c[3] + 10), radius=24, fill=(18, 20, 27))
    fill_tiled(img, c, broken)
    d.rounded_rectangle(c, radius=24, outline=(180, 255, 235), width=4)
    badge(d, c[0] - 18, c[1] - 20, "C")
    footer(d, case_id)
    return {"id": case_id, "image": save(img, case_id), "category": "blind_texture_tiling", "question": "Does the texture tile correctly on button C without a visible seam? Answer yes or no.", "expected_answer": "no" if broken else "yes", "expected_defect": "phase seam" if broken else "none", "scoring": "yes_no"}


def case_icon(case_id: str, dx: int, dy: int) -> dict[str, Any]:
    img, d = base("Icon centering check", "Is the white plus icon centered inside circular button A?")
    cx, cy, r = 640, 376, 92
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(37, 99, 235), outline=(191, 219, 254), width=4)
    ix, iy = cx + dx, cy + dy
    d.rounded_rectangle((ix - 13, iy - 50, ix + 13, iy + 50), radius=7, fill=(255, 255, 255))
    d.rounded_rectangle((ix - 50, iy - 13, ix + 50, iy + 13), radius=7, fill=(255, 255, 255))
    badge(d, cx - r - 18, cy - r - 20, "A")
    footer(d, case_id)
    off = dx != 0 or dy != 0
    return {"id": case_id, "image": save(img, case_id), "category": "blind_icon_centering", "question": "Is the white plus icon centered inside circular button A? Answer yes or no, and mention the direction if off-center.", "expected_answer": "no" if off else "yes", "expected_offset_x_px": dx, "expected_offset_y_px": dy, "scoring": "yes_no_offset"}


def case_state(case_id: str, bad: bool) -> dict[str, Any]:
    img, d = base("Button state consistency", "Is hover state B visually consistent with default state A?")
    a = (300, 310, 560, 420)
    b = (720, 310, 980, 420)
    button(d, a, "A", fill=(220, 78, 111), radius=22)
    button(d, b, "B", fill=(245, 122, 155) if not bad else (245, 122, 80), radius=22 if not bad else 6)
    d.text((314, 456), "default", fill=(181, 192, 211), font=F_BODY)
    d.text((734, 456), "hover", fill=(181, 192, 211), font=F_BODY)
    footer(d, case_id)
    return {"id": case_id, "image": save(img, case_id), "category": "blind_state_consistency", "question": "Is hover state B visually consistent with default state A? Answer yes or no.", "expected_answer": "no" if bad else "yes", "expected_defect": "corner radius and hue mismatch" if bad else "none", "scoring": "yes_no"}


def main():
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    cases = [
        case_alignment("blind_align_ok", 0),
        case_alignment("blind_align_bad_06", 6),
        case_alignment("blind_align_bad_12", 12),
        case_texture("blind_texture_ok", False),
        case_texture("blind_texture_bad", True),
        case_icon("blind_icon_ok", 0, 0),
        case_icon("blind_icon_bad", 14, -8),
        case_state("blind_state_ok", False),
        case_state("blind_state_bad", True),
    ]
    with MANIFEST.open("w", encoding="utf-8") as f:
        for c in cases:
            f.write(json.dumps(c) + "\n")
    print(f"Wrote {len(cases)} blind cases to {MANIFEST}")


if __name__ == "__main__":
    main()
