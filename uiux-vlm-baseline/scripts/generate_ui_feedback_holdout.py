#!/usr/bin/env python3
"""Generate deterministic no-badge holdout benchmarks for UI feedback analyzer."""

from __future__ import annotations

import argparse
import json
import random
import shutil
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "data" / "ui_feedback_holdout"
IMG_DIR = OUT / "images"
SPEC_DIR = OUT / "specs"
MANIFEST = OUT / "manifest.jsonl"
W, H = 980, 620
SEED = 20260525


def font(size: int, bold: bool = False):
    path = Path("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf" if bold else "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


F_TITLE = font(24, True)
F_UI = font(18, True)
F_BODY = font(16)


def manifest_path(path: Path) -> str:
    try:
        return str(path.relative_to(ROOT))
    except ValueError:
        return str(path)


def status_order(rng: random.Random) -> list[bool]:
    statuses = [True, True, False, False]
    rng.shuffle(statuses)
    return statuses


def case_id(family: str, index: int) -> str:
    # Neutral ID/path: no ok/bad, defect direction, or magnitude. Index order is
    # randomized per family, so it also does not encode expected status.
    return f"holdout_s{SEED}_{family}_{index + 1:02d}"


def base(title: str, rng: random.Random) -> tuple[Image.Image, ImageDraw.ImageDraw]:
    bg = rng.choice([(22, 26, 36), (28, 25, 35), (20, 30, 32), (30, 30, 42)])
    img = Image.new("RGB", (W, H), bg)
    d = ImageDraw.Draw(img)
    panel = (42, 40, W - 42, H - 40)
    d.rounded_rectangle(panel, radius=24, fill=tuple(min(255, c + 18) for c in bg), outline=(82, 95, 122), width=2)
    d.text((70, 66), title, fill=(242, 246, 252), font=F_TITLE)
    d.text((72, 100), "Holdout screenshot without A/B/C labels or embedded answers", fill=(174, 186, 204), font=F_BODY)
    return img, d


def button(d: ImageDraw.ImageDraw, box, text="Button", fill=(37, 99, 235), text_fill=(255, 255, 255)):
    d.rounded_rectangle((box[0] + 5, box[1] + 6, box[2] + 5, box[3] + 6), radius=14, fill=(14, 18, 28))
    d.rounded_rectangle(box, radius=14, fill=fill, outline=tuple(min(255, c + 80) for c in fill), width=2)
    tw = d.textlength(text, font=F_UI)
    d.text((box[0] + (box[2] - box[0] - tw) / 2, box[1] + (box[3] - box[1] - 18) / 2 - 1), text, fill=text_fill, font=F_UI)


def card(d: ImageDraw.ImageDraw, box, title="Card", fill=(52, 61, 82)):
    d.rounded_rectangle((box[0] + 4, box[1] + 6, box[2] + 4, box[3] + 6), radius=18, fill=(14, 18, 28))
    d.rounded_rectangle(box, radius=18, fill=fill, outline=(104, 122, 152), width=2)
    d.text((box[0] + 22, box[1] + 20), title, fill=(236, 242, 250), font=F_UI)
    d.rounded_rectangle((box[0] + 22, box[1] + 62, box[2] - 22, box[1] + 74), radius=6, fill=(92, 108, 136))
    d.rounded_rectangle((box[0] + 22, box[1] + 94, box[2] - 56, box[1] + 106), radius=6, fill=(82, 96, 122))


def tile_pattern(size: int = 40) -> Image.Image:
    p = Image.new("RGB", (size, size), (39, 104, 93))
    d = ImageDraw.Draw(p)
    d.line((0, size - 1, size - 1, 0), fill=(92, 205, 178), width=4)
    d.line((-size // 2, size - 1, size - 1, -size // 2), fill=(58, 148, 128), width=4)
    d.ellipse((8, 9, 17, 18), fill=(210, 255, 236))
    d.rectangle((28, 26, 35, 33), fill=(21, 66, 57))
    return p


def texture(img: Image.Image, box, seam: bool, shift_px: int = 11):
    pat = tile_pattern()
    x1, y1, x2, y2 = box
    region = Image.new("RGB", (x2 - x1, y2 - y1))
    split = region.width // 2
    for y in range(0, region.height, pat.height):
        for x in range(0, region.width, pat.width):
            tile = pat
            if seam and x >= split:
                shift = shift_px % pat.width
                tile = Image.new("RGB", pat.size)
                tile.paste(pat.crop((shift, 0, pat.width, pat.height)), (0, 0))
                tile.paste(pat.crop((0, 0, shift, pat.height)), (pat.width - shift, 0))
            region.paste(tile, (x, y))
    img.paste(region, (x1, y1))


def save_case(case_id_value: str, img: Image.Image, spec: dict[str, Any], expected_status: str, family: str) -> dict[str, Any]:
    img_path = IMG_DIR / f"{case_id_value}.png"
    spec_path = SPEC_DIR / f"{case_id_value}.json"
    img.save(img_path)
    spec_path.write_text(json.dumps(spec, indent=2), encoding="utf-8")
    return {"id": case_id_value, "family": family, "image": manifest_path(img_path), "spec": manifest_path(spec_path), "expected": {spec["checks"][0]["id"]: expected_status}}


def spec_for(case_id_value: str, components: list[dict[str, Any]], check: dict[str, Any]) -> dict[str, Any]:
    return {"version": 1, "id": case_id_value, "components": components, "checks": [check], "auto_checks": {"enabled": False}}


def build() -> list[dict[str, Any]]:
    rng = random.Random(SEED)
    rows: list[dict[str, Any]] = []
    colors = [(37, 99, 235), (14, 165, 233), (124, 58, 237), (16, 185, 129), (220, 78, 111)]

    for i, ok in enumerate(status_order(rng)):
        offset = 0 if ok else rng.choice([9, 13, -11])
        img, d = base("Holdout alignment", rng)
        y = rng.randint(190, 265)
        a = (rng.randint(120, 170), y, rng.randint(300, 350), y + rng.randint(56, 72))
        width = a[2] - a[0]
        b = (rng.randint(470, 540), y + offset, rng.randint(470, 540) + width, a[3] + offset)
        fill = rng.choice(colors)
        button(d, a, "Apply", fill); button(d, b, "Reset", fill)
        cid = case_id("alignment", i)
        spec = spec_for(cid, [{"id":"a","role":"button","box":list(a)}, {"id":"b","role":"button","box":list(b)}], {"id":"alignment", "type":"alignment", "targets":["a","b"], "edge":"top", "tolerance_px":4})
        rows.append(save_case(cid, img, spec, "pass" if ok else "fail", "alignment"))

    for i, ok in enumerate(status_order(rng)):
        img, d = base("Holdout size", rng)
        y = rng.randint(185, 250)
        a = (rng.randint(120, 170), y, rng.randint(310, 360), y + rng.randint(58, 74))
        aw, ah = a[2] - a[0], a[3] - a[1]
        dw = 0 if ok else rng.choice([18, -16, 24])
        dh = 0 if ok else rng.choice([0, 12, -10])
        bx = rng.randint(480, 540)
        b = (bx, y, bx + aw + dw, y + ah + dh)
        fill = rng.choice(colors)
        button(d, a, "Primary", fill); button(d, b, "Primary", fill)
        cid = case_id("size", i)
        spec = spec_for(cid, [{"id":"a","role":"button","box":list(a)}, {"id":"b","role":"button","box":list(b)}], {"id":"size", "type":"size_consistency", "targets":["a","b"], "dimensions":["width","height"], "tolerance_px":6})
        rows.append(save_case(cid, img, spec, "pass" if ok else "fail", "size"))

    for i, ok in enumerate(status_order(rng)):
        img, d = base("Holdout spacing", rng)
        w, h = rng.randint(150, 180), rng.randint(126, 158)
        y = rng.randint(205, 275)
        g1 = rng.choice([34, 42, 50, 58])
        g2 = g1 if ok else g1 + rng.choice([18, 24, -16, -20])
        x = rng.randint(105, 145)
        boxes = [(x, y, x+w, y+h), (x+w+g1, y, x+2*w+g1, y+h), (x+2*w+g1+g2, y, x+3*w+g1+g2, y+h)]
        for j, b in enumerate(boxes, 1):
            card(d, b, f"Plan {j}")
        cid = case_id("spacing", i)
        spec = spec_for(cid, [{"id":f"c{j}","role":"card","box":list(b)} for j,b in enumerate(boxes,1)], {"id":"spacing", "type":"spacing_consistency", "targets":["c1","c2","c3"], "axis":"x", "tolerance_px":8})
        rows.append(save_case(cid, img, spec, "pass" if ok else "fail", "spacing"))

    for i, ok in enumerate(status_order(rng)):
        img, d = base("Holdout padding", rng)
        px, py = rng.randint(250, 340), rng.randint(160, 220)
        pw, ph = rng.randint(350, 430), rng.randint(220, 285)
        panel = (px, py, px + pw, py + ph)
        d.rounded_rectangle(panel, radius=20, fill=(50, 58, 76), outline=(105, 122, 150), width=2)
        lp = rp = rng.randint(42, 58)
        tp = bp = rng.randint(34, 48)
        if not ok:
            if rng.choice([True, False]): lp += rng.choice([18, 22, 26])
            else: tp += rng.choice([14, 18, 22])
        inner = (panel[0]+lp, panel[1]+tp, panel[2]-rp, panel[3]-bp)
        d.rounded_rectangle(inner, radius=14, fill=(30, 36, 50), outline=(95, 110, 138), width=2)
        d.text((inner[0]+18, inner[1]+18), "Content block", fill=(220, 230, 244), font=F_BODY)
        cid = case_id("padding", i)
        spec = spec_for(cid, [{"id":"panel","role":"panel","box":list(panel)}, {"id":"content","role":"content","box":list(inner)}], {"id":"padding", "type":"padding_balance", "target":"panel", "content":"content", "tolerance_px":8})
        rows.append(save_case(cid, img, spec, "pass" if ok else "fail", "padding"))

    for i, ok in enumerate(status_order(rng)):
        img, d = base("Holdout centering", rng)
        bx, by = rng.randint(350, 480), rng.randint(170, 250)
        size = rng.choice([120, 132, 144, 152])
        box = (bx, by, bx + size, by + size)
        d.ellipse(box, fill=rng.choice(colors), outline=(220, 210, 255), width=3)
        dx, dy = (0, 0) if ok else rng.choice([(12, -9), (-11, 10), (15, 0), (0, -14)])
        cx, cy = (box[0]+box[2])//2 + dx, (box[1]+box[3])//2 + dy
        icon = (cx-33, cy-33, cx+33, cy+33)
        d.rounded_rectangle((cx-9, cy-33, cx+9, cy+33), radius=5, fill=(255,255,255))
        d.rounded_rectangle((cx-33, cy-9, cx+33, cy+9), radius=5, fill=(255,255,255))
        cid = case_id("centering", i)
        spec = spec_for(cid, [{"id":"button","role":"button","box":list(box)}, {"id":"icon","role":"icon","box":list(icon)}], {"id":"centering", "type":"content_centering", "target":"button", "content":"icon", "tolerance_px":6})
        rows.append(save_case(cid, img, spec, "pass" if ok else "fail", "centering"))

    for i, ok in enumerate(status_order(rng)):
        img, d = base("Holdout texture", rng)
        tx, ty = rng.randint(165, 285), rng.randint(200, 280)
        tw, th = rng.randint(390, 560), rng.randint(130, 205)
        box = (tx, ty, tx + tw, ty + th)
        texture(img, box, seam=not ok, shift_px=rng.choice([7, 9, 11, 13]))
        d.rectangle(box, outline=(190, 255, 235), width=2)
        cid = case_id("texture", i)
        spec = spec_for(cid, [{"id":"surface","role":"texture","box":list(box)}], {"id":"texture", "type":"texture_continuity", "target":"surface", "threshold":8.0})
        rows.append(save_case(cid, img, spec, "pass" if ok else "fail", "texture"))

    for i, ok in enumerate(status_order(rng)):
        img, d = base("Holdout contrast", rng)
        bx, by = rng.randint(300, 420), rng.randint(210, 285)
        box = (bx, by, bx + rng.randint(210, 270), by + rng.randint(58, 78))
        text_fill = rng.choice([(255,255,255), (235,242,255)]) if ok else rng.choice([(135, 140, 154), (145, 150, 165), (155, 158, 170)])
        fill = rng.choice([(38, 48, 72), (45, 55, 78), (55, 65, 88)]) if ok else rng.choice([(78, 86, 105), (86, 92, 110), (92, 96, 112)])
        button(d, box, "Readability", fill=fill, text_fill=text_fill)
        cid = case_id("contrast", i)
        spec = spec_for(cid, [{"id":"button","role":"button","box":list(box)}], {"id":"contrast", "type":"contrast", "target":"button", "min_ratio":4.5})
        rows.append(save_case(cid, img, spec, "pass" if ok else "fail", "contrast"))

    return rows


def main() -> None:
    global OUT, IMG_DIR, SPEC_DIR, MANIFEST, SEED
    parser = argparse.ArgumentParser()
    parser.add_argument("--seed", type=int, default=SEED)
    parser.add_argument("--out-dir", default=str(OUT))
    args = parser.parse_args()

    SEED = args.seed
    out_path = Path(args.out_dir)
    OUT = out_path if out_path.is_absolute() else ROOT / out_path
    IMG_DIR = OUT / "images"
    SPEC_DIR = OUT / "specs"
    MANIFEST = OUT / "manifest.jsonl"
    for directory in (IMG_DIR, SPEC_DIR):
        if directory.exists():
            shutil.rmtree(directory)
        directory.mkdir(parents=True, exist_ok=True)
    rows = build()
    with MANIFEST.open("w", encoding="utf-8") as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    print(f"Wrote {len(rows)} holdout cases to {MANIFEST} (seed={SEED})")


if __name__ == "__main__":
    main()
