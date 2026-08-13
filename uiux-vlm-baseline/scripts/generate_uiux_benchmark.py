#!/usr/bin/env python3
"""Generate a small deterministic synthetic UI/UX benchmark.

The images are intentionally simple but pixel-grounded. GPT-image/Codex generated
assets are stored under assets/gpt-image/ for provenance, but the scored cases are
rendered deterministically so we know the exact answers.
"""

from __future__ import annotations

import json
import math
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "images"
MANIFEST = ROOT / "data" / "manifest.jsonl"

W, H = 1280, 768


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    candidates = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for p in candidates:
        if Path(p).exists():
            return ImageFont.truetype(p, size)
    return ImageFont.load_default()


F_TITLE = font(34, True)
F_LABEL = font(42, True)
F_BODY = font(26)
F_SMALL = font(18)


def base_canvas(title: str, subtitle: str = "") -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGB", (W, H), (22, 24, 31))
    d = ImageDraw.Draw(img)
    # subtle grid
    for x in range(0, W, 32):
        d.line([(x, 0), (x, H)], fill=(30, 33, 42), width=1)
    for y in range(0, H, 32):
        d.line([(0, y), (W, y)], fill=(30, 33, 42), width=1)
    # main panel
    panel = (96, 76, W - 96, H - 70)
    d.rounded_rectangle(panel, radius=28, fill=(39, 43, 55), outline=(84, 91, 112), width=2)
    d.text((126, 104), title, fill=(238, 242, 248), font=F_TITLE)
    if subtitle:
        d.text((128, 150), subtitle, fill=(172, 183, 202), font=F_BODY)
    return img, d


def draw_button(
    d: ImageDraw.ImageDraw,
    rect: tuple[int, int, int, int],
    label: str,
    fill: tuple[int, int, int] = (59, 130, 246),
    outline: tuple[int, int, int] = (169, 205, 255),
    texture: bool = False,
    radius: int = 20,
) -> None:
    x1, y1, x2, y2 = rect
    d.rounded_rectangle(rect, radius=radius, fill=fill, outline=outline, width=3)
    if texture:
        # diagonal highlight stripes clipped approximately by drawing inside rounded rect margins
        stripe = tuple(min(255, c + 24) for c in fill)
        for k in range(x1 - (y2 - y1), x2 + (y2 - y1), 24):
            d.line([(k, y2 - 6), (k + (y2 - y1), y1 + 6)], fill=stripe, width=4)
        d.rounded_rectangle(rect, radius=radius, outline=outline, width=3)
    # label badge
    bx, by = x1 - 18, y1 - 20
    d.ellipse((bx, by, bx + 54, by + 54), fill=(250, 250, 250), outline=(18, 20, 27), width=2)
    tw = d.textlength(label, font=F_LABEL)
    d.text((bx + 27 - tw / 2, by + 3), label, fill=(20, 25, 35), font=F_LABEL)


def annotate_measurement(d: ImageDraw.ImageDraw, p1: tuple[int, int], p2: tuple[int, int], text: str) -> None:
    d.line([p1, p2], fill=(255, 211, 77), width=3)
    d.text(((p1[0] + p2[0]) // 2 + 8, (p1[1] + p2[1]) // 2 - 16), text, fill=(255, 231, 128), font=F_SMALL)


def add_footer(d: ImageDraw.ImageDraw, prompt_id: str) -> None:
    d.text((108, H - 48), f"Synthetic UI/UX benchmark • {prompt_id}", fill=(119, 130, 151), font=F_SMALL)


def make_alignment(case_id: str, offset: int) -> dict[str, Any]:
    img, d = base_canvas("Button alignment check", "Question: Are buttons A and B horizontally aligned along their top edges?")
    a = (282, 332, 542, 434)
    b = (720, 332 + offset, 980, 434 + offset)
    draw_button(d, a, "A", fill=(50, 116, 216), texture=True)
    draw_button(d, b, "B", fill=(50, 116, 216), texture=True)
    # top-edge guide at A's top
    d.line([(240, a[1]), (1020, a[1])], fill=(255, 211, 77), width=2)
    if offset:
        annotate_measurement(d, (1000, a[1]), (1000, b[1]), f"{abs(offset)} px")
    add_footer(d, case_id)
    path = OUT_DIR / f"{case_id}.png"
    img.save(path)
    return {
        "id": case_id,
        "image": str(path.relative_to(ROOT)),
        "category": "alignment",
        "question": "Are buttons A and B horizontally aligned along their top edges? Answer yes or no, and if no estimate the vertical offset in pixels.",
        "expected_answer": "yes" if offset == 0 else "no",
        "expected_offset_px": offset,
        "scoring": "yes_no_offset",
    }


def make_size(case_id: str, delta_w: int, delta_h: int) -> dict[str, Any]:
    img, d = base_canvas("Button size consistency", "Question: Are buttons A and B the same size?")
    a = (270, 320, 550, 430)
    b = (718, 320, 998 + delta_w, 430 + delta_h)
    draw_button(d, a, "A", fill=(124, 58, 237), texture=True)
    draw_button(d, b, "B", fill=(124, 58, 237), texture=True)
    d.text((270, 462), "A: 280×110", fill=(181, 192, 211), font=F_SMALL)
    d.text((718, 462), f"B: {280 + delta_w}×{110 + delta_h}", fill=(181, 192, 211), font=F_SMALL)
    add_footer(d, case_id)
    path = OUT_DIR / f"{case_id}.png"
    img.save(path)
    same = delta_w == 0 and delta_h == 0
    return {
        "id": case_id,
        "image": str(path.relative_to(ROOT)),
        "category": "size",
        "question": "Are buttons A and B the same size? Answer yes or no, and mention whether width or height differs.",
        "expected_answer": "yes" if same else "no",
        "expected_width_delta_px": delta_w,
        "expected_height_delta_px": delta_h,
        "scoring": "yes_no",
    }


def make_spacing(case_id: str, bad: bool) -> dict[str, Any]:
    img, d = base_canvas("Card spacing consistency", "Question: Is the horizontal spacing between cards A-B and B-C consistent?")
    y = 284
    w, h = 210, 170
    gap1 = 64
    gap2 = 64 if not bad else 91
    x1 = 242
    rects = [
        (x1, y, x1 + w, y + h),
        (x1 + w + gap1, y, x1 + 2 * w + gap1, y + h),
        (x1 + 2 * w + gap1 + gap2, y, x1 + 3 * w + gap1 + gap2, y + h),
    ]
    for lab, r, color in zip(["A", "B", "C"], rects, [(14, 165, 233), (20, 184, 166), (245, 158, 11)]):
        d.rounded_rectangle(r, radius=18, fill=(50, 56, 72), outline=color, width=3)
        bx, by = r[0] + 20, r[1] + 18
        d.text((bx, by), lab, fill=(255, 255, 255), font=F_LABEL)
        for i in range(4):
            d.rounded_rectangle((r[0] + 24, r[1] + 82 + i * 18, r[2] - 24, r[1] + 91 + i * 18), radius=5, fill=(76, 84, 104))
    annotate_measurement(d, (rects[0][2], y + h + 32), (rects[1][0], y + h + 32), f"{gap1}px")
    annotate_measurement(d, (rects[1][2], y + h + 32), (rects[2][0], y + h + 32), f"{gap2}px")
    add_footer(d, case_id)
    path = OUT_DIR / f"{case_id}.png"
    img.save(path)
    return {
        "id": case_id,
        "image": str(path.relative_to(ROOT)),
        "category": "spacing",
        "question": "Is the horizontal spacing between cards A-B and B-C consistent? Answer yes or no.",
        "expected_answer": "no" if bad else "yes",
        "expected_gap_ab_px": gap1,
        "expected_gap_bc_px": gap2,
        "scoring": "yes_no",
    }


def tile_pattern(size: int = 48) -> Image.Image:
    p = Image.new("RGB", (size, size), (42, 105, 96))
    d = ImageDraw.Draw(p)
    d.rectangle((0, 0, size - 1, size - 1), fill=(42, 105, 96))
    d.line((0, size - 1, size - 1, 0), fill=(91, 190, 170), width=5)
    d.line((-size // 2, size - 1, size - 1, -size // 2), fill=(62, 143, 128), width=5)
    d.ellipse((12, 12, 22, 22), fill=(198, 255, 230))
    d.ellipse((34, 33, 42, 41), fill=(22, 64, 58))
    return p


def fill_tiled(base: Image.Image, rect: tuple[int, int, int, int], broken: bool) -> None:
    x1, y1, x2, y2 = rect
    p = tile_pattern()
    region = Image.new("RGB", (x2 - x1, y2 - y1), (0, 0, 0))
    for y in range(0, region.height, p.height):
        for x in range(0, region.width, p.width):
            tile = p
            if broken and x >= region.width // 2:
                # Bad tiling: phase shift after the midpoint, producing a visible seam.
                tile = Image.new("RGB", p.size)
                tile.paste(p.crop((9, 0, p.width, p.height)), (0, 0))
                tile.paste(p.crop((0, 0, 9, p.height)), (p.width - 9, 0))
            region.paste(tile, (x, y))
    # rounded mask
    mask = Image.new("L", region.size, 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((0, 0, region.width - 1, region.height - 1), radius=24, fill=255)
    base.paste(region, (x1, y1), mask)


def make_texture(case_id: str, broken: bool) -> dict[str, Any]:
    img, d = base_canvas("Texture tiling check", "Question: Does the texture tile cleanly on button C, without visible seams?")
    c = (370, 292, 910, 490)
    # shadow
    d.rounded_rectangle((c[0] + 8, c[1] + 10, c[2] + 8, c[3] + 10), radius=24, fill=(18, 20, 27))
    fill_tiled(img, c, broken)
    d.rounded_rectangle(c, radius=24, outline=(180, 255, 235), width=4)
    if broken:
        seam_x = (c[0] + c[2]) // 2
        d.line([(seam_x, c[1] + 8), (seam_x, c[3] - 8)], fill=(255, 86, 86), width=3)
        d.text((seam_x + 12, c[1] + 16), "phase seam", fill=(255, 205, 205), font=F_SMALL)
    # label C
    bx, by = c[0] - 18, c[1] - 20
    d.ellipse((bx, by, bx + 54, by + 54), fill=(250, 250, 250), outline=(18, 20, 27), width=2)
    d.text((bx + 13, by + 3), "C", fill=(20, 25, 35), font=F_LABEL)
    add_footer(d, case_id)
    path = OUT_DIR / f"{case_id}.png"
    img.save(path)
    return {
        "id": case_id,
        "image": str(path.relative_to(ROOT)),
        "category": "texture_tiling",
        "question": "Does the texture tile correctly on button C without a visible seam? Answer yes or no.",
        "expected_answer": "no" if broken else "yes",
        "expected_defect": "phase seam" if broken else "none",
        "scoring": "yes_no",
    }


def make_state(case_id: str, bad: bool) -> dict[str, Any]:
    img, d = base_canvas("Button state consistency", "Question: Is hover state B visually consistent with default state A?")
    a = (300, 310, 560, 420)
    b = (720, 310, 980, 420)
    draw_button(d, a, "A", fill=(220, 78, 111), texture=True, radius=22)
    radius = 6 if bad else 22
    fill = (245, 122, 155) if not bad else (245, 122, 80)
    draw_button(d, b, "B", fill=fill, texture=True, radius=radius)
    d.text((314, 456), "default", fill=(181, 192, 211), font=F_BODY)
    d.text((734, 456), "hover", fill=(181, 192, 211), font=F_BODY)
    if bad:
        d.text((686, 500), "corner radius + hue changed", fill=(255, 205, 205), font=F_SMALL)
    add_footer(d, case_id)
    path = OUT_DIR / f"{case_id}.png"
    img.save(path)
    return {
        "id": case_id,
        "image": str(path.relative_to(ROOT)),
        "category": "state_consistency",
        "question": "Is hover state B visually consistent with default state A? Answer yes or no.",
        "expected_answer": "no" if bad else "yes",
        "expected_defect": "corner radius and hue mismatch" if bad else "none",
        "scoring": "yes_no",
    }


def make_icon(case_id: str, bad: bool) -> dict[str, Any]:
    img, d = base_canvas("Icon optical alignment", "Question: Is the white plus icon centered inside circular button A?")
    cx, cy = 640, 376
    r = 92
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(37, 99, 235), outline=(191, 219, 254), width=4)
    icon_dx = 14 if bad else 0
    icon_dy = -8 if bad else 0
    ix, iy = cx + icon_dx, cy + icon_dy
    d.rounded_rectangle((ix - 13, cy - 50 + icon_dy, ix + 13, cy + 50 + icon_dy), radius=7, fill=(255, 255, 255))
    d.rounded_rectangle((cx - 50 + icon_dx, iy - 13, cx + 50 + icon_dx, iy + 13), radius=7, fill=(255, 255, 255))
    # center crosshair
    d.line([(cx - 120, cy), (cx + 120, cy)], fill=(255, 211, 77), width=2)
    d.line([(cx, cy - 120), (cx, cy + 120)], fill=(255, 211, 77), width=2)
    bx, by = cx - r - 18, cy - r - 20
    d.ellipse((bx, by, bx + 54, by + 54), fill=(250, 250, 250), outline=(18, 20, 27), width=2)
    d.text((bx + 14, by + 3), "A", fill=(20, 25, 35), font=F_LABEL)
    if bad:
        d.text((cx + 118, cy - 20), "+14px, -8px", fill=(255, 231, 128), font=F_SMALL)
    add_footer(d, case_id)
    path = OUT_DIR / f"{case_id}.png"
    img.save(path)
    return {
        "id": case_id,
        "image": str(path.relative_to(ROOT)),
        "category": "icon_centering",
        "question": "Is the white plus icon centered inside circular button A? Answer yes or no, and mention the direction if off-center.",
        "expected_answer": "no" if bad else "yes",
        "expected_offset_x_px": icon_dx,
        "expected_offset_y_px": icon_dy,
        "scoring": "yes_no_offset",
    }


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    cases = [
        make_alignment("align_ok_00", 0),
        make_alignment("align_bad_06", 6),
        make_alignment("align_bad_12", 12),
        make_size("size_ok_00", 0, 0),
        make_size("size_bad_width_24", 24, 0),
        make_spacing("spacing_ok_00", False),
        make_spacing("spacing_bad_27", True),
        make_texture("texture_ok_00", False),
        make_texture("texture_bad_seam", True),
        make_state("state_ok_00", False),
        make_state("state_bad_radius_hue", True),
        make_icon("icon_ok_00", False),
        make_icon("icon_bad_offset", True),
    ]
    with MANIFEST.open("w", encoding="utf-8") as f:
        for c in cases:
            f.write(json.dumps(c, ensure_ascii=False) + "\n")
    print(f"Wrote {len(cases)} cases to {MANIFEST}")


if __name__ == "__main__":
    main()
