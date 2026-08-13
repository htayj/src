#!/usr/bin/env python3
"""Generate a second UI/UX benchmark variant for overfitting checks.

This variant covers the same task families as the comprehensive benchmark but
uses different layouts, positions, colors, component sizes, and defect magnitudes.
It includes target `regions` as stand-in localization metadata for the hybrid
VLM/CV system, while expected labels and offsets are only for scoring.
"""

from __future__ import annotations

import json
from dataclasses import dataclass
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "data" / "variant_images"
MANIFEST = ROOT / "data" / "variant_manifest.jsonl"
W, H = 1280, 768


def font(size: int, bold: bool = False) -> ImageFont.ImageFont:
    p = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
    return ImageFont.truetype(str(p), size) if p.exists() else ImageFont.load_default()

F_TITLE = font(30, True)
F_BODY = font(22)
F_BADGE = font(34, True)
F_UI = font(22, True)
F_UI_REG = font(20)
F_SMALL = font(16)


@dataclass(frozen=True)
class Case:
    id: str
    image: str
    category: str
    question: str
    expected_answer: str
    scoring: str
    meta: dict[str, Any]

    def as_json(self) -> dict[str, Any]:
        row = {
            "id": self.id,
            "image": self.image,
            "category": self.category,
            "question": self.question,
            "expected_answer": self.expected_answer,
            "scoring": self.scoring,
        }
        row.update(self.meta)
        return row


def as_box(rect):
    return [int(rect[0]), int(rect[1]), int(rect[2]), int(rect[3])]


def union_box(*rects):
    return [min(r[0] for r in rects), min(r[1] for r in rects), max(r[2] for r in rects), max(r[3] for r in rects)]


def expand_box(rect, pad: int):
    x1, y1, x2, y2 = rect
    return [max(0, x1 - pad), max(0, y1 - pad), min(W, x2 + pad), min(H, y2 + pad)]


def canvas(title: str, subtitle: str):
    img = Image.new("RGB", (W, H), (25, 27, 35))
    d = ImageDraw.Draw(img)
    for x in range(0, W, 40):
        d.line([(x, 0), (x, H)], fill=(31, 34, 44), width=1)
    for y in range(0, H, 40):
        d.line([(0, y), (W, y)], fill=(31, 34, 44), width=1)
    d.rounded_rectangle((72, 58, W - 72, H - 58), radius=34, fill=(42, 47, 61), outline=(83, 94, 119), width=2)
    d.text((108, 92), title, fill=(242, 246, 252), font=F_TITLE)
    d.text((110, 136), subtitle, fill=(178, 188, 207), font=F_BODY)
    d.text((106, H - 42), "Synthetic UI/UX variant benchmark", fill=(115, 126, 148), font=F_SMALL)
    return img, d


def save(img: Image.Image, cid: str) -> str:
    p = OUT_DIR / f"{cid}.png"
    img.save(p)
    return str(p.relative_to(ROOT))


def badge(d: ImageDraw.ImageDraw, x: int, y: int, lab: str) -> None:
    d.ellipse((x, y, x + 44, y + 44), fill=(248, 250, 252), outline=(20, 24, 35), width=2)
    tw = d.textlength(lab, font=F_BADGE)
    d.text((x + 22 - tw / 2, y + 1), lab, fill=(20, 24, 35), font=F_BADGE)


def button(d: ImageDraw.ImageDraw, rect, lab, fill, outline=(240, 249, 255), radius=18, text="Action"):
    x1, y1, x2, y2 = rect
    d.rounded_rectangle((x1 + 8, y1 + 10, x2 + 8, y2 + 10), radius=radius, fill=(15, 17, 24))
    d.rounded_rectangle(rect, radius=radius, fill=fill, outline=outline, width=3)
    stripe = tuple(min(255, c + 24) for c in fill)
    for k in range(x1 - 80, x2 + 80, 28):
        d.line([(k, y2 - 7), (k + (y2 - y1), y1 + 7)], fill=stripe, width=4)
    d.rounded_rectangle(rect, radius=radius, outline=outline, width=3)
    tw = d.textlength(text, font=F_UI)
    d.text((x1 + (x2 - x1 - tw) / 2, y1 + (y2 - y1 - F_UI.size) / 2 - 2), text, fill=(250, 253, 255), font=F_UI)
    badge(d, x1 - 16, y1 - 18, lab)


def card(d, rect, lab, accent):
    x1, y1, x2, y2 = rect
    d.rounded_rectangle((x1 + 8, y1 + 10, x2 + 8, y2 + 10), radius=20, fill=(15, 17, 24))
    d.rounded_rectangle(rect, radius=20, fill=(54, 61, 78), outline=accent, width=3)
    badge(d, x1 + 12, y1 + 12, lab)
    for i, w in enumerate([0, 42, 82]):
        yy = y1 + 88 + i * 34
        d.rounded_rectangle((x1 + 28, yy, x2 - 28 - w, yy + 13), radius=6, fill=(82 - i * 7, 94 - i * 7, 116 - i * 7))


def tile_pattern(size: int = 48) -> Image.Image:
    p = Image.new("RGB", (size, size), (42, 105, 96))
    d = ImageDraw.Draw(p)
    d.rectangle((0, 0, size - 1, size - 1), fill=(42, 105, 96))
    d.line((0, size - 1, size - 1, 0), fill=(91, 190, 170), width=5)
    d.line((-size // 2, size - 1, size - 1, -size // 2), fill=(62, 143, 128), width=5)
    d.ellipse((12, 12, 22, 22), fill=(198, 255, 230))
    d.ellipse((34, 33, 42, 41), fill=(22, 64, 58))
    return p


def fill_texture(img, rect, phase_shift=0, seam_axis="vertical"):
    x1, y1, x2, y2 = rect
    pat = tile_pattern()
    region = Image.new("RGB", (x2 - x1, y2 - y1))
    split_x = region.width // 2
    split_y = region.height // 2
    for y in range(0, region.height, pat.height):
        for x in range(0, region.width, pat.width):
            tile = pat
            if phase_shift and ((seam_axis == "vertical" and x >= split_x) or (seam_axis == "horizontal" and y >= split_y)):
                shift = phase_shift % pat.width
                tile = Image.new("RGB", pat.size)
                tile.paste(pat.crop((shift, 0, pat.width, pat.height)), (0, 0))
                tile.paste(pat.crop((0, 0, shift, pat.height)), (pat.width - shift, 0))
            region.paste(tile, (x, y))
    mask = Image.new("L", region.size, 0)
    md = ImageDraw.Draw(mask)
    md.rounded_rectangle((0, 0, region.width - 1, region.height - 1), radius=26, fill=255)
    img.paste(region, (x1, y1), mask)


def texture_meta(rect, phase_shift, seam_axis):
    pattern_size = 48
    local_split = ((rect[2] - rect[0]) // 2) if seam_axis == "vertical" else ((rect[3] - rect[1]) // 2)
    local_seam = ((local_split + pattern_size - 1) // pattern_size) * pattern_size
    seam_position = (rect[0] + local_seam) if seam_axis == "vertical" else (rect[1] + local_seam)
    return {"type": "texture_seam", "component": "C", "tolerance_px": 3, "seam_axis": seam_axis, "seam_position_px": seam_position, "pattern_size_px": pattern_size}


def cases() -> list[Case]:
    out: list[Case] = []
    # Alignment
    for cid, off, color in [("variant_align_ok_offset_layout", 0, (234, 88, 12)), ("variant_align_bad_up_10", -10, (217, 70, 239))]:
        img, d = canvas("Variant alignment", "Are A and B top edges aligned?")
        a = (210, 362, 492, 464); b = (760, 362 + off, 1042, 464 + off)
        button(d, a, "A", color, text="Launch"); button(d, b, "B", color, text="Launch")
        out.append(Case(cid, save(img, cid), "variant_alignment", "Are buttons A and B horizontally aligned along their top edges? Answer yes or no, and if no estimate the vertical offset in pixels.", "yes" if off == 0 else "no", "yes_no_offset", {"expected_offset_px": off, "regions": {"A": as_box(a), "B": as_box(b), "crop": expand_box(union_box(a, b), 90)}, "measurement": {"type": "top_edge_alignment", "tolerance_px": 3}}))
    # Size
    for cid, dw, dh in [("variant_size_ok_tall", 0, 0), ("variant_size_bad_taller_14", 0, 14)]:
        img, d = canvas("Variant size", "Are A and B the same size?")
        a = (230, 328, 500, 446); b = (752, 328, 1022 + dw, 446 + dh)
        button(d, a, "A", (8, 145, 178), text="Save"); button(d, b, "B", (8, 145, 178), text="Save")
        out.append(Case(cid, save(img, cid), "variant_size", "Are buttons A and B the same size? Answer yes or no.", "yes" if dw == 0 and dh == 0 else "no", "yes_no", {"expected_width_delta_px": dw, "expected_height_delta_px": dh, "regions": {"A": as_box(a), "B": as_box(b), "crop": expand_box(union_box(a, b), 90)}, "measurement": {"type": "component_size", "tolerance_px": 6}}))
    # Spacing
    for cid, dg in [("variant_spacing_ok_compact", 0), ("variant_spacing_bad_gap_22", 22)]:
        img, d = canvas("Variant spacing", "Are A-B and B-C gaps consistent?")
        y, w, h, g1, x = 300, 190, 168, 54, 250
        g2 = g1 + dg
        rects = [(x, y, x+w, y+h), (x+w+g1, y, x+2*w+g1, y+h), (x+2*w+g1+g2, y, x+3*w+g1+g2, y+h)]
        for lab, rect, acc in zip(["A","B","C"], rects, [(250,204,21),(59,130,246),(16,185,129)]): card(d, rect, lab, acc)
        out.append(Case(cid, save(img, cid), "variant_spacing", "Is the horizontal spacing between cards A-B and B-C consistent? Answer yes or no.", "yes" if dg == 0 else "no", "yes_no", {"expected_gap_delta_px": dg, "regions": {"A": as_box(rects[0]), "B": as_box(rects[1]), "C": as_box(rects[2]), "crop": expand_box(union_box(*rects), 75)}, "measurement": {"type": "horizontal_gap_consistency", "tolerance_px": 8}}))
    # Texture
    for cid, shift, axis in [("variant_texture_ok_horizontal_card", 0, "horizontal"), ("variant_texture_bad_vertical_11", 11, "vertical")]:
        img, d = canvas("Variant texture", "Does button C texture tile without seams?")
        c = (394, 286, 886, 500); fill_texture(img, c, shift, axis)
        d.rounded_rectangle(c, radius=26, outline=(190, 255, 235), width=4); badge(d, c[0]-16, c[1]-18, "C")
        out.append(Case(cid, save(img, cid), "variant_texture_tiling", "Does the texture tile correctly on button C without a visible seam? Answer yes or no.", "yes" if shift == 0 else "no", "yes_no", {"expected_phase_shift_px": shift, "regions": {"C": as_box(c), "crop": expand_box(c, 64)}, "measurement": texture_meta(c, shift, axis)}))
    # Icon
    for cid, dx, dy in [("variant_icon_ok_plus_large", 0, 0), ("variant_icon_bad_down_right", 9, 9)]:
        img, d = canvas("Variant icon", "Is icon A centered in the circular button?")
        cx, cy, r = 640, 386, 86
        d.ellipse((cx-r+7,cy-r+10,cx+r+7,cy+r+10), fill=(16,18,24))
        d.ellipse((cx-r,cy-r,cx+r,cy+r), fill=(79,70,229), outline=(221,214,254), width=4)
        ix, iy = cx + dx, cy + dy
        d.rounded_rectangle((ix-12,iy-48,ix+12,iy+48), radius=7, fill=(255,255,255))
        d.rounded_rectangle((ix-48,iy-12,ix+48,iy+12), radius=7, fill=(255,255,255))
        badge(d, cx-r-16, cy-r-18, "A")
        out.append(Case(cid, save(img, cid), "variant_icon_centering", "Is the white icon centered inside circular button A? Answer yes or no, and if no estimate the offset in pixels and direction.", "yes" if dx == 0 and dy == 0 else "no", "yes_no_offset", {"expected_offset_x_px": dx, "expected_offset_y_px": dy, "icon": "plus", "regions": {"button": as_box((cx-r,cy-r,cx+r,cy+r)), "icon_search": as_box((cx-60,cy-60,cx+60,cy+60)), "crop": expand_box((cx-r,cy-r,cx+r,cy+r), 70)}, "measurement": {"type": "icon_centering", "tolerance_px": 6}}))
    # State (hue-only bad to avoid radius ambiguity)
    for cid, bad in [("variant_state_ok_pressed", False), ("variant_state_bad_hue", True)]:
        img, d = canvas("Variant state", "Is state B visually consistent with A?")
        a=(278,326,548,438); b=(734,326,1004,438)
        fill_a=(14,165,233); fill_b=(56,189,248) if not bad else (249,115,22)
        button(d,a,"A",fill_a,text="Default"); button(d,b,"B",fill_b,text="Active")
        out.append(Case(cid, save(img, cid), "variant_state_consistency", "Is state B visually consistent with state A? Answer yes or no.", "no" if bad else "yes", "yes_no", {"expected_defect": "hue" if bad else "none", "regions": {"A": as_box(a), "B": as_box(b), "crop": expand_box(union_box(a,b), 90)}, "measurement": {"type": "state_consistency", "tolerance_px": 6, "hue_tolerance_deg": 22, "radius_tolerance_px": 8}}))
    # Text baseline
    for cid, off in [("variant_text_ok_fields", 0), ("variant_text_bad_field_09", 9)]:
        img,d=canvas("Variant text", "Are A and B text baselines aligned?")
        panel=(242,270,1038,514); d.rounded_rectangle((panel[0]+8,panel[1]+10,panel[2]+8,panel[3]+10), radius=22, fill=(15,17,24)); d.rounded_rectangle(panel, radius=22, fill=(52,58,74), outline=(104,116,140), width=2)
        for lab,x in [("A",330),("B",730)]:
            badge(d,x-76,330-18,lab); d.text((x,330),"Username",fill=(212,220,235),font=F_UI_REG)
            d.rounded_rectangle((x,374,x+248,432), radius=14, fill=(31,35,46), outline=(95,108,132), width=2)
            yy=390+(off if lab=="B" else 0); d.text((x+18,yy),"pixel_user",fill=(154,166,188),font=F_UI_REG)
        out.append(Case(cid, save(img,cid), "variant_text_alignment", "Are the text baselines in A and B aligned? Answer yes or no, and if no estimate the vertical offset in pixels.", "yes" if off==0 else "no", "yes_no_offset", {"expected_offset_px": off, "regions": {"card": as_box(panel), "A_label": as_box((330,330,450,362)), "B_label": as_box((730,330,850,362)), "A_field_text": as_box((348,388,560,420)), "B_field_text": as_box((748,388+off,960,420+off)), "crop": expand_box(panel,45)}, "measurement": {"type":"text_baseline", "tolerance_px":4}}))
    # Padding
    for cid, bad in [("variant_padding_ok_wide", False), ("variant_padding_bad_right_18", True)]:
        img,d=canvas("Variant padding", "Is inner padding symmetric?")
        card_box=(352,244,928,534); d.rounded_rectangle((360,254,936,544), radius=24, fill=(15,17,24)); d.rounded_rectangle(card_box, radius=24, fill=(55,62,78), outline=(109,123,152), width=3); badge(d,card_box[0]-16,card_box[1]-18,"A")
        lp,tp,rp,bp=58,50,58+(18 if bad else 0),50
        inner=(card_box[0]+lp,card_box[1]+tp,card_box[2]-rp,card_box[3]-bp); d.rounded_rectangle(inner, radius=18, fill=(31,35,46), outline=(95,108,132), width=2)
        ix1,iy1,ix2,iy2=inner
        for i,wcut in enumerate([0,70,128]): d.rounded_rectangle((ix1+30,iy1+30+i*40,ix2-30-wcut,iy1+46+i*40), radius=6, fill=(82-i*8,94-i*8,116-i*8))
        out.append(Case(cid, save(img,cid), "variant_padding_symmetry", "Is the inner padding visually symmetric in component A? Answer yes or no.", "no" if bad else "yes", "yes_no", {"expected_defect":"right" if bad else "none", "regions": {"card": as_box(card_box), "inner": as_box(inner), "crop": expand_box(card_box,60)}, "measurement": {"type":"padding_symmetry", "tolerance_px":8}}))
    return out


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    cs = cases()
    assert len(cs) == 16
    assert len({c.id for c in cs}) == 16
    assert sum(c.expected_answer == "yes" for c in cs) == 8
    assert sum(c.expected_answer == "no" for c in cs) == 8
    with MANIFEST.open("w", encoding="utf-8") as f:
        for c in cs:
            f.write(json.dumps(c.as_json(), ensure_ascii=False) + "\n")
    print(f"Wrote {len(cs)} cases to {MANIFEST}")
    print(f"Images: {OUT_DIR}")


if __name__ == "__main__":
    main()
