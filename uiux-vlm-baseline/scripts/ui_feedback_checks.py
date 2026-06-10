#!/usr/bin/env python3
"""Objective UI/UX check implementations for screenshot feedback."""

from __future__ import annotations

import colorsys
import math
import statistics
from typing import Any

from PIL import Image

from ui_feedback_types import Box, CheckResult, DetectedComponent, box_center, box_wh, contrast_ratio, edge_value

ComponentMap = dict[str, DetectedComponent]


def _result(check: dict[str, Any], status: str, message: str, metrics: dict[str, Any], targets: list[str] | None = None, suggestion: str | None = None) -> CheckResult:
    severity = "fail" if status == "fail" else ("warning" if status == "warning" else ("error" if status == "error" else "info"))
    return CheckResult(
        id=str(check.get("id") or check.get("type") or "check"),
        type=str(check.get("type") or "unknown"),
        status=status,
        severity=severity,
        message=message,
        targets=targets or list(check.get("targets", [])) or ([str(check["target"])] if "target" in check else []),
        metrics=metrics,
        used_fields=["components", "image_pixels", "check"],
        suggestion=suggestion,
    )


def _components(ids: list[str], components: ComponentMap) -> list[DetectedComponent]:
    missing = [cid for cid in ids if cid not in components]
    if missing:
        raise KeyError(f"missing component(s): {missing}")
    return [components[cid] for cid in ids]


def alignment(check: dict[str, Any], components: ComponentMap, img: Image.Image) -> CheckResult:
    ids = [str(x) for x in check.get("targets", [])]
    comps = _components(ids, components)
    edge = str(check.get("edge", "top"))
    tol = float(check.get("tolerance_px", 6))
    vals = [edge_value(c.box, edge) for c in comps]
    delta = max(vals) - min(vals)
    status = "pass" if delta <= tol else "fail"
    suggestion = None if status == "pass" else f"Align {edge} values within {tol:g}px; current spread is {delta:.1f}px."
    return _result(check, status, f"{edge} alignment spread is {delta:.1f}px", {"edge": edge, "values_px": vals, "delta_px": delta, "tolerance_px": tol}, ids, suggestion)


def spacing_consistency(check: dict[str, Any], components: ComponentMap, img: Image.Image) -> CheckResult:
    ids = [str(x) for x in check.get("targets", [])]
    comps = _components(ids, components)
    axis = str(check.get("axis", "x"))
    tol = float(check.get("tolerance_px", 8))
    comps = sorted(comps, key=lambda c: box_center(c.box)[0 if axis == "x" else 1])
    gaps: list[float] = []
    for a, b in zip(comps, comps[1:]):
        gaps.append(float(b.box[0] - a.box[2]) if axis == "x" else float(b.box[1] - a.box[3]))
    delta = (max(gaps) - min(gaps)) if gaps else 0.0
    status = "pass" if delta <= tol else "fail"
    suggestion = None if status == "pass" else f"Make adjacent {axis}-axis gaps consistent; spread is {delta:.1f}px."
    return _result(check, status, f"{axis}-axis gap spread is {delta:.1f}px", {"axis": axis, "gaps_px": gaps, "delta_px": delta, "tolerance_px": tol}, ids, suggestion)


def size_consistency(check: dict[str, Any], components: ComponentMap, img: Image.Image) -> CheckResult:
    ids = [str(x) for x in check.get("targets", [])]
    comps = _components(ids, components)
    dims = check.get("dimensions") or ["width", "height"]
    tol = float(check.get("tolerance_px", 6))
    widths = [c.width for c in comps]
    heights = [c.height for c in comps]
    dw = max(widths) - min(widths) if "width" in dims else 0
    dh = max(heights) - min(heights) if "height" in dims else 0
    delta = max(dw, dh)
    status = "pass" if delta <= tol else "fail"
    return _result(check, status, f"size spread width={dw:.1f}px height={dh:.1f}px", {"widths_px": widths, "heights_px": heights, "width_delta_px": dw, "height_delta_px": dh, "tolerance_px": tol}, ids, None if status == "pass" else "Make compared components the same size or update the spec tolerance.")


def dominant_color(img: Image.Image, box: Box, skip_light: bool = False) -> tuple[float, float, float]:
    crop = img.crop(tuple(box)).convert("RGB")
    vals = []
    for rgb in crop.getdata():
        if skip_light and min(rgb) > 220:
            continue
        if max(rgb) < 20:
            continue
        vals.append(rgb)
    if not vals:
        return (0, 0, 0)
    return tuple(float(statistics.median([p[i] for p in vals])) for i in range(3))  # type: ignore[return-value]


def foreground_bbox(img: Image.Image, target: Box) -> Box | None:
    bg = dominant_color(img, target, skip_light=False)
    x1, y1, x2, y2 = target
    pix = img.convert("RGB").load()
    candidates: list[tuple[float, int, int, tuple[int, int, int]]] = []
    for y in range(y1 + 3, y2 - 3):
        for x in range(x1 + 3, x2 - 3):
            rgb = pix[x, y]
            diff = sum(abs(rgb[i] - bg[i]) for i in range(3)) / 3
            if diff > 35 and not (max(rgb) < 25):
                candidates.append((diff, x, y, rgb))
    if not candidates:
        return None
    # Focus on the strongest contrast cluster. This avoids treating antialiased
    # circular button edges as the centered foreground icon/content.
    candidates.sort(key=lambda item: item[0])
    threshold = candidates[int(len(candidates) * 0.70)][0]
    xs = [x for diff, x, _y, _rgb in candidates if diff >= threshold]
    ys = [y for diff, _x, y, _rgb in candidates if diff >= threshold]
    if not xs:
        return None
    return [min(xs), min(ys), max(xs) + 1, max(ys) + 1]


def padding_balance(check: dict[str, Any], components: ComponentMap, img: Image.Image) -> CheckResult:
    target_id = str(check.get("target"))
    target = components[target_id]
    tol = float(check.get("tolerance_px", 8))
    content_ref = check.get("content")
    if isinstance(content_ref, str) and content_ref != "auto" and content_ref in components:
        content = components[content_ref].box
    else:
        content = foreground_bbox(img, target.box)
    if content is None:
        return _result(check, "needs_review", "could not infer content bbox for padding", {"tolerance_px": tol}, [target_id])
    left = content[0] - target.box[0]
    right = target.box[2] - content[2]
    top = content[1] - target.box[1]
    bottom = target.box[3] - content[3]
    hdelta = left - right
    vdelta = top - bottom
    max_delta = max(abs(hdelta), abs(vdelta))
    status = "pass" if max_delta <= tol else "fail"
    return _result(check, status, f"padding deltas horizontal={hdelta:.1f}px vertical={vdelta:.1f}px", {"content_box": content, "left_px": left, "right_px": right, "top_px": top, "bottom_px": bottom, "horizontal_delta_px": hdelta, "vertical_delta_px": vdelta, "tolerance_px": tol}, [target_id], None if status == "pass" else "Balance inner content padding or adjust the container/content box.")


def content_centering(check: dict[str, Any], components: ComponentMap, img: Image.Image) -> CheckResult:
    target_id = str(check.get("target"))
    target = components[target_id]
    tol = float(check.get("tolerance_px", 6))
    content_ref = check.get("content")
    if isinstance(content_ref, str) and content_ref != "auto" and content_ref in components:
        content = components[content_ref].box
    else:
        content = foreground_bbox(img, target.box)
    if content is None:
        return _result(check, "needs_review", "could not infer centered content", {"tolerance_px": tol}, [target_id])
    tx, ty = box_center(target.box)
    cx, cy = box_center(content)
    dx, dy = cx - tx, cy - ty
    mag = math.hypot(dx, dy)
    status = "pass" if mag <= tol else "fail"
    return _result(check, status, f"content center offset is ({dx:.1f}, {dy:.1f})px", {"content_box": content, "offset_x_px": dx, "offset_y_px": dy, "offset_px": mag, "tolerance_px": tol}, [target_id], None if status == "pass" else f"Move content by approximately ({-dx:.1f}, {-dy:.1f})px.")


def mean_abs_diff(a: Image.Image, b: Image.Image) -> float:
    vals = []
    for pa, pb in zip(a.convert("RGB").getdata(), b.convert("RGB").getdata()):
        vals.append(sum(abs(pa[i] - pb[i]) for i in range(3)) / 3)
    return sum(vals) / len(vals) if vals else 0.0


def estimate_period(crop: Image.Image, axis: str, min_lag: int = 24, max_lag: int = 72) -> tuple[int, float]:
    candidates: list[tuple[float, int]] = []
    if axis == "x":
        for lag in range(min_lag, min(max_lag, crop.width - 20) + 1):
            width = crop.width - lag
            if width >= 20:
                candidates.append((mean_abs_diff(crop.crop((0, 0, width, crop.height)), crop.crop((lag, 0, lag + width, crop.height))), lag))
    else:
        for lag in range(min_lag, min(max_lag, crop.height - 20) + 1):
            height = crop.height - lag
            if height >= 20:
                candidates.append((mean_abs_diff(crop.crop((0, 0, crop.width, height)), crop.crop((0, lag, crop.width, lag + height))), lag))
    if not candidates:
        return 48, 0.0
    score, lag = min(candidates, key=lambda x: x[0])
    return lag, score


def periodic_mismatch(crop: Image.Image, period: int, axis: str) -> tuple[float, int | None]:
    scores = []
    if axis == "x":
        for x in range(period, crop.width - period):
            scores.append((mean_abs_diff(crop.crop((x - period, 0, x, crop.height)), crop.crop((x, 0, x + period, crop.height))), x))
    else:
        for y in range(period, crop.height - period):
            scores.append((mean_abs_diff(crop.crop((0, y - period, crop.width, y)), crop.crop((0, y, crop.width, y + period))), y))
    return max(scores, key=lambda item: item[0]) if scores else (0.0, None)


def texture_continuity(check: dict[str, Any], components: ComponentMap, img: Image.Image) -> CheckResult:
    target_id = str(check.get("target"))
    target = components[target_id]
    threshold = float(check.get("threshold", 8.0))
    x1, y1, x2, y2 = target.box
    pad = min(28, max(4, (x2 - x1) // 8), max(4, (y2 - y1) // 8))
    crop = img.crop((x1 + pad, y1 + pad, x2 - pad, y2 - pad)).convert("RGB")
    px, psx = estimate_period(crop, "x")
    py, psy = estimate_period(crop, "y")
    peak_x, pos_x = periodic_mismatch(crop, px, "x")
    peak_y, pos_y = periodic_mismatch(crop, py, "y")
    if min(psx, psy) > 15:
        return _result(check, "needs_review", "no strong periodic texture signal detected", {"periodicity_x": psx, "periodicity_y": psy}, [target_id])
    if peak_x >= peak_y:
        score, axis, pos = peak_x, "vertical", None if pos_x is None else x1 + pad + pos_x
    else:
        score, axis, pos = peak_y, "horizontal", None if pos_y is None else y1 + pad + pos_y
    status = "pass" if score <= threshold else "fail"
    return _result(check, status, f"texture continuity score {score:.2f}", {"continuity_score": score, "axis": axis, "position_px": pos, "estimated_period_x_px": px, "estimated_period_y_px": py, "threshold": threshold}, [target_id], None if status == "pass" else "Inspect the highlighted periodic discontinuity for a tiling seam.")


def contrast(check: dict[str, Any], components: ComponentMap, img: Image.Image) -> CheckResult:
    target_id = str(check.get("target"))
    target = components[target_id]
    min_ratio = float(check.get("min_ratio", 4.5))
    bg = dominant_color(img, target.box, skip_light=True)
    x1, y1, x2, y2 = target.box
    inset = max(4, min(10, (x2 - x1) // 12, (y2 - y1) // 8))
    pix = img.convert("RGB").load()
    candidates: list[tuple[int, int, int]] = []
    xs: list[int] = []
    ys: list[int] = []
    for y in range(y1 + inset, y2 - inset):
        for x in range(x1 + inset, x2 - inset):
            rgb = pix[x, y]
            diff = sum(abs(rgb[i] - bg[i]) for i in range(3)) / 3
            if diff > 22 and max(rgb) > 80:
                candidates.append(rgb); xs.append(x); ys.append(y)
    if not candidates:
        return _result(check, "needs_review", "could not infer foreground pixels for contrast", {"background_rgb": bg, "min_ratio": min_ratio}, [target_id])
    fg = tuple(float(statistics.median([p[i] for p in candidates])) for i in range(3))  # type: ignore[return-value]
    fg_box = [min(xs), min(ys), max(xs) + 1, max(ys) + 1]
    ratio = contrast_ratio(fg, bg)
    status = "pass" if ratio >= min_ratio else "fail"
    return _result(check, status, f"contrast ratio is {ratio:.2f}:1", {"foreground_box": fg_box, "foreground_rgb": fg, "background_rgb": bg, "contrast_ratio": ratio, "min_ratio": min_ratio}, [target_id], None if status == "pass" else f"Increase contrast to at least {min_ratio}:1.")


def hue(rgb: tuple[float, float, float]) -> float:
    h, _s, _v = colorsys.rgb_to_hsv(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255)
    return h * 360


def hue_dist(a: float, b: float) -> float:
    d = abs(a - b)
    return min(d, 360 - d)


def component_pixel(rgb: tuple[int, int, int]) -> bool:
    _h, _s, v = colorsys.rgb_to_hsv(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255)
    return v > 0.30


def corner_signature(img: Image.Image, box: Box) -> dict[str, float]:
    x1, y1, x2, y2 = box
    cw = min(40, x2 - x1)
    ch = min(16, y2 - y1)
    pix = img.convert("RGB").load()
    empties = []
    count = 0
    for yy in range(y1, y1 + ch):
        xs = [x for x in range(x2 - cw, x2) if component_pixel(pix[x, yy])]
        count += len(xs)
        empties.append(float(x2 - 1 - max(xs)) if xs else float(cw))
    return {"median_empty_px": statistics.median(empties) if empties else 0.0, "component_fraction": count / (cw * ch) if cw and ch else 0.0}


def visual_consistency(check: dict[str, Any], components: ComponentMap, img: Image.Image) -> CheckResult:
    ids = [str(x) for x in check.get("targets", [])]
    a, b = _components(ids, components)[:2]
    ht = float(check.get("hue_tolerance_deg", 22))
    rt = float(check.get("radius_tolerance_px", 8))
    ac = dominant_color(img, [a.box[0] + 42, a.box[1] + 28, min(a.box[0] + 92, a.box[2]), min(a.box[1] + 68, a.box[3])], skip_light=True)
    bc = dominant_color(img, [b.box[0] + 42, b.box[1] + 28, min(b.box[0] + 92, b.box[2]), min(b.box[1] + 68, b.box[3])], skip_light=True)
    hd = hue_dist(hue(ac), hue(bc))
    ca, cb = corner_signature(img, a.box), corner_signature(img, b.box)
    cd = max(abs(ca["median_empty_px"] - cb["median_empty_px"]), abs(ca["component_fraction"] - cb["component_fraction"]) * 100)
    status = "pass" if hd <= ht and cd <= rt else "fail"
    return _result(check, status, f"visual deltas hue={hd:.1f}°, corner={cd:.1f}", {"hue_delta_deg": hd, "corner_shape_delta": cd, "hue_tolerance_deg": ht, "radius_tolerance_px": rt}, ids)


def light_text_bbox(img: Image.Image, box: Box) -> Box | None:
    x1, y1, x2, y2 = box
    pix = img.convert("RGB").load()
    xs: list[int] = []
    ys: list[int] = []
    for y in range(y1, y2):
        for x in range(x1, x2):
            r, g, b = pix[x, y]
            if r > 120 and g > 125 and b > 130 and max(r, g, b) - min(r, g, b) < 90:
                xs.append(x); ys.append(y)
    if not xs:
        return None
    return [min(xs), min(ys), max(xs) + 1, max(ys) + 1]


def text_baseline(check: dict[str, Any], components: ComponentMap, img: Image.Image) -> CheckResult:
    ids = [str(x) for x in check.get("targets", [])]
    comps = _components(ids, components)
    tol = float(check.get("tolerance_px", 4))
    text_boxes = [light_text_bbox(img, c.box) or foreground_bbox(img, c.box) or c.box for c in comps]
    vals = [b[1] for b in text_boxes]
    delta = max(vals) - min(vals)
    status = "pass" if delta <= tol else "fail"
    return _result(check, status, f"text baseline/top spread is {delta:.1f}px", {"text_boxes": text_boxes, "values_px": vals, "delta_px": delta, "tolerance_px": tol}, ids)


CHECKS = {
    "alignment": alignment,
    "spacing_consistency": spacing_consistency,
    "size_consistency": size_consistency,
    "padding_balance": padding_balance,
    "content_centering": content_centering,
    "texture_continuity": texture_continuity,
    "contrast": contrast,
    "visual_consistency": visual_consistency,
    "text_baseline": text_baseline,
}


def run_check(check: dict[str, Any], components: ComponentMap, img: Image.Image) -> CheckResult:
    typ = str(check.get("type"))
    if typ not in CHECKS:
        return _result(check, "error", f"unsupported check type: {typ}", {}, list(check.get("targets", [])))
    try:
        return CHECKS[typ](check, components, img)
    except Exception as exc:
        return _result(check, "error", f"{type(exc).__name__}: {exc}", {}, list(check.get("targets", [])))
