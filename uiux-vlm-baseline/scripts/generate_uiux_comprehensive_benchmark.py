#!/usr/bin/env python3
"""Generate a deterministic comprehensive UI/UX VLM benchmark.

This benchmark is intentionally synthetic and pixel-grounded. It avoids visible
measurement guide lines and defect callouts so models must inspect the UI rather
than read annotations. Component badges (A/B/C) are retained so prompts can refer
to targets unambiguously.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "comprehensive_images"
MANIFEST = ROOT / "data" / "comprehensive_manifest.jsonl"
W, H = 1280, 768


def load_font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    names = [
        "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
        "/usr/share/fonts/truetype/liberation/LiberationSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/liberation/LiberationSans-Regular.ttf",
    ]
    for name in names:
        p = Path(name)
        if p.exists():
            return ImageFont.truetype(str(p), size)
    return ImageFont.load_default()


F_TITLE = load_font(32, True)
F_LABEL = load_font(38, True)
F_BODY = load_font(24)
F_SMALL = load_font(16)
F_UI = load_font(22, True)
F_UI_REG = load_font(20)


@dataclass(frozen=True)
class Case:
    id: str
    image: str
    category: str
    question: str
    expected_answer: str
    scoring: str = "yes_no"
    meta: dict[str, Any] | None = None

    def as_json(self) -> dict[str, Any]:
        row = {
            "id": self.id,
            "image": self.image,
            "category": self.category,
            "question": self.question,
            "expected_answer": self.expected_answer,
            "scoring": self.scoring,
        }
        if self.meta:
            row.update(self.meta)
        return row


def base_canvas(title: str, subtitle: str) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    img = Image.new("RGB", (W, H), (22, 24, 32))
    d = ImageDraw.Draw(img)
    # Low-contrast background grid; useful UI texture, not a measurement aid.
    for x in range(0, W, 32):
        d.line([(x, 0), (x, H)], fill=(29, 32, 42), width=1)
    for y in range(0, H, 32):
        d.line([(0, y), (W, y)], fill=(29, 32, 42), width=1)
    d.rounded_rectangle((90, 70, W - 90, H - 64), radius=28, fill=(39, 43, 55), outline=(80, 88, 110), width=2)
    d.text((122, 102), title, fill=(238, 242, 248), font=F_TITLE)
    d.text((124, 148), subtitle, fill=(173, 183, 202), font=F_BODY)
    return img, d


def footer(d: ImageDraw.ImageDraw, _case_id: str) -> None:
    # Keep the screenshot blind: do not render case IDs, expected labels, or
    # defect magnitudes. IDs intentionally remain only in the manifest/results.
    d.text((104, H - 46), "Synthetic UI/UX comprehensive benchmark", fill=(115, 126, 148), font=F_SMALL)


def save(img: Image.Image, case_id: str) -> str:
    path = OUT_DIR / f"{case_id}.png"
    img.save(path)
    return str(path.relative_to(ROOT))


def as_box(rect: tuple[int, int, int, int] | list[int]) -> list[int]:
    return [int(rect[0]), int(rect[1]), int(rect[2]), int(rect[3])]


def union_box(*rects: tuple[int, int, int, int] | list[int]) -> list[int]:
    return [
        min(int(r[0]) for r in rects),
        min(int(r[1]) for r in rects),
        max(int(r[2]) for r in rects),
        max(int(r[3]) for r in rects),
    ]


def clamp_box(rect: tuple[int, int, int, int] | list[int]) -> list[int]:
    x1, y1, x2, y2 = [int(v) for v in rect]
    return [max(0, x1), max(0, y1), min(W, x2), min(H, y2)]


def expand_box(rect: tuple[int, int, int, int] | list[int], pad: int) -> list[int]:
    x1, y1, x2, y2 = [int(v) for v in rect]
    return clamp_box([x1 - pad, y1 - pad, x2 + pad, y2 + pad])


def badge(d: ImageDraw.ImageDraw, x: int, y: int, label: str) -> None:
    d.ellipse((x, y, x + 48, y + 48), fill=(250, 250, 250), outline=(18, 20, 27), width=2)
    tw = d.textlength(label, font=F_LABEL)
    d.text((x + 24 - tw / 2, y + 2), label, fill=(20, 25, 35), font=F_LABEL)


def rounded_shadow(d: ImageDraw.ImageDraw, rect: tuple[int, int, int, int], radius: int) -> None:
    x1, y1, x2, y2 = rect
    d.rounded_rectangle((x1 + 7, y1 + 9, x2 + 7, y2 + 9), radius=radius, fill=(16, 18, 24))


def draw_button(
    d: ImageDraw.ImageDraw,
    rect: tuple[int, int, int, int],
    label: str,
    fill: tuple[int, int, int] = (50, 116, 216),
    outline: tuple[int, int, int] = (169, 205, 255),
    radius: int = 20,
    texture: bool = True,
    text: str | None = None,
) -> None:
    x1, y1, x2, y2 = rect
    rounded_shadow(d, rect, radius)
    d.rounded_rectangle(rect, radius=radius, fill=fill, outline=outline, width=3)
    if texture:
        stripe = tuple(min(255, c + 26) for c in fill)
        for k in range(x1 - (y2 - y1), x2 + (y2 - y1), 24):
            d.line([(k, y2 - 6), (k + (y2 - y1), y1 + 6)], fill=stripe, width=4)
        d.rounded_rectangle(rect, radius=radius, outline=outline, width=3)
    if text:
        tw = d.textlength(text, font=F_UI)
        th = F_UI.size
        d.text((x1 + (x2 - x1 - tw) / 2, y1 + (y2 - y1 - th) / 2 - 2), text, fill=(250, 253, 255), font=F_UI)
    badge(d, x1 - 18, y1 - 20, label)


def draw_card(d: ImageDraw.ImageDraw, rect: tuple[int, int, int, int], label: str, accent: tuple[int, int, int]) -> None:
    x1, y1, x2, y2 = rect
    rounded_shadow(d, rect, 18)
    d.rounded_rectangle(rect, radius=18, fill=(50, 56, 72), outline=accent, width=3)
    badge(d, x1 + 14, y1 + 14, label)
    d.rounded_rectangle((x1 + 28, y1 + 86, x2 - 28, y1 + 98), radius=6, fill=(78, 87, 108))
    d.rounded_rectangle((x1 + 28, y1 + 118, x2 - 58, y1 + 130), radius=6, fill=(72, 80, 101))
    d.rounded_rectangle((x1 + 28, y1 + 150, x2 - 86, y1 + 162), radius=6, fill=(66, 74, 94))


def tile_pattern(size: int = 48) -> Image.Image:
    p = Image.new("RGB", (size, size), (42, 105, 96))
    d = ImageDraw.Draw(p)
    d.rectangle((0, 0, size - 1, size - 1), fill=(42, 105, 96))
    d.line((0, size - 1, size - 1, 0), fill=(91, 190, 170), width=5)
    d.line((-size // 2, size - 1, size - 1, -size // 2), fill=(62, 143, 128), width=5)
    d.ellipse((12, 12, 22, 22), fill=(198, 255, 230))
    d.ellipse((34, 33, 42, 41), fill=(22, 64, 58))
    return p


def fill_tiled(img: Image.Image, rect: tuple[int, int, int, int], phase_shift: int = 0, seam_axis: str = "vertical") -> None:
    x1, y1, x2, y2 = rect
    pattern = tile_pattern()
    region = Image.new("RGB", (x2 - x1, y2 - y1), (0, 0, 0))
    split_x = region.width // 2
    split_y = region.height // 2
    for y in range(0, region.height, pattern.height):
        for x in range(0, region.width, pattern.width):
            tile = pattern
            shifted = phase_shift and ((seam_axis == "vertical" and x >= split_x) or (seam_axis == "horizontal" and y >= split_y))
            if shifted:
                shift = phase_shift % pattern.width
                tile = Image.new("RGB", pattern.size)
                tile.paste(pattern.crop((shift, 0, pattern.width, pattern.height)), (0, 0))
                tile.paste(pattern.crop((0, 0, shift, pattern.height)), (pattern.width - shift, 0))
            region.paste(tile, (x, y))
    mask = Image.new("L", region.size, 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((0, 0, region.width - 1, region.height - 1), radius=24, fill=255)
    img.paste(region, (x1, y1), mask)


def make_alignment(case_id: str, offset: int, direction: str = "down", color=(50, 116, 216)) -> Case:
    subtitle = "Are buttons A and B horizontally aligned along their top edges?"
    img, d = base_canvas("Button alignment check", subtitle)
    a = (280, 326, 540, 430)
    signed = -offset if direction == "up" else offset
    b = (720, 326 + signed, 980, 430 + signed)
    draw_button(d, a, "A", fill=color, text="Primary")
    draw_button(d, b, "B", fill=color, text="Primary")
    footer(d, case_id)
    return Case(
        id=case_id,
        image=save(img, case_id),
        category="comprehensive_alignment",
        question="Are buttons A and B horizontally aligned along their top edges? Answer yes or no, and if no estimate the vertical offset in pixels.",
        expected_answer="yes" if offset == 0 else "no",
        scoring="yes_no_offset",
        meta={
            "expected_offset_px": signed,
            "regions": {"A": as_box(a), "B": as_box(b), "crop": expand_box(union_box(a, b), 96)},
            "measurement": {
                "type": "top_edge_alignment",
                "components": ["A", "B"],
                "tolerance_px": 3,
                "offset_px": signed,
            },
        },
    )


def make_size(case_id: str, dw: int, dh: int, variant: int = 0) -> Case:
    img, d = base_canvas("Button size consistency", "Are buttons A and B the same size?")
    a = (268, 320, 548, 430)
    b = (720, 320, 1000 + dw, 430 + dh)
    color = (124, 58, 237) if variant == 0 else (14, 165, 233)
    draw_button(d, a, "A", fill=color, text="Action")
    draw_button(d, b, "B", fill=color, text="Action")
    footer(d, case_id)
    return Case(
        case_id,
        save(img, case_id),
        "comprehensive_size",
        "Are buttons A and B the same size? Answer yes or no, and mention whether width or height differs.",
        "yes" if dw == 0 and dh == 0 else "no",
        "yes_no",
        {
            "expected_width_delta_px": dw,
            "expected_height_delta_px": dh,
            "regions": {"A": as_box(a), "B": as_box(b), "crop": expand_box(union_box(a, b), 96)},
            "measurement": {
                "type": "component_size",
                "components": ["A", "B"],
                "tolerance_px": 6,
                "width_delta_px": dw,
                "height_delta_px": dh,
            },
        },
    )


def make_spacing(case_id: str, gap_delta: int, variant: int = 0) -> Case:
    img, d = base_canvas("Card spacing consistency", "Is the horizontal spacing between cards A-B and B-C consistent?")
    y = 284
    w, h = 206, 172
    gap1 = 64
    gap2 = gap1 + gap_delta
    x1 = 226 if variant == 0 else 248
    rects = [
        (x1, y, x1 + w, y + h),
        (x1 + w + gap1, y, x1 + 2 * w + gap1, y + h),
        (x1 + 2 * w + gap1 + gap2, y, x1 + 3 * w + gap1 + gap2, y + h),
    ]
    for lab, rect, accent in zip(["A", "B", "C"], rects, [(14, 165, 233), (20, 184, 166), (245, 158, 11)]):
        draw_card(d, rect, lab, accent)
    footer(d, case_id)
    return Case(
        case_id,
        save(img, case_id),
        "comprehensive_spacing",
        "Is the horizontal spacing between cards A-B and B-C consistent? Answer yes or no.",
        "yes" if gap_delta == 0 else "no",
        "yes_no",
        {
            "expected_gap_ab_px": gap1,
            "expected_gap_bc_px": gap2,
            "expected_gap_delta_px": gap_delta,
            "regions": {
                "A": as_box(rects[0]),
                "B": as_box(rects[1]),
                "C": as_box(rects[2]),
                "crop": expand_box(union_box(*rects), 80),
            },
            "measurement": {
                "type": "horizontal_gap_consistency",
                "components": ["A", "B", "C"],
                "tolerance_px": 8,
                "gap_ab_px": gap1,
                "gap_bc_px": gap2,
                "gap_delta_px": gap_delta,
            },
        },
    )


def make_texture(case_id: str, phase_shift: int, seam_axis: str = "vertical", width: int = 540) -> Case:
    img, d = base_canvas("Texture tiling check", "Does the texture tile cleanly on button C, without visible seams?")
    c = (640 - width // 2, 292, 640 + width // 2, 492)
    rounded_shadow(d, c, 24)
    fill_tiled(img, c, phase_shift=phase_shift, seam_axis=seam_axis)
    d.rounded_rectangle(c, radius=24, outline=(180, 255, 235), width=4)
    badge(d, c[0] - 18, c[1] - 20, "C")
    footer(d, case_id)
    pattern_size = 48
    local_split = ((c[2] - c[0]) // 2) if seam_axis == "vertical" else ((c[3] - c[1]) // 2)
    # The renderer shifts whole tiles whose origin is at/after split, so the
    # visible phase boundary is the first pattern tile boundary after midpoint.
    local_seam = ((local_split + pattern_size - 1) // pattern_size) * pattern_size
    seam_position = (c[0] + local_seam) if seam_axis == "vertical" else (c[1] + local_seam)
    return Case(
        case_id,
        save(img, case_id),
        "comprehensive_texture_tiling",
        "Does the texture tile correctly on button C without a visible seam? Answer yes or no.",
        "yes" if phase_shift == 0 else "no",
        "yes_no",
        {
            "expected_defect": "none" if phase_shift == 0 else f"{seam_axis} phase seam",
            "expected_phase_shift_px": phase_shift,
            "regions": {"C": as_box(c), "crop": expand_box(c, 64)},
            "measurement": {
                "type": "texture_seam",
                "component": "C",
                "tolerance_px": 3,
                "phase_shift_px": phase_shift,
                "seam_axis": seam_axis,
                "seam_position_px": seam_position,
                "pattern_size_px": pattern_size,
            },
        },
    )


def draw_plus(d: ImageDraw.ImageDraw, cx: int, cy: int, dx: int, dy: int) -> None:
    ix, iy = cx + dx, cy + dy
    d.rounded_rectangle((ix - 13, iy - 50, ix + 13, iy + 50), radius=7, fill=(255, 255, 255))
    d.rounded_rectangle((ix - 50, iy - 13, ix + 50, iy + 13), radius=7, fill=(255, 255, 255))


def draw_check(d: ImageDraw.ImageDraw, cx: int, cy: int, dx: int, dy: int) -> None:
    ix, iy = cx + dx, cy + dy
    d.line([(ix - 48, iy), (ix - 14, iy + 34), (ix + 54, iy - 40)], fill=(255, 255, 255), width=18, joint="curve")


def make_icon(case_id: str, dx: int, dy: int, icon: str = "plus") -> Case:
    img, d = base_canvas("Icon optical alignment", "Is the white icon centered inside circular button A?")
    cx, cy, r = 640, 376, 92
    d.ellipse((cx - r + 7, cy - r + 9, cx + r + 7, cy + r + 9), fill=(16, 18, 24))
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=(37, 99, 235), outline=(191, 219, 254), width=4)
    if icon == "check":
        draw_check(d, cx, cy, dx, dy)
    else:
        draw_plus(d, cx, cy, dx, dy)
    badge(d, cx - r - 18, cy - r - 20, "A")
    footer(d, case_id)
    off = dx != 0 or dy != 0
    return Case(
        case_id,
        save(img, case_id),
        "comprehensive_icon_centering",
        "Is the white icon centered inside circular button A? Answer yes or no, and if no estimate the offset in pixels and direction.",
        "no" if off else "yes",
        "yes_no_offset",
        {
            "expected_offset_x_px": dx,
            "expected_offset_y_px": dy,
            "icon": icon,
            "regions": {
                "button": as_box((cx - r, cy - r, cx + r, cy + r)),
                "icon_search": as_box((cx - 62, cy - 62, cx + 62, cy + 62)),
                "crop": expand_box((cx - r, cy - r, cx + r, cy + r), 72),
            },
            "measurement": {
                "type": "icon_centering",
                "component": "A",
                "circle_center": [cx, cy],
                "circle_radius": r,
                "icon_center": [cx + dx, cy + dy],
                "offset_x_px": dx,
                "offset_y_px": dy,
                "tolerance_px": 6,
            },
        },
    )


def make_state(case_id: str, defect: str | None, variant: int = 0) -> Case:
    img, d = base_canvas("Button state consistency", "Is state B visually consistent with state A?")
    a = (300, 310, 560, 420)
    b = (720, 310, 980, 420)
    if variant == 0:
        base_fill = (220, 78, 111)
        b_fill = (245, 122, 155)
    else:
        base_fill = (34, 197, 94)
        b_fill = (74, 222, 128)
    radius_a, radius_b = 22, 22
    outline_a, outline_b = (255, 190, 205), (255, 210, 220)
    if defect == "radius":
        radius_b = 6
    elif defect == "hue_shadow":
        b_fill = (245, 122, 80)
        outline_b = (255, 190, 120)
    draw_button(d, a, "A", fill=base_fill, outline=outline_a, radius=radius_a, text="Default")
    draw_button(d, b, "B", fill=b_fill, outline=outline_b, radius=radius_b, text="Hover")
    footer(d, case_id)
    return Case(
        case_id,
        save(img, case_id),
        "comprehensive_state_consistency",
        "Is state B visually consistent with state A? Answer yes or no.",
        "yes" if defect is None else "no",
        "yes_no",
        {
            "expected_defect": defect or "none",
            "regions": {"A": as_box(a), "B": as_box(b), "crop": expand_box(union_box(a, b), 96)},
            "measurement": {
                "type": "state_consistency",
                "components": ["A", "B"],
                "radius_a_px": radius_a,
                "radius_b_px": radius_b,
                "fill_a_rgb": list(base_fill),
                "fill_b_rgb": list(b_fill),
                "radius_tolerance_px": 6,
                "hue_tolerance_deg": 18,
            },
        },
    )


def make_text_alignment(case_id: str, offset: int, target: str = "label") -> Case:
    img, d = base_canvas("Text baseline alignment", "Are the text baselines in A and B aligned?")
    # Two input rows with label + field. Offset either label or field text.
    card = (230, 265, 1050, 500)
    rounded_shadow(d, card, 22)
    d.rounded_rectangle(card, radius=22, fill=(49, 55, 72), outline=(96, 108, 132), width=2)
    rows = [(310, 330), (720, 330)]
    for i, (x, y) in enumerate(rows):
        lab = "A" if i == 0 else "B"
        badge(d, x - 76, y - 18, lab)
        label_y = y
        field_y = y + 48
        if i == 1 and target == "label":
            label_y += offset
        if i == 1 and target == "field":
            field_y += offset
        d.text((x, label_y), "Email", fill=(206, 215, 230), font=F_UI_REG)
        d.rounded_rectangle((x, y + 38, x + 260, y + 94), radius=14, fill=(30, 34, 45), outline=(92, 104, 128), width=2)
        d.text((x + 18, field_y), "name@example", fill=(150, 163, 184), font=F_UI_REG)
    footer(d, case_id)
    return Case(
        case_id,
        save(img, case_id),
        "comprehensive_text_alignment",
        "Are the text baselines in A and B aligned? Answer yes or no, and if no estimate the vertical offset in pixels.",
        "yes" if offset == 0 else "no",
        "yes_no_offset",
        {
            "expected_offset_px": offset,
            "target": target,
            "regions": {
                "card": as_box(card),
                "A_label": as_box((310, 330, 390, 360)),
                "B_label": as_box((720, 330 + (offset if target == "label" else 0), 800, 360 + (offset if target == "label" else 0))),
                "A_field_text": as_box((328, 378, 560, 410)),
                "B_field_text": as_box((738, 378 + (offset if target == "field" else 0), 970, 410 + (offset if target == "field" else 0))),
                "crop": expand_box(card, 48),
            },
            "measurement": {
                "type": "text_baseline",
                "target": target,
                "tolerance_px": 4,
                "offset_px": offset,
            },
        },
    )


def make_padding(case_id: str, defect: str | None, variant: int = 0) -> Case:
    img, d = base_canvas("Padding symmetry check", "Is the inner padding visually symmetric in component A?")
    card = (360, 250, 920, 520) if variant == 0 else (330, 240, 950, 535)
    rounded_shadow(d, card, 24)
    d.rounded_rectangle(card, radius=24, fill=(50, 56, 72), outline=(102, 120, 150), width=3)
    badge(d, card[0] - 18, card[1] - 20, "A")
    left_pad, top_pad, right_pad, bottom_pad = 54, 46, 54, 46
    if defect == "left":
        left_pad += 16
    elif defect == "top":
        top_pad += 12
    elif defect == "right":
        right_pad += 20
    inner = (card[0] + left_pad, card[1] + top_pad, card[2] - right_pad, card[3] - bottom_pad)
    d.rounded_rectangle(inner, radius=18, fill=(30, 34, 45), outline=(92, 104, 128), width=2)
    # Content block inside inner area, centered in the inner area so asymmetric padding is visible against card.
    ix1, iy1, ix2, iy2 = inner
    d.rounded_rectangle((ix1 + 28, iy1 + 26, ix2 - 28, iy1 + 42), radius=6, fill=(88, 101, 125))
    d.rounded_rectangle((ix1 + 28, iy1 + 66, ix2 - 90, iy1 + 80), radius=6, fill=(76, 88, 110))
    d.rounded_rectangle((ix1 + 28, iy1 + 106, ix2 - 128, iy1 + 120), radius=6, fill=(70, 82, 102))
    footer(d, case_id)
    return Case(
        case_id,
        save(img, case_id),
        "comprehensive_padding_symmetry",
        "Is the inner padding visually symmetric in component A? Answer yes or no.",
        "yes" if defect is None else "no",
        "yes_no",
        {
            "expected_defect": defect or "none",
            "regions": {"card": as_box(card), "inner": as_box(inner), "crop": expand_box(card, 64)},
            "measurement": {
                "type": "padding_symmetry",
                "component": "A",
                "left_pad_px": left_pad,
                "right_pad_px": right_pad,
                "top_pad_px": top_pad,
                "bottom_pad_px": bottom_pad,
                "tolerance_px": 8,
            },
        },
    )


def build_cases() -> list[Case]:
    cases: list[Case] = []
    # 6 alignment: 3 yes, 3 no
    cases += [
        make_alignment("comp_align_top_ok_center", 0, color=(50, 116, 216)),
        make_alignment("comp_align_top_ok_green", 0, color=(20, 184, 166)),
        make_alignment("comp_align_top_ok_purple", 0, color=(124, 58, 237)),
        make_alignment("comp_align_top_bad_04_down", 4, "down", color=(50, 116, 216)),
        make_alignment("comp_align_top_bad_08_up", 8, "up", color=(20, 184, 166)),
        make_alignment("comp_align_top_bad_12_down", 12, "down", color=(124, 58, 237)),
    ]
    # 4 size: 2 yes, 2 no
    cases += [
        make_size("comp_size_ok_blue", 0, 0, 0),
        make_size("comp_size_ok_cyan", 0, 0, 1),
        make_size("comp_size_bad_width_16", 16, 0, 0),
        make_size("comp_size_bad_height_12", 0, 12, 1),
    ]
    # 4 spacing: 2 yes, 2 no
    cases += [
        make_spacing("comp_spacing_ok_standard", 0, 0),
        make_spacing("comp_spacing_ok_shifted", 0, 1),
        make_spacing("comp_spacing_bad_wide_gap_18", 18, 0),
        make_spacing("comp_spacing_bad_narrow_gap_14", -14, 1),
    ]
    # 4 texture: 2 yes, 2 no
    cases += [
        make_texture("comp_texture_ok_wide", 0, width=540),
        make_texture("comp_texture_ok_narrow", 0, width=480),
        make_texture("comp_texture_bad_phase_07", 7, "vertical", 540),
        make_texture("comp_texture_bad_phase_13", 13, "horizontal", 500),
    ]
    # 4 icon: 2 yes, 2 no
    cases += [
        make_icon("comp_icon_ok_plus", 0, 0, "plus"),
        make_icon("comp_icon_ok_check", 0, 0, "check"),
        make_icon("comp_icon_bad_right_10", 10, 0, "plus"),
        make_icon("comp_icon_bad_up_left", -8, -10, "check"),
    ]
    # 4 state: 2 yes, 2 no
    cases += [
        make_state("comp_state_ok_hover", None, 0),
        make_state("comp_state_ok_success_hover", None, 1),
        make_state("comp_state_bad_radius", "radius", 0),
        make_state("comp_state_bad_hue_shadow", "hue_shadow", 1),
    ]
    # 4 text alignment: 2 yes, 2 no
    cases += [
        make_text_alignment("comp_text_baseline_ok_label", 0, "label"),
        make_text_alignment("comp_text_baseline_ok_field", 0, "field"),
        make_text_alignment("comp_text_baseline_bad_label_06", 6, "label"),
        make_text_alignment("comp_text_baseline_bad_button_10", 10, "field"),
    ]
    # 6 padding: 3 yes, 3 no
    cases += [
        make_padding("comp_padding_ok_card", None, 0),
        make_padding("comp_padding_ok_large", None, 1),
        make_padding("comp_padding_ok_repeat", None, 0),
        make_padding("comp_padding_bad_left_16", "left", 0),
        make_padding("comp_padding_bad_top_12", "top", 1),
        make_padding("comp_padding_bad_card_right_20", "right", 0),
    ]
    return cases


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    cases = build_cases()
    ids = [c.id for c in cases]
    assert len(cases) == 36, len(cases)
    assert len(set(ids)) == len(ids), "case IDs must be unique"
    assert sum(c.expected_answer == "yes" for c in cases) == 18
    assert sum(c.expected_answer == "no" for c in cases) == 18
    with MANIFEST.open("w", encoding="utf-8") as f:
        for case in cases:
            f.write(json.dumps(case.as_json(), ensure_ascii=False) + "\n")
    print(f"Wrote {len(cases)} cases to {MANIFEST}")
    print(f"Images: {OUT_DIR}")


if __name__ == "__main__":
    main()
