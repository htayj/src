#!/usr/bin/env python3
"""Build crop/full paired inputs for the comprehensive benchmark."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def clamp_box(box: list[int], width: int, height: int) -> list[int]:
    x1, y1, x2, y2 = [int(v) for v in box]
    return [max(0, x1), max(0, y1), min(width, x2), min(height, y2)]


def upscale_image(img: Image.Image, factor: int) -> Image.Image:
    if factor <= 1:
        return img
    return img.resize((img.width * factor, img.height * factor), Image.Resampling.NEAREST)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default="data/comprehensive_manifest.jsonl")
    parser.add_argument("--out-manifest", default="data/comprehensive_paired_manifest.jsonl")
    parser.add_argument("--crop-dir", default="data/comprehensive_crops")
    parser.add_argument("--upscale", type=int, default=2)
    parser.add_argument("--fail-on-missing-regions", action="store_true")
    args = parser.parse_args()

    manifest = Path(args.manifest)
    if not manifest.is_absolute():
        manifest = ROOT / manifest
    out_manifest = Path(args.out_manifest)
    if not out_manifest.is_absolute():
        out_manifest = ROOT / out_manifest
    crop_dir = Path(args.crop_dir)
    if not crop_dir.is_absolute():
        crop_dir = ROOT / crop_dir
    crop_dir.mkdir(parents=True, exist_ok=True)
    out_manifest.parent.mkdir(parents=True, exist_ok=True)

    out_rows: list[dict[str, Any]] = []
    missing: list[str] = []
    for row in load_jsonl(manifest):
        regions = row.get("regions") or {}
        crop_box = regions.get("crop")
        if not crop_box:
            missing.append(row["id"])
            if args.fail_on_missing_regions:
                continue
            crop_box = [0, 0, 1280, 768]
        full_path = ROOT / row["image"]
        image = Image.open(full_path).convert("RGB")
        crop_box = clamp_box(crop_box, image.width, image.height)
        crop = image.crop(tuple(crop_box))
        crop = upscale_image(crop, args.upscale)
        crop_rel = Path(args.crop_dir) / f"{row['id']}_crop_x{args.upscale}.png"
        crop_abs = ROOT / crop_rel
        crop_abs.parent.mkdir(parents=True, exist_ok=True)
        crop.save(crop_abs)
        paired = dict(row)
        paired["crop_image"] = str(crop_rel)
        paired["crop_box"] = crop_box
        paired["crop_upscale"] = args.upscale
        paired["input_mode"] = "paired"
        paired["images"] = [
            {"role": "full", "path": row["image"]},
            {"role": "crop", "path": str(crop_rel)},
        ]
        out_rows.append(paired)

    with out_manifest.open("w", encoding="utf-8") as f:
        for row in out_rows:
            f.write(json.dumps(row, ensure_ascii=False) + "\n")
    print(f"Wrote {len(out_rows)} paired rows to {out_manifest}")
    print(f"Crops: {crop_dir}")
    if missing:
        print("Rows missing regions.crop:")
        for mid in missing:
            print(f"- {mid}")
        if args.fail_on_missing_regions:
            raise SystemExit(2)


if __name__ == "__main__":
    main()
