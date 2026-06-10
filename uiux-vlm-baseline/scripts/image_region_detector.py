#!/usr/bin/env python3
"""Image-derived region detector for the synthetic UI/UX benchmarks.

The detector intentionally does not read manifest-provided `regions` or answer
truth fields. It uses visible badge circles, component pixels, the benchmark
question/category, and a small measurement contract to produce the same kind of
regions that a VLM/GUI localizer would normally provide to the CV measurer.
"""

from __future__ import annotations

from collections import deque
from dataclasses import dataclass
from typing import Any, Callable

from PIL import Image

Box = list[int]
PixelPred = Callable[[tuple[int, int, int]], bool]


@dataclass(frozen=True)
class Component:
    box: Box
    area: int

    @property
    def width(self) -> int:
        return self.box[2] - self.box[0]

    @property
    def height(self) -> int:
        return self.box[3] - self.box[1]

    @property
    def center(self) -> tuple[float, float]:
        return ((self.box[0] + self.box[2]) / 2, (self.box[1] + self.box[3]) / 2)


def clamp_box(box: Box, width: int, height: int) -> Box:
    x1, y1, x2, y2 = box
    return [max(0, int(x1)), max(0, int(y1)), min(width, int(x2)), min(height, int(y2))]


def expand_box(box: Box, pad: int, width: int, height: int) -> Box:
    return clamp_box([box[0] - pad, box[1] - pad, box[2] + pad, box[3] + pad], width, height)


def near_white(rgb: tuple[int, int, int]) -> bool:
    r, g, b = rgb
    return r > 235 and g > 235 and b > 235


def badge_pixel(rgb: tuple[int, int, int]) -> bool:
    return near_white(rgb)


def surface_pixel(rgb: tuple[int, int, int]) -> bool:
    """Pixels likely belonging to a UI component surface/outline.

    This excludes the dark page/panel background and near-white badges/text while
    retaining colored buttons, muted gray cards, texture tiles, and outlines.
    """
    if near_white(rgb):
        return False
    r, g, b = rgb
    if max(r, g, b) <= 64:
        return False
    # Avoid dark shadow/chrome pixels even if one channel barely crosses the
    # threshold; real component surfaces have either saturation or brightness.
    if max(r, g, b) < 72 and (max(r, g, b) - min(r, g, b)) < 18:
        return False
    return True


def outline_pixel(rgb: tuple[int, int, int]) -> bool:
    """Muted outline/content-line pixel used for inner padding boxes."""
    r, g, b = rgb
    if near_white(rgb):
        return False
    mx, mn = max(r, g, b), min(r, g, b)
    # Card fills top out around 72/78 in the current synthetic themes; start
    # above that so projections lock onto inner outlines/content, not the card
    # background itself.
    return 82 <= mx <= 170 and (mx - mn) <= 70


def connected_components(img: Image.Image, pred: PixelPred) -> list[Component]:
    w, h = img.size
    pix = img.load()
    visited = bytearray(w * h)
    comps: list[Component] = []
    for y in range(h):
        row = y * w
        for x in range(w):
            idx = row + x
            if visited[idx] or not pred(pix[x, y]):
                continue
            visited[idx] = 1
            q: deque[tuple[int, int]] = deque([(x, y)])
            min_x = max_x = x
            min_y = max_y = y
            area = 0
            while q:
                cx, cy = q.popleft()
                area += 1
                if cx < min_x:
                    min_x = cx
                if cx > max_x:
                    max_x = cx
                if cy < min_y:
                    min_y = cy
                if cy > max_y:
                    max_y = cy
                for nx, ny in ((cx - 1, cy), (cx + 1, cy), (cx, cy - 1), (cx, cy + 1)):
                    if nx < 0 or ny < 0 or nx >= w or ny >= h:
                        continue
                    nidx = ny * w + nx
                    if visited[nidx]:
                        continue
                    visited[nidx] = 1
                    if pred(pix[nx, ny]):
                        q.append((nx, ny))
            comps.append(Component([min_x, min_y, max_x + 1, max_y + 1], area))
    return comps


def detect_badges(img: Image.Image) -> list[Component]:
    comps = connected_components(img, badge_pixel)
    badges: list[Component] = []
    for c in comps:
        w, h = c.width, c.height
        if 34 <= w <= 60 and 34 <= h <= 60 and 0.72 <= (w / h) <= 1.28 and c.area >= 850:
            badges.append(c)
    # Stable order for label assignment.
    return sorted(badges, key=lambda c: (c.center[0], c.center[1]))


def detect_surface_components(img: Image.Image) -> list[Component]:
    comps = connected_components(img, surface_pixel)
    candidates: list[Component] = []
    for c in comps:
        if c.area < 900:
            continue
        if c.width < 45 or c.height < 35:
            continue
        if c.width > 900 or c.height > 420:
            continue
        candidates.append(c)
    return sorted(candidates, key=lambda c: c.area, reverse=True)


def label_sequence(measurement_type: str, question: str, category: str) -> list[str]:
    if measurement_type == "horizontal_gap_consistency":
        return ["A", "B", "C"]
    if measurement_type == "texture_seam":
        return ["C"]
    if measurement_type in {"icon_centering", "padding_symmetry"}:
        return ["A"]
    return ["A", "B"]


def assign_badges(badges: list[Component], labels: list[str]) -> dict[str, Component]:
    if len(badges) < len(labels):
        raise ValueError(f"needed {len(labels)} badge(s), detected {len(badges)}")
    chosen = sorted(badges, key=lambda c: c.center[0])[: len(labels)]
    return dict(zip(labels, chosen))


def contains_point(box: Box, point: tuple[float, float], pad: int = 0) -> bool:
    x, y = point
    return box[0] - pad <= x <= box[2] + pad and box[1] - pad <= y <= box[3] + pad


def refine_surface_box(img: Image.Image, box: Box) -> Box:
    """Shrink sparse artifacts (e.g. decorative stripes) to the dense surface."""
    x1, y1, x2, y2 = box
    pix = img.load()
    col_counts: list[tuple[int, int]] = []
    for x in range(x1, x2):
        col_counts.append((sum(1 for y in range(y1, y2) if surface_pixel(pix[x, y])), x))
    row_counts: list[tuple[int, int]] = []
    for y in range(y1, y2):
        row_counts.append((sum(1 for x in range(x1, x2) if surface_pixel(pix[x, y])), y))
    max_col = max((c for c, _x in col_counts), default=0)
    max_row = max((c for c, _y in row_counts), default=0)
    if max_col <= 0 or max_row <= 0:
        return box
    xs = [x for count, x in col_counts if count >= max(8, max_col * 0.40)]
    ys = [y for count, y in row_counts if count >= max(8, max_row * 0.40)]
    if len(xs) < 8 or len(ys) < 8:
        return box
    return [min(xs), min(ys), max(xs) + 1, max(ys) + 1]


def component_for_badge(badge: Component, components: list[Component], img: Image.Image) -> Component:
    center = badge.center
    containing = [c for c in components if contains_point(c.box, center, pad=10)]
    if containing:
        # Prefer the smallest surface containing the badge center; this avoids a
        # large parent/card when a more specific control is present.
        chosen = min(containing, key=lambda c: c.area)
    else:
        bx, by = center
        chosen = min(components, key=lambda c: (max(0, c.box[0] - bx, bx - c.box[2]) ** 2 + max(0, c.box[1] - by, by - c.box[3]) ** 2, c.area))
    refined = refine_surface_box(img, chosen.box)
    return Component(refined, chosen.area)


def detect_text_regions(img: Image.Image, assigned: dict[str, Component]) -> dict[str, Box]:
    w, h = img.size
    regions: dict[str, Box] = {}
    for label in ("A", "B"):
        badge = assigned[label].box
        label_x1 = badge[2] + 20
        regions[f"{label}_label"] = clamp_box([label_x1, badge[1] + 8, label_x1 + 180, badge[1] + 62], w, h)
        regions[f"{label}_field_text"] = clamp_box([label_x1 + 18, badge[1] + 54, label_x1 + 310, badge[1] + 132], w, h)
    # A broad card search box for diagnostics/compatibility.
    boxes = list(regions.values()) + [assigned["A"].box, assigned["B"].box]
    regions["card"] = expand_box([min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes)], 36, w, h)
    regions["crop"] = expand_box(regions["card"], 48, w, h)
    return regions


def detect_inner_box(img: Image.Image, card: Box) -> Box:
    w, h = img.size
    x1, y1, x2, y2 = card
    # Ignore the outer card border and badge-overlap zone.
    sx1, sx2 = x1 + 28, x2 - 24
    sy1, sy2 = y1 + 28, y2 - 22
    pix = img.load()
    col_counts: list[tuple[int, int]] = []
    for x in range(sx1, sx2):
        count = sum(1 for y in range(sy1, sy2) if outline_pixel(pix[x, y]))
        col_counts.append((count, x))
    row_counts: list[tuple[int, int]] = []
    for y in range(sy1, sy2):
        count = sum(1 for x in range(sx1, sx2) if outline_pixel(pix[x, y]))
        row_counts.append((count, y))
    if not col_counts or not row_counts:
        raise ValueError("empty card search area for inner box")
    # Vertical inner-outline edges have long runs; horizontal content lines are
    # short in a per-column projection. Pick the outermost strong peaks.
    min_col_strength = max(24, int((sy2 - sy1) * 0.18))
    xs = [x for count, x in col_counts if count >= min_col_strength]
    min_row_strength = max(60, int((sx2 - sx1) * 0.18))
    ys = [y for count, y in row_counts if count >= min_row_strength]
    if len(xs) < 2 or len(ys) < 2:
        raise ValueError(f"could not detect inner box outline: xs={len(xs)} ys={len(ys)}")
    return clamp_box([min(xs), min(ys), max(xs) + 1, max(ys) + 1], w, h)


def detect_regions(row: dict[str, Any], img: Image.Image, contract: dict[str, Any]) -> tuple[dict[str, Box], dict[str, Any]]:
    measurement_type = str(contract.get("type"))
    question = str(row.get("question", ""))
    category = str(row.get("category", ""))
    labels = label_sequence(measurement_type, question, category)
    badges = detect_badges(img)
    components = detect_surface_components(img)
    assigned = assign_badges(badges, labels)
    diag: dict[str, Any] = {
        "used_fields": ["image_pixels", "question", "category", "measurement.type", "measurement.tolerance_px"],
        "badge_count": len(badges),
        "badges": {k: v.box for k, v in assigned.items()},
        "surface_component_count": len(components),
    }

    w, h = img.size
    regions: dict[str, Box] = {}
    if measurement_type == "text_baseline":
        regions = detect_text_regions(img, assigned)
    else:
        comp_by_label = {label: component_for_badge(badge, components, img) for label, badge in assigned.items()}
        diag["component_boxes"] = {label: comp.box for label, comp in comp_by_label.items()}
        if measurement_type in {"top_edge_alignment", "component_size", "state_consistency"}:
            regions = {"A": comp_by_label["A"].box, "B": comp_by_label["B"].box}
            regions["crop"] = expand_box([min(regions["A"][0], regions["B"][0]), min(regions["A"][1], regions["B"][1]), max(regions["A"][2], regions["B"][2]), max(regions["A"][3], regions["B"][3])], 96, w, h)
        elif measurement_type == "horizontal_gap_consistency":
            regions = {label: comp_by_label[label].box for label in ("A", "B", "C")}
            boxes = [regions[label] for label in ("A", "B", "C")]
            regions["crop"] = expand_box([min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes)], 80, w, h)
        elif measurement_type == "texture_seam":
            regions = {"C": comp_by_label["C"].box}
            regions["crop"] = expand_box(regions["C"], 64, w, h)
        elif measurement_type == "icon_centering":
            button = comp_by_label["A"].box
            cx = (button[0] + button[2]) / 2
            cy = (button[1] + button[3]) / 2
            half = min(button[2] - button[0], button[3] - button[1]) * 0.36
            icon_search = clamp_box([int(cx - half), int(cy - half), int(cx + half), int(cy + half)], w, h)
            regions = {"button": button, "icon_search": icon_search, "crop": expand_box(button, 72, w, h)}
        elif measurement_type == "padding_symmetry":
            card = comp_by_label["A"].box
            inner = detect_inner_box(img, card)
            regions = {"card": card, "inner": inner, "crop": expand_box(card, 64, w, h)}
        else:
            raise ValueError(f"unsupported detector measurement.type: {measurement_type}")

    diag["regions"] = regions
    return regions, diag
