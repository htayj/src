#!/usr/bin/env python3
"""Generic screenshot component detection for local UI feedback analysis."""

from __future__ import annotations

import colorsys
from collections import deque
from typing import Any, Callable

from PIL import Image

from ui_feedback_types import Box, DetectedComponent, box_area, box_center, clamp_box, iou

PixelPred = Callable[[tuple[int, int, int]], bool]


def near_white(rgb: tuple[int, int, int]) -> bool:
    r, g, b = rgb
    return r > 235 and g > 235 and b > 235


def generic_surface_pixel(rgb: tuple[int, int, int], bg: tuple[int, int, int]) -> bool:
    if near_white(rgb):
        # keep white content out of component surfaces; contrast checks inspect it separately.
        return False
    diff = sum(abs(int(rgb[i]) - int(bg[i])) for i in range(3)) / 3
    r, g, b = rgb
    h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
    # Require enough contrast from the page/background to avoid merging a
    # whole app shell panel into one component while still catching muted cards.
    return diff > 22 and v > 0.12 and (s > 0.08 or max(rgb) > max(bg) + 10 or diff > 25)


def connected_components(img: Image.Image, pred: PixelPred) -> list[tuple[Box, int]]:
    w, h = img.size
    pix = img.load()
    seen = bytearray(w * h)
    comps: list[tuple[Box, int]] = []
    for y in range(h):
        for x in range(w):
            idx = y * w + x
            if seen[idx] or not pred(pix[x, y]):
                continue
            seen[idx] = 1
            q: deque[tuple[int, int]] = deque([(x, y)])
            min_x = max_x = x
            min_y = max_y = y
            area = 0
            while q:
                cx, cy = q.popleft()
                area += 1
                min_x = min(min_x, cx); max_x = max(max_x, cx)
                min_y = min(min_y, cy); max_y = max(max_y, cy)
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if nx < 0 or ny < 0 or nx >= w or ny >= h:
                        continue
                    nidx = ny * w + nx
                    if seen[nidx]:
                        continue
                    seen[nidx] = 1
                    if pred(pix[nx, ny]):
                        q.append((nx, ny))
            comps.append(([min_x, min_y, max_x + 1, max_y + 1], area))
    return comps


def estimate_background(img: Image.Image) -> tuple[int, int, int]:
    w, h = img.size
    pix = img.load()
    samples = []
    for x in range(0, w, max(1, w // 40)):
        samples.append(pix[x, 0]); samples.append(pix[x, h - 1])
    for y in range(0, h, max(1, h // 40)):
        samples.append(pix[0, y]); samples.append(pix[w - 1, y])
    if not samples:
        return (0, 0, 0)
    return tuple(sorted(c[i] for c in samples)[len(samples) // 2] for i in range(3))  # type: ignore[return-value]


def classify_role(box: Box, area: int, img_size: tuple[int, int]) -> str:
    width, height = box[2] - box[0], box[3] - box[1]
    aspect = width / height if height else 999
    image_area = img_size[0] * img_size[1]
    if area > image_area * 0.18 or (width > img_size[0] * 0.45 and height > img_size[1] * 0.25):
        return "panel"
    if 1.8 <= aspect <= 6.0 and 35 <= height <= 140:
        return "button"
    if width >= 120 and height >= 100:
        return "card"
    if width <= 120 and height <= 120:
        return "icon_or_text"
    return "unknown"


def merge_overlapping(boxes: list[tuple[Box, int]], threshold: float = 0.35) -> list[tuple[Box, int]]:
    merged: list[tuple[Box, int]] = []
    for box, area in boxes:
        did_merge = False
        for idx, (existing, existing_area) in enumerate(merged):
            if iou(box, existing) >= threshold:
                merged[idx] = ([min(box[0], existing[0]), min(box[1], existing[1]), max(box[2], existing[2]), max(box[3], existing[3])], area + existing_area)
                did_merge = True
                break
        if not did_merge:
            merged.append((box, area))
    return merged


def detect_components(img: Image.Image, *, min_area: int = 600) -> list[DetectedComponent]:
    img = img.convert("RGB")
    w, h = img.size
    bg = estimate_background(img)
    raw = connected_components(img, lambda rgb: generic_surface_pixel(rgb, bg))
    candidates = []
    for box, area in raw:
        bw, bh = box[2] - box[0], box[3] - box[1]
        if area < min_area or bw < 18 or bh < 18:
            continue
        if bw > w * 0.95 and bh > h * 0.95:
            continue
        candidates.append((box, area))
    candidates = merge_overlapping(candidates)
    comps: list[DetectedComponent] = []
    for idx, (box, area) in enumerate(sorted(candidates, key=lambda item: (item[0][1], item[0][0]))):
        comps.append(DetectedComponent(id=f"auto_{idx+1}", box=box, role=classify_role(box, area, img.size), source="detector", score=1.0, meta={"area": area}))
    return comps


def component_from_spec(item: dict[str, Any], image_size: tuple[int, int]) -> DetectedComponent | None:
    if "box" not in item:
        return None
    cid = str(item.get("id") or f"spec_{abs(hash(str(item))) % 100000}")
    return DetectedComponent(
        id=cid,
        role=str(item.get("role", "unknown")),
        box=clamp_box([int(v) for v in item["box"]], image_size[0], image_size[1]),
        source="spec",
        label=item.get("label"),
        score=1.0,
    )


def in_region(box: Box, region: Box) -> bool:
    cx, cy = box_center(box)
    return region[0] <= cx <= region[2] and region[1] <= cy <= region[3]


def resolve_selector(selector: dict[str, Any], detected: list[DetectedComponent]) -> list[DetectedComponent]:
    role = selector.get("role")
    region = selector.get("region")
    matches = detected
    if role:
        matches = [c for c in matches if c.role == role]
    if region:
        reg = [int(v) for v in region]
        matches = [c for c in matches if in_region(c.box, reg)]
    return matches


def build_components(img: Image.Image, spec: dict[str, Any] | None = None) -> tuple[list[DetectedComponent], dict[str, Any]]:
    detected = detect_components(img)
    components: list[DetectedComponent] = []
    warnings: list[str] = []
    if spec:
        for item in spec.get("components", []):
            if "box" in item:
                comp = component_from_spec(item, img.size)
                if comp:
                    components.append(comp)
            elif "selector" in item:
                matches = resolve_selector(item["selector"], detected)
                if not matches:
                    warnings.append(f"selector for {item.get('id')} matched no components")
                    continue
                if item.get("id") and len(matches) == 1:
                    c = matches[0]
                    components.append(DetectedComponent(id=str(item["id"]), role=str(item.get("role", c.role)), box=c.box, source="selector", label=item.get("label"), score=c.score, meta=c.meta))
                else:
                    prefix = str(item.get("id") or "selector")
                    for idx, c in enumerate(matches, start=1):
                        components.append(DetectedComponent(id=f"{prefix}_{idx}", role=str(item.get("role", c.role)), box=c.box, source="selector", label=item.get("label"), score=c.score, meta=c.meta))
    # Include auto detections that do not duplicate explicit/spec components.
    for d in detected:
        if all(iou(d.box, c.box) < 0.85 for c in components):
            components.append(d)
    return components, {"used_fields": ["image_pixels", "spec.components" if spec else "auto_detection"], "warnings": warnings, "detected_count": len(detected)}


def component_map(components: list[DetectedComponent]) -> dict[str, DetectedComponent]:
    return {c.id: c for c in components}
