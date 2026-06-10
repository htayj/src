#!/usr/bin/env python3
"""Shared types and geometry/color helpers for UI feedback analysis."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any

Box = list[int]


@dataclass
class DetectedComponent:
    id: str
    box: Box
    role: str = "unknown"
    source: str = "detector"
    label: str | None = None
    score: float = 1.0
    meta: dict[str, Any] = field(default_factory=dict)

    @property
    def width(self) -> int:
        return self.box[2] - self.box[0]

    @property
    def height(self) -> int:
        return self.box[3] - self.box[1]


@dataclass
class CheckResult:
    id: str
    type: str
    status: str
    severity: str
    message: str
    targets: list[str] = field(default_factory=list)
    metrics: dict[str, Any] = field(default_factory=dict)
    used_fields: list[str] = field(default_factory=list)
    suggestion: str | None = None


@dataclass
class Issue:
    check_id: str
    severity: str
    message: str
    suggestion: str | None = None


def clamp_box(box: Box, width: int, height: int) -> Box:
    return [max(0, int(box[0])), max(0, int(box[1])), min(width, int(box[2])), min(height, int(box[3]))]


def expand_box(box: Box, pad: int, width: int, height: int) -> Box:
    return clamp_box([box[0] - pad, box[1] - pad, box[2] + pad, box[3] + pad], width, height)


def union_box(boxes: list[Box]) -> Box:
    return [min(b[0] for b in boxes), min(b[1] for b in boxes), max(b[2] for b in boxes), max(b[3] for b in boxes)]


def box_wh(box: Box) -> tuple[int, int]:
    return box[2] - box[0], box[3] - box[1]


def box_center(box: Box) -> tuple[float, float]:
    return ((box[0] + box[2]) / 2, (box[1] + box[3]) / 2)


def box_area(box: Box) -> int:
    return max(0, box[2] - box[0]) * max(0, box[3] - box[1])


def iou(a: Box, b: Box) -> float:
    ix1, iy1 = max(a[0], b[0]), max(a[1], b[1])
    ix2, iy2 = min(a[2], b[2]), min(a[3], b[3])
    inter = box_area([ix1, iy1, ix2, iy2])
    denom = box_area(a) + box_area(b) - inter
    return inter / denom if denom else 0.0


def edge_value(box: Box, edge: str) -> float:
    if edge == "top":
        return float(box[1])
    if edge == "bottom":
        return float(box[3])
    if edge == "left":
        return float(box[0])
    if edge == "right":
        return float(box[2])
    if edge == "center_x":
        return box_center(box)[0]
    if edge == "center_y":
        return box_center(box)[1]
    raise ValueError(f"unknown edge: {edge}")


def relative_luminance(rgb: tuple[float, float, float]) -> float:
    vals = []
    for c in rgb:
        v = max(0.0, min(1.0, c / 255.0))
        vals.append(v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4)
    return 0.2126 * vals[0] + 0.7152 * vals[1] + 0.0722 * vals[2]


def contrast_ratio(a: tuple[float, float, float], b: tuple[float, float, float]) -> float:
    l1 = relative_luminance(a)
    l2 = relative_luminance(b)
    hi, lo = max(l1, l2), min(l1, l2)
    return (hi + 0.05) / (lo + 0.05)


def status_from_bool(ok: bool, warning: bool = False) -> tuple[str, str]:
    if ok:
        return "pass", "info"
    if warning:
        return "warning", "warning"
    return "fail", "fail"


def component_to_json(component: DetectedComponent) -> dict[str, Any]:
    return {
        "id": component.id,
        "role": component.role,
        "box": component.box,
        "source": component.source,
        "label": component.label,
        "score": component.score,
        "meta": component.meta,
    }


def result_to_json(result: CheckResult) -> dict[str, Any]:
    return {
        "id": result.id,
        "type": result.type,
        "status": result.status,
        "severity": result.severity,
        "message": result.message,
        "targets": result.targets,
        "metrics": result.metrics,
        "used_fields": result.used_fields,
        "suggestion": result.suggestion,
    }
