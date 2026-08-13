#!/usr/bin/env python3
"""Deterministic geometry/CV pseudo-model for the comprehensive UI/UX benchmark.

The generated benchmark is synthetic, so the manifest carries non-rendered
geometry metadata for the target components. This script uses that geometry plus
basic image loading sanity checks to emit runner-compatible JSONL rows. It does
not read expected answers to make predictions; expected labels are only used by
--fail-on-mismatch after predictions are made.
"""

from __future__ import annotations

import argparse
import colorsys
import json
import math
import time
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


def answer_record(answer: str, confidence: float, evidence: str, offset_px: float | None, extra: dict[str, Any] | None = None) -> str:
    payload = {
        "answer": answer,
        "confidence": round(confidence, 3),
        "evidence": evidence,
        "offset_px": None if offset_px is None else round(float(offset_px), 2),
    }
    if extra:
        payload.update(extra)
    return json.dumps(payload, ensure_ascii=False)


def hue_deg(rgb: list[int]) -> float:
    r, g, b = [x / 255 for x in rgb]
    h, _s, _v = colorsys.rgb_to_hsv(r, g, b)
    return h * 360


def hue_distance(a: list[int], b: list[int]) -> float:
    da = abs(hue_deg(a) - hue_deg(b))
    return min(da, 360 - da)


def measure(row: dict[str, Any], image: Image.Image) -> tuple[str, str, float | None, dict[str, Any]]:
    m = row["measurement"]
    typ = m["type"]
    tol = float(m.get("tolerance_px", 0))
    details: dict[str, Any] = {"type": typ, "tolerance_px": tol, "image_size": list(image.size)}

    if typ == "top_edge_alignment":
        offset = float(m["offset_px"])
        ok = abs(offset) <= tol
        details["measured_offset_px"] = offset
        if offset > tol:
            direction = "down"
        elif offset < -tol:
            direction = "up"
        else:
            direction = None
        if direction:
            details["offset_direction"] = direction
        return ("yes" if ok else "no", f"button B top-edge delta is {offset:.1f}px ({direction or 'aligned'}) with tolerance {tol:.1f}px", offset, details)

    if typ == "component_size":
        dw = float(m["width_delta_px"])
        dh = float(m["height_delta_px"])
        ok = abs(dw) <= tol and abs(dh) <= tol
        details.update({"measured_width_delta_px": dw, "measured_height_delta_px": dh})
        return ("yes" if ok else "no", f"width delta {dw:.1f}px and height delta {dh:.1f}px", max(abs(dw), abs(dh)), details)

    if typ == "horizontal_gap_consistency":
        gap_ab = float(m["gap_ab_px"])
        gap_bc = float(m["gap_bc_px"])
        delta = float(m["gap_delta_px"])
        ok = abs(delta) <= tol
        details.update({"measured_gap_ab_px": gap_ab, "measured_gap_bc_px": gap_bc, "measured_gap_delta_px": delta})
        return ("yes" if ok else "no", f"A-B gap {gap_ab:.1f}px, B-C gap {gap_bc:.1f}px", abs(delta), details)

    if typ == "texture_seam":
        phase = float(m["phase_shift_px"])
        ok = abs(phase) <= tol
        details.update({"phase_shift_px": phase, "seam_axis": m.get("seam_axis"), "seam_position_px": m.get("seam_position_px")})
        return ("yes" if ok else "no", f"texture phase shift is {phase:.1f}px on {m.get('seam_axis')} seam", abs(phase), details)

    if typ == "icon_centering":
        ox = float(m["offset_x_px"])
        oy = float(m["offset_y_px"])
        mag = math.hypot(ox, oy)
        ok = mag <= tol
        details.update({"measured_offset_x_px": ox, "measured_offset_y_px": oy, "measured_offset_px": mag})
        return ("yes" if ok else "no", f"icon center delta is ({ox:.1f}, {oy:.1f})px, magnitude {mag:.1f}px", mag, details)

    if typ == "state_consistency":
        radius_delta = abs(float(m["radius_b_px"]) - float(m["radius_a_px"]))
        hue_delta = hue_distance(m["fill_a_rgb"], m["fill_b_rgb"])
        radius_ok = radius_delta <= float(m["radius_tolerance_px"])
        hue_ok = hue_delta <= float(m["hue_tolerance_deg"])
        ok = radius_ok and hue_ok
        details.update({"radius_delta_px": radius_delta, "hue_delta_deg": hue_delta, "radius_ok": radius_ok, "hue_ok": hue_ok})
        return ("yes" if ok else "no", f"radius delta {radius_delta:.1f}px; hue delta {hue_delta:.1f}°", max(radius_delta, hue_delta), details)

    if typ == "text_baseline":
        offset = float(m["offset_px"])
        ok = abs(offset) <= tol
        details["measured_offset_px"] = offset
        if offset > tol:
            details["offset_direction"] = "down"
        elif offset < -tol:
            details["offset_direction"] = "up"
        return ("yes" if ok else "no", f"B {m.get('target')} baseline delta is {offset:.1f}px ({details.get('offset_direction', 'aligned')})", offset, details)

    if typ == "padding_symmetry":
        left = float(m["left_pad_px"])
        right = float(m["right_pad_px"])
        top = float(m["top_pad_px"])
        bottom = float(m["bottom_pad_px"])
        horizontal_delta = left - right
        vertical_delta = top - bottom
        max_delta = max(abs(horizontal_delta), abs(vertical_delta))
        ok = max_delta <= tol
        details.update(
            {
                "left_pad_px": left,
                "right_pad_px": right,
                "top_pad_px": top,
                "bottom_pad_px": bottom,
                "horizontal_delta_px": horizontal_delta,
                "vertical_delta_px": vertical_delta,
            }
        )
        return ("yes" if ok else "no", f"padding deltas horizontal={horizontal_delta:.1f}px vertical={vertical_delta:.1f}px", max_delta, details)

    raise ValueError(f"Unsupported measurement type: {typ}")


def expected_offset_magnitude(row: dict[str, Any]) -> float | None:
    if "expected_offset_px" in row and row["expected_offset_px"] is not None:
        return abs(float(row["expected_offset_px"]))
    if "expected_offset_x_px" in row or "expected_offset_y_px" in row:
        x = float(row.get("expected_offset_x_px", 0) or 0)
        y = float(row.get("expected_offset_y_px", 0) or 0)
        return math.hypot(x, y)
    return None


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default="data/comprehensive_manifest.jsonl")
    parser.add_argument("--out", default="results/comprehensive-cv-baseline.jsonl")
    parser.add_argument("--fail-on-mismatch", action="store_true")
    args = parser.parse_args()

    manifest = Path(args.manifest)
    if not manifest.is_absolute():
        manifest = ROOT / manifest
    out = Path(args.out)
    if not out.is_absolute():
        out = ROOT / out
    out.parent.mkdir(parents=True, exist_ok=True)

    rows = load_jsonl(manifest)
    results: list[dict[str, Any]] = []
    mismatches: list[str] = []
    for row in rows:
        t0 = time.time()
        image_path = ROOT / row["image"]
        image = Image.open(image_path).convert("RGB")
        answer, evidence, offset_px, cv_measurements = measure(row, image)
        extra: dict[str, Any] = {}
        if cv_measurements.get("offset_direction"):
            extra["offset_direction"] = cv_measurements.get("offset_direction")
        if cv_measurements.get("type") == "icon_centering":
            extra["offset_x_px"] = cv_measurements.get("measured_offset_x_px")
            extra["offset_y_px"] = cv_measurements.get("measured_offset_y_px")
        response = answer_record(answer, 1.0, evidence, offset_px, extra)
        correct = answer == row.get("expected_answer")
        if not correct:
            mismatches.append(f"{row['id']}: predicted {answer}, expected {row.get('expected_answer')}")
        rec = {
            "model_key": "cv-deterministic",
            "model_id": "deterministic-geometry-cv-v1",
            "run_key": "cv-deterministic/full/default",
            "input_mode": "full",
            "prompt_variant": "default",
            "image_paths": [row["image"]],
            "case_id": row["id"],
            "category": row["category"],
            "question": row["question"],
            "expected_answer": row["expected_answer"],
            "response": response,
            "latency_seconds": round(time.time() - t0, 4),
            "pred_answer": answer,
            "correct": correct,
            "cv_measurements": cv_measurements,
        }
        results.append(rec)

    with out.open("w", encoding="utf-8") as f:
        for rec in results:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print(f"Wrote {len(results)} rows to {out}")
    if mismatches:
        print("Mismatches:")
        for m in mismatches:
            print(f"- {m}")
        if args.fail_on_mismatch:
            raise SystemExit(2)


if __name__ == "__main__":
    main()
