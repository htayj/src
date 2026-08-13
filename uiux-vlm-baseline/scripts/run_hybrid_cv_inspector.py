#!/usr/bin/env python3
"""Run an honest hybrid VLM/CV-style inspector on UI/UX benchmark manifests.

This script supports two localization modes. `manifest` mode uses manifest
`regions` as a stand-in for a VLM/GUI detector. `detector` mode derives regions
from image pixels and visible badges. Both modes perform deterministic
CV/geometry measurements and intentionally avoid expected answers, `expected_*`
fields, and measurement truth deltas when predicting.
"""

from __future__ import annotations

import argparse
import colorsys
import json
import math
import statistics
import time
from pathlib import Path
from typing import Any

from PIL import Image

from image_region_detector import detect_regions

ROOT = Path(__file__).resolve().parents[1]


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    rows: list[dict[str, Any]] = []
    with path.open("r", encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if line:
                rows.append(json.loads(line))
    return rows


def rel(path: str) -> Path:
    p = Path(path)
    return p if p.is_absolute() else ROOT / p


CONTRACT_FIELDS = {"type", "tolerance_px", "hue_tolerance_deg", "radius_tolerance_px"}


def measurement_contract(row: dict[str, Any]) -> dict[str, Any]:
    measurement = row.get("measurement") or {}
    return {key: measurement[key] for key in CONTRACT_FIELDS if key in measurement}


def run_metadata(localization_mode: str) -> dict[str, str]:
    if localization_mode == "manifest":
        return {
            "model_id": "regions-plus-pixel-cv-v1",
            "run_key": "hybrid-vlm-cv/regions-cv/v1",
            "input_mode": "regions+image",
            "prompt_variant": "hybrid-cv-v1",
        }
    return {
        "model_id": "image-detector-plus-pixel-cv-v1",
        "run_key": "hybrid-vlm-cv/detector-cv/v1",
        "input_mode": "detector+image",
        "prompt_variant": "hybrid-cv-detector-v1",
    }


def resolve_regions(row: dict[str, Any], img: Image.Image, contract: dict[str, Any], localization_mode: str) -> tuple[dict[str, list[int]], dict[str, Any]]:
    if localization_mode == "manifest":
        return row.get("regions") or {}, {"region_source": "manifest", "used_fields": ["regions", "measurement.type", "measurement.tolerance_px"]}
    regions, diag = detect_regions(row, img, contract)
    diag["region_source"] = "detector"
    return regions, diag


def box_wh(box: list[int]) -> tuple[int, int]:
    return int(box[2]) - int(box[0]), int(box[3]) - int(box[1])


def direction_y(delta: float, tol: float = 0) -> str | None:
    if delta > tol:
        return "down"
    if delta < -tol:
        return "up"
    return None


def answer_json(answer: str, confidence: float, evidence: str, offset_px: float | None = None, **extra: Any) -> str:
    payload: dict[str, Any] = {
        "answer": answer,
        "confidence": round(confidence, 3),
        "evidence": evidence,
        "offset_px": None if offset_px is None else round(float(offset_px), 2),
    }
    for k, v in extra.items():
        if v is not None:
            payload[k] = v
    return json.dumps(payload, ensure_ascii=False)


def rgb_to_hue(rgb: tuple[float, float, float]) -> float:
    r, g, b = [max(0, min(255, x)) / 255 for x in rgb]
    h, _s, _v = colorsys.rgb_to_hsv(r, g, b)
    return h * 360


def hue_dist(a: float, b: float) -> float:
    d = abs(a - b)
    return min(d, 360 - d)


def median_color(img: Image.Image, box: list[int]) -> tuple[float, float, float]:
    crop = img.crop(tuple(box)).convert("RGB")
    rs: list[int] = []
    gs: list[int] = []
    bs: list[int] = []
    for r, g, b in crop.getdata():
        # Ignore white text/highlights and very dark shadows.
        if r > 235 and g > 235 and b > 235:
            continue
        if max(r, g, b) < 35:
            continue
        rs.append(r); gs.append(g); bs.append(b)
    if not rs:
        return (0, 0, 0)
    return (statistics.median(rs), statistics.median(gs), statistics.median(bs))


def color_mask_pixel(rgb: tuple[int, int, int]) -> bool:
    r, g, b = rgb
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    return s > 0.25 and v > 0.18 and not (r > 235 and g > 235 and b > 235)


def component_pixel(rgb: tuple[int, int, int]) -> bool:
    """Return true for bright/saturated component pixels, excluding dark chrome."""
    r, g, b = rgb
    _h, _s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    return v > 0.30


def corner_shape_signature(img: Image.Image, box: list[int]) -> dict[str, float]:
    """Measure a top-right rounded-corner profile without using declared radius.

    Bad radius defects in this benchmark show up as filled component pixels
    reaching much closer to the top-right corner. The left corner is avoided
    because badges overlap it.
    """
    x1, y1, x2, y2 = box
    corner_w = min(40, x2 - x1)
    corner_h = min(16, y2 - y1)
    empty_by_row: list[float] = []
    component_count = 0
    total = corner_w * corner_h
    for yy in range(y1, y1 + corner_h):
        xs = [x for x in range(x2 - corner_w, x2) if component_pixel(img.getpixel((x, yy)))]
        component_count += len(xs)
        empty_by_row.append(float(x2 - 1 - max(xs)) if xs else float(corner_w))
    return {
        "median_empty_px": statistics.median(empty_by_row) if empty_by_row else 0.0,
        "component_fraction": (component_count / total) if total else 0.0,
    }


def mean_abs_diff(a: Image.Image, b: Image.Image) -> float:
    vals: list[float] = []
    for pa, pb in zip(a.convert("RGB").getdata(), b.convert("RGB").getdata()):
        vals.append(sum(abs(pa[i] - pb[i]) for i in range(3)) / 3)
    return sum(vals) / len(vals) if vals else 0.0


def estimate_period(crop: Image.Image, axis: str, min_lag: int = 24, max_lag: int = 72) -> tuple[int, float]:
    candidates: list[tuple[float, int]] = []
    if axis == "x":
        for lag in range(min_lag, min(max_lag, crop.width - 20) + 1):
            width = crop.width - lag
            if width < 20:
                continue
            score = mean_abs_diff(crop.crop((0, 0, width, crop.height)), crop.crop((lag, 0, lag + width, crop.height)))
            candidates.append((score, lag))
    else:
        for lag in range(min_lag, min(max_lag, crop.height - 20) + 1):
            height = crop.height - lag
            if height < 20:
                continue
            score = mean_abs_diff(crop.crop((0, 0, crop.width, height)), crop.crop((0, lag, crop.width, lag + height)))
            candidates.append((score, lag))
    if not candidates:
        return 48, 0.0
    best_score, best_lag = min(candidates, key=lambda item: item[0])
    return best_lag, best_score


def periodic_mismatch(crop: Image.Image, period: int, axis: str) -> tuple[float, int | None]:
    scores: list[tuple[float, int]] = []
    if axis == "x":
        for x in range(period, crop.width - period):
            left = crop.crop((x - period, 0, x, crop.height))
            right = crop.crop((x, 0, x + period, crop.height))
            scores.append((mean_abs_diff(left, right), x))
    else:
        for y in range(period, crop.height - period):
            top = crop.crop((0, y - period, crop.width, y))
            bottom = crop.crop((0, y, crop.width, y + period))
            scores.append((mean_abs_diff(top, bottom), y))
    if not scores:
        return 0.0, None
    return max(scores, key=lambda item: item[0])


def texture_continuity_score(img: Image.Image, box: list[int]) -> dict[str, Any]:
    x1, y1, x2, y2 = box
    pad = min(28, max(4, (x2 - x1) // 8), max(4, (y2 - y1) // 8))
    crop = img.crop((x1 + pad, y1 + pad, x2 - pad, y2 - pad)).convert("RGB")
    period_x, period_x_score = estimate_period(crop, "x")
    period_y, period_y_score = estimate_period(crop, "y")
    peak_x, pos_x = periodic_mismatch(crop, period_x, "x")
    peak_y, pos_y = periodic_mismatch(crop, period_y, "y")
    if peak_x >= peak_y:
        axis = "vertical"
        peak = peak_x
        pos = None if pos_x is None else x1 + pad + pos_x
        period = period_x
        period_score = period_x_score
    else:
        axis = "horizontal"
        peak = peak_y
        pos = None if pos_y is None else y1 + pad + pos_y
        period = period_y
        period_score = period_y_score
    return {
        "continuity_score": peak,
        "axis": axis,
        "position_px": pos,
        "estimated_period_px": period,
        "periodicity_score": period_score,
        "crop_size": [crop.width, crop.height],
    }


def white_bbox(img: Image.Image, box: list[int]) -> list[int] | None:
    x1, y1, x2, y2 = box
    xs: list[int] = []
    ys: list[int] = []
    for y in range(y1, y2):
        for x in range(x1, x2):
            r, g, b = img.getpixel((x, y))
            if r > 235 and g > 235 and b > 235:
                xs.append(x); ys.append(y)
    if not xs:
        return None
    return [min(xs), min(ys), max(xs) + 1, max(ys) + 1]


def light_text_bbox(img: Image.Image, box: list[int]) -> list[int] | None:
    x1, y1, x2, y2 = box
    xs: list[int] = []
    ys: list[int] = []
    for y in range(y1, y2):
        for x in range(x1, x2):
            r, g, b = img.getpixel((x, y))
            if r > 120 and g > 125 and b > 130 and max(r, g, b) - min(r, g, b) < 80:
                xs.append(x); ys.append(y)
    if not xs:
        return None
    return [min(xs), min(ys), max(xs) + 1, max(ys) + 1]


def inspect(row: dict[str, Any], img: Image.Image, regions: dict[str, list[int]], contract: dict[str, Any], region_diag: dict[str, Any]) -> tuple[str, str, dict[str, Any], float | None, dict[str, Any]]:
    m = contract
    typ = m.get("type")
    tol = float(m.get("tolerance_px", 6))
    details: dict[str, Any] = {
        "type": typ,
        "tolerance_px": tol,
        "region_source": region_diag.get("region_source"),
        "used_fields": list(region_diag.get("used_fields", [])),
        "region_diagnostics": region_diag,
    }
    used_fields = details["used_fields"]

    if typ == "top_edge_alignment":
        a, b = regions["A"], regions["B"]
        delta = float(b[1] - a[1])
        ok = abs(delta) <= tol
        details["measured_offset_px"] = delta
        return ("yes" if ok else "no", f"B top edge is {delta:.1f}px relative to A", details, delta, {"offset_direction": direction_y(delta, tol)})

    if typ == "component_size":
        a, b = regions["A"], regions["B"]
        aw, ah = box_wh(a); bw, bh = box_wh(b)
        dw, dh = float(bw - aw), float(bh - ah)
        ok = abs(dw) <= tol and abs(dh) <= tol
        details.update({"width_delta_px": dw, "height_delta_px": dh})
        return ("yes" if ok else "no", f"width delta {dw:.1f}px, height delta {dh:.1f}px", details, max(abs(dw), abs(dh)), {})

    if typ == "horizontal_gap_consistency":
        a, b, c = regions["A"], regions["B"], regions["C"]
        gap_ab = float(b[0] - a[2])
        gap_bc = float(c[0] - b[2])
        delta = gap_bc - gap_ab
        ok = abs(delta) <= tol
        details.update({"gap_ab_px": gap_ab, "gap_bc_px": gap_bc, "gap_delta_px": delta})
        return ("yes" if ok else "no", f"A-B gap {gap_ab:.1f}px, B-C gap {gap_bc:.1f}px", details, abs(delta), {})

    if typ == "texture_seam":
        box = regions.get("C") or regions.get("crop")
        continuity = texture_continuity_score(img, box)
        score = float(continuity["continuity_score"])
        threshold = 8.0
        ok = score <= threshold
        details.update({"texture_continuity": continuity, "threshold": threshold})
        return ("yes" if ok else "no", f"texture periodic-continuity score {score:.2f} (threshold {threshold:.2f})", details, score, {})

    if typ == "icon_centering":
        button = regions["button"]
        search = regions.get("icon_search", button)
        bb = white_bbox(img, search)
        if bb is None:
            return "no", "no white icon pixels found", details, None, {}
        cx = (button[0] + button[2]) / 2
        cy = (button[1] + button[3]) / 2
        bx = (bb[0] + bb[2]) / 2
        by = (bb[1] + bb[3]) / 2
        dx, dy = bx - cx, by - cy
        mag = math.hypot(dx, dy)
        # Filled glyphs can have asymmetric optical mass, so allow a small
        # generic optical-centering tolerance without reading case metadata.
        icon_tol = max(tol, 7.0)
        ok = mag <= icon_tol
        details.update({"icon_bbox": bb, "offset_x_px": dx, "offset_y_px": dy, "offset_px": mag, "icon_tolerance_px": icon_tol})
        return ("yes" if ok else "no", f"icon bbox center offset ({dx:.1f}, {dy:.1f})px", details, mag, {"offset_x_px": dx, "offset_y_px": dy})

    if typ == "state_consistency":
        a, b = regions["A"], regions["B"]
        # Sample colored patches away from text and badge.
        ap = [a[0] + 42, a[1] + 28, a[0] + 92, a[1] + 68]
        bp = [b[0] + 42, b[1] + 28, b[0] + 92, b[1] + 68]
        ah = rgb_to_hue(median_color(img, ap))
        bh = rgb_to_hue(median_color(img, bp))
        hd = hue_dist(ah, bh)
        corner_a = corner_shape_signature(img, a)
        corner_b = corner_shape_signature(img, b)
        median_empty_delta = abs(corner_b["median_empty_px"] - corner_a["median_empty_px"])
        corner_fill_delta = abs(corner_b["component_fraction"] - corner_a["component_fraction"]) * 100.0
        corner_shape_delta = max(median_empty_delta, corner_fill_delta)
        used_fields.extend(["measurement.hue_tolerance_deg", "measurement.radius_tolerance_px"])
        hue_ok = hd <= float(m.get("hue_tolerance_deg", 22))
        radius_ok = corner_shape_delta <= float(m.get("radius_tolerance_px", 8))
        ok = hue_ok and radius_ok
        details.update({"hue_delta_deg": hd, "corner_a": corner_a, "corner_b": corner_b, "corner_median_empty_delta_px": median_empty_delta, "corner_fill_delta_pct": corner_fill_delta, "corner_shape_delta": corner_shape_delta, "hue_ok": hue_ok, "radius_ok": radius_ok})
        return ("yes" if ok else "no", f"hue delta {hd:.1f}°, top-right corner shape delta {corner_shape_delta:.1f}", details, max(hd, corner_shape_delta), {})

    if typ == "text_baseline":
        # Do not read target metadata. Treat the task as a general A/B text
        # alignment inspection and measure every text pair whose regions are
        # available; answer "no" if any relevant pair is outside tolerance.
        pairs: list[tuple[str, list[int], list[int]]] = []
        if "A_label" in regions and "B_label" in regions:
            pairs.append(("label", regions["A_label"], regions["B_label"]))
        if "A_field_text" in regions and "B_field_text" in regions:
            pairs.append(("field", regions["A_field_text"], regions["B_field_text"]))
        if not pairs:
            raise ValueError("text_baseline requires A/B label or field text regions")
        measurements: list[dict[str, Any]] = []
        for name, a_box, b_box in pairs:
            abb = light_text_bbox(img, a_box) or a_box
            bbb = light_text_bbox(img, b_box) or b_box
            delta = float(bbb[1] - abb[1])
            measurements.append({"target": name, "A_text_bbox": abb, "B_text_bbox": bbb, "measured_offset_px": delta})
        worst = max(measurements, key=lambda item: abs(float(item["measured_offset_px"])))
        delta = float(worst["measured_offset_px"])
        ok = abs(delta) <= tol
        details.update({"text_measurements": measurements, "worst_target": worst["target"], "measured_offset_px": delta})
        return ("yes" if ok else "no", f"B {worst['target']} text top is {delta:.1f}px relative to A", details, delta, {"offset_direction": direction_y(delta, tol)})

    if typ == "padding_symmetry":
        card, inner = regions["card"], regions["inner"]
        left = float(inner[0] - card[0]); right = float(card[2] - inner[2])
        top = float(inner[1] - card[1]); bottom = float(card[3] - inner[3])
        hdelta = left - right
        vdelta = top - bottom
        max_delta = max(abs(hdelta), abs(vdelta))
        ok = max_delta <= tol
        details.update({"left_pad_px": left, "right_pad_px": right, "top_pad_px": top, "bottom_pad_px": bottom, "horizontal_delta_px": hdelta, "vertical_delta_px": vdelta})
        return ("yes" if ok else "no", f"padding deltas horizontal={hdelta:.1f}px vertical={vdelta:.1f}px", details, max_delta, {})

    raise ValueError(f"Unsupported or missing measurement.type: {typ}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--case", action="append")
    parser.add_argument("--localization-mode", choices=["manifest", "detector"], default="manifest")
    parser.add_argument("--fail-on-mismatch", action="store_true")
    args = parser.parse_args()

    manifest = rel(args.manifest)
    rows = load_jsonl(manifest)
    if args.case:
        keep = set(args.case)
        rows = [r for r in rows if r["id"] in keep]
    out = rel(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)

    meta = run_metadata(args.localization_mode)
    results: list[dict[str, Any]] = []
    mismatches: list[str] = []
    for row in rows:
        t0 = time.time()
        img = Image.open(rel(row["image"])).convert("RGB")
        try:
            contract = measurement_contract(row)
            regions, region_diag = resolve_regions(row, img, contract, args.localization_mode)
            answer, evidence, details, offset_px, extra = inspect(row, img, regions, contract, region_diag)
            response = answer_json(answer, 1.0, evidence, offset_px, **extra)
            correct = answer == row.get("expected_answer")
            rec = {
                "model_key": "hybrid-vlm-cv",
                "model_id": meta["model_id"],
                "run_key": meta["run_key"],
                "input_mode": meta["input_mode"],
                "prompt_variant": meta["prompt_variant"],
                "image_paths": [row["image"]],
                "case_id": row["id"],
                "category": row["category"],
                "question": row["question"],
                "expected_answer": row.get("expected_answer"),
                "response": response,
                "latency_seconds": round(time.time() - t0, 4),
                "pred_answer": answer,
                "correct": correct,
                "hybrid_measurements": details,
            }
            if not correct:
                mismatches.append(f"{row['id']}: predicted {answer}, expected {row.get('expected_answer')} ({evidence})")
        except Exception as exc:
            rec = {
                "model_key": "hybrid-vlm-cv",
                "model_id": meta["model_id"],
                "run_key": meta["run_key"],
                "input_mode": meta["input_mode"],
                "prompt_variant": meta["prompt_variant"],
                "case_id": row["id"],
                "category": row.get("category"),
                "question": row.get("question"),
                "expected_answer": row.get("expected_answer"),
                "error": f"{type(exc).__name__}: {exc}",
                "correct": False,
            }
            mismatches.append(f"{row['id']}: ERROR {rec['error']}")
        results.append(rec)

    with out.open("w", encoding="utf-8") as f:
        for rec in results:
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print(f"Wrote {len(results)} rows to {out}")
    if mismatches:
        print("Mismatches/errors:")
        for m in mismatches:
            print(f"- {m}")
        if args.fail_on_mismatch:
            raise SystemExit(2)


if __name__ == "__main__":
    main()
