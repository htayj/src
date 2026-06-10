#!/usr/bin/env python3
"""Run the generic UI feedback engine against benchmark manifests without truth leakage."""

from __future__ import annotations

import argparse
import json
import math
import time
from pathlib import Path
from typing import Any

from PIL import Image

from image_region_detector import detect_regions
from run_hybrid_cv_inspector import measurement_contract
from ui_feedback_checks import run_check
from ui_feedback_types import DetectedComponent, box_center

ROOT = Path(__file__).resolve().parents[1]


def rel(path: str | Path) -> Path:
    p = Path(path)
    return p if p.is_absolute() else ROOT / p


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def white_bbox(img: Image.Image, box: list[int]) -> list[int] | None:
    x1, y1, x2, y2 = box
    pix = img.convert("RGB").load()
    xs: list[int] = []
    ys: list[int] = []
    for y in range(y1, y2):
        for x in range(x1, x2):
            r, g, b = pix[x, y]
            if r > 235 and g > 235 and b > 235:
                xs.append(x); ys.append(y)
    if not xs:
        return None
    return [min(xs), min(ys), max(xs) + 1, max(ys) + 1]


def direction_y(delta: float, tol: float) -> str | None:
    if delta > tol:
        return "down"
    if delta < -tol:
        return "up"
    return None


def components_from_regions(regions: dict[str, list[int]], typ: str, img: Image.Image) -> dict[str, DetectedComponent]:
    comps: dict[str, DetectedComponent] = {}
    if typ in {"top_edge_alignment", "component_size", "state_consistency"}:
        comps = {"A": DetectedComponent("A", regions["A"], "component"), "B": DetectedComponent("B", regions["B"], "component")}
    elif typ == "horizontal_gap_consistency":
        comps = {k: DetectedComponent(k, regions[k], "card") for k in ["A", "B", "C"]}
    elif typ == "texture_seam":
        comps = {"C": DetectedComponent("C", regions["C"], "textured")}
    elif typ == "icon_centering":
        comps = {"A": DetectedComponent("A", regions["button"], "button")}
        bb = white_bbox(img, regions.get("icon_search", regions["button"]))
        if bb:
            comps["A_content"] = DetectedComponent("A_content", bb, "icon")
    elif typ == "padding_symmetry":
        comps = {"A": DetectedComponent("A", regions["card"], "card"), "A_content": DetectedComponent("A_content", regions["inner"], "content")}
    elif typ == "text_baseline":
        for key in ["A_label", "B_label", "A_field_text", "B_field_text"]:
            if key in regions:
                comps[key] = DetectedComponent(key, regions[key], "text")
    return comps


def answer_payload(answer: str, confidence: float, evidence: str, offset_px: float | None = None, **extra: Any) -> str:
    payload = {"answer": answer, "confidence": round(confidence, 3), "evidence": evidence, "offset_px": None if offset_px is None else round(float(offset_px), 2)}
    payload.update({k: v for k, v in extra.items() if v is not None})
    return json.dumps(payload, ensure_ascii=False)


def predict(row: dict[str, Any]) -> tuple[str, str, dict[str, Any], float | None, dict[str, Any]]:
    img = Image.open(rel(row["image"])).convert("RGB")
    contract = measurement_contract(row)
    typ = str(contract.get("type"))
    tol = float(contract.get("tolerance_px", 6))
    regions, diag = detect_regions(row, img, contract)
    comps = components_from_regions(regions, typ, img)

    if typ == "top_edge_alignment":
        check = {"id": row.get("id", "alignment"), "type": "alignment", "targets": ["A", "B"], "edge": "top", "tolerance_px": tol}
        result = run_check(check, comps, img)
        delta = float(comps["B"].box[1] - comps["A"].box[1])
        answer = "yes" if result.status == "pass" else "no"
        return answer, result.message, {"check": result.__dict__, "regions": regions, "diagnostics": diag}, delta, {"offset_direction": direction_y(delta, tol)}
    if typ == "component_size":
        result = run_check({"id": row.get("id", "size"), "type": "size_consistency", "targets": ["A", "B"], "dimensions": ["width", "height"], "tolerance_px": tol}, comps, img)
        answer = "yes" if result.status == "pass" else "no"
        off = max(abs(float(result.metrics.get("width_delta_px", 0))), abs(float(result.metrics.get("height_delta_px", 0))))
        return answer, result.message, {"check": result.__dict__, "regions": regions, "diagnostics": diag}, off, {}
    if typ == "horizontal_gap_consistency":
        result = run_check({"id": row.get("id", "spacing"), "type": "spacing_consistency", "targets": ["A", "B", "C"], "axis": "x", "tolerance_px": tol}, comps, img)
        answer = "yes" if result.status == "pass" else "no"
        return answer, result.message, {"check": result.__dict__, "regions": regions, "diagnostics": diag}, float(result.metrics.get("delta_px", 0)), {}
    if typ == "texture_seam":
        result = run_check({"id": row.get("id", "texture"), "type": "texture_continuity", "target": "C", "threshold": 8.0}, comps, img)
        answer = "yes" if result.status == "pass" else "no"
        return answer, result.message, {"check": result.__dict__, "regions": regions, "diagnostics": diag}, float(result.metrics.get("continuity_score", 0)), {}
    if typ == "icon_centering":
        result = run_check({"id": row.get("id", "centering"), "type": "content_centering", "target": "A", "content": "A_content", "tolerance_px": max(tol, 7.0)}, comps, img)
        answer = "yes" if result.status == "pass" else "no"
        metrics = result.metrics
        return answer, result.message, {"check": result.__dict__, "regions": regions, "diagnostics": diag}, float(metrics.get("offset_px", 0)), {"offset_x_px": metrics.get("offset_x_px"), "offset_y_px": metrics.get("offset_y_px")}
    if typ == "state_consistency":
        result = run_check({"id": row.get("id", "visual"), "type": "visual_consistency", "targets": ["A", "B"], "hue_tolerance_deg": contract.get("hue_tolerance_deg", 22), "radius_tolerance_px": contract.get("radius_tolerance_px", 8)}, comps, img)
        answer = "yes" if result.status == "pass" else "no"
        off = max(float(result.metrics.get("hue_delta_deg", 0)), float(result.metrics.get("corner_shape_delta", 0)))
        return answer, result.message, {"check": result.__dict__, "regions": regions, "diagnostics": diag}, off, {}
    if typ == "text_baseline":
        checks = []
        if "A_label" in comps and "B_label" in comps:
            checks.append(run_check({"id": "label", "type": "text_baseline", "targets": ["A_label", "B_label"], "tolerance_px": tol}, comps, img))
        if "A_field_text" in comps and "B_field_text" in comps:
            checks.append(run_check({"id": "field", "type": "text_baseline", "targets": ["A_field_text", "B_field_text"], "tolerance_px": tol}, comps, img))
        worst = max(checks, key=lambda r: abs(float(r.metrics.get("delta_px", 0))))
        delta = float(worst.metrics.get("delta_px", 0))
        answer = "yes" if all(r.status == "pass" for r in checks) else "no"
        return answer, worst.message, {"checks": [r.__dict__ for r in checks], "regions": regions, "diagnostics": diag}, delta, {"offset_direction": direction_y(delta, tol)}
    if typ == "padding_symmetry":
        result = run_check({"id": row.get("id", "padding"), "type": "padding_balance", "target": "A", "content": "A_content", "tolerance_px": tol}, comps, img)
        answer = "yes" if result.status == "pass" else "no"
        off = max(abs(float(result.metrics.get("horizontal_delta_px", 0))), abs(float(result.metrics.get("vertical_delta_px", 0))))
        return answer, result.message, {"check": result.__dict__, "regions": regions, "diagnostics": diag}, off, {}
    raise ValueError(f"unsupported measurement type: {typ}")


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--out", required=True)
    parser.add_argument("--case", action="append")
    parser.add_argument("--fail-on-mismatch", action="store_true")
    args = parser.parse_args()
    rows = load_jsonl(rel(args.manifest))
    if args.case:
        keep = set(args.case)
        rows = [r for r in rows if r["id"] in keep]
    out = rel(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    mismatches: list[str] = []
    with out.open("w", encoding="utf-8") as f:
        for row in rows:
            t0 = time.time()
            try:
                answer, evidence, measurements, offset_px, extra = predict(row)
                response = answer_payload(answer, 1.0, evidence, offset_px, **extra)
                correct = answer == row.get("expected_answer")
                rec = {"model_key": "ui-feedback", "model_id": "ui-feedback-tool-v1", "run_key": "ui-feedback/detector/v1", "input_mode": "detector+image", "prompt_variant": "ui-feedback-v1", "image_paths": [row["image"]], "case_id": row["id"], "category": row.get("category"), "question": row.get("question"), "expected_answer": row.get("expected_answer"), "response": response, "latency_seconds": round(time.time() - t0, 4), "pred_answer": answer, "correct": correct, "ui_feedback_measurements": measurements}
                if not correct:
                    mismatches.append(f"{row['id']}: predicted {answer}, expected {row.get('expected_answer')} ({evidence})")
            except Exception as exc:
                rec = {"model_key": "ui-feedback", "model_id": "ui-feedback-tool-v1", "run_key": "ui-feedback/detector/v1", "input_mode": "detector+image", "prompt_variant": "ui-feedback-v1", "case_id": row.get("id"), "category": row.get("category"), "question": row.get("question"), "expected_answer": row.get("expected_answer"), "error": f"{type(exc).__name__}: {exc}", "correct": False}
                mismatches.append(f"{row.get('id')}: ERROR {rec['error']}")
            f.write(json.dumps(rec, ensure_ascii=False) + "\n")
    print(f"Wrote {len(rows)} rows to {out}")
    if mismatches:
        print("Mismatches/errors:")
        for m in mismatches:
            print(f"- {m}")
        if args.fail_on_mismatch:
            raise SystemExit(2)


if __name__ == "__main__":
    main()
