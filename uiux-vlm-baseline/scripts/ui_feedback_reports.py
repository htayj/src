#!/usr/bin/env python3
"""Report and annotation helpers for UI feedback analyzer."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from PIL import Image, ImageDraw, ImageFont

from ui_feedback_types import CheckResult, DetectedComponent, Issue, component_to_json, result_to_json


def summarize(results: list[CheckResult]) -> dict[str, int]:
    counts = {"pass": 0, "fail": 0, "warning": 0, "needs_review": 0, "error": 0}
    for r in results:
        counts[r.status] = counts.get(r.status, 0) + 1
    return counts


def issues_from_results(results: list[CheckResult]) -> list[Issue]:
    return [Issue(check_id=r.id, severity=r.severity, message=r.message, suggestion=r.suggestion) for r in results if r.status in {"fail", "warning", "needs_review", "error"}]


def build_report(image: str, components: list[DetectedComponent], results: list[CheckResult], diagnostics: dict[str, Any] | None = None, spec_id: str | None = None, artifacts: dict[str, str] | None = None) -> dict[str, Any]:
    issues = issues_from_results(results)
    return {
        "schema_version": 1,
        "image": image,
        "spec_id": spec_id,
        "components": [component_to_json(c) for c in components],
        "checks": [result_to_json(r) for r in results],
        "issues": [issue.__dict__ for issue in issues],
        "summary": summarize(results),
        "diagnostics": diagnostics or {},
        "artifacts": artifacts if artifacts is not None else {},
    }


def write_json(report: dict[str, Any] | list[dict[str, Any]], path: str | Path) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(json.dumps(report, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def markdown_for_report(report: dict[str, Any]) -> str:
    lines: list[str] = []
    lines.append(f"# UI feedback report: `{report['image']}`")
    lines.append("")
    summary = report.get("summary", {})
    lines.append("## Summary")
    lines.append("")
    lines.append("| Status | Count |")
    lines.append("| --- | ---: |")
    for key in ["pass", "fail", "warning", "needs_review", "error"]:
        lines.append(f"| {key} | {summary.get(key, 0)} |")
    lines.append("")
    lines.append("## Issues")
    lines.append("")
    issues = report.get("issues", [])
    if not issues:
        lines.append("No issues detected.")
    else:
        lines.append("| Check | Severity | Message | Suggestion |")
        lines.append("| --- | --- | --- | --- |")
        for issue in issues:
            lines.append(f"| {issue.get('check_id')} | {issue.get('severity')} | {issue.get('message')} | {issue.get('suggestion') or ''} |")
    lines.append("")
    lines.append("## Components")
    lines.append("")
    lines.append("| ID | Role | Source | Box |")
    lines.append("| --- | --- | --- | --- |")
    for c in report.get("components", []):
        lines.append(f"| {c.get('id')} | {c.get('role')} | {c.get('source')} | `{c.get('box')}` |")
    lines.append("")
    lines.append("## Checks")
    lines.append("")
    for check in report.get("checks", []):
        lines.append(f"### {check.get('id')} ({check.get('type')})")
        lines.append("")
        lines.append(f"- Status: **{check.get('status')}**")
        lines.append(f"- Message: {check.get('message')}")
        if check.get("suggestion"):
            lines.append(f"- Suggestion: {check.get('suggestion')}")
        lines.append(f"- Targets: `{check.get('targets')}`")
        lines.append(f"- Metrics: `{json.dumps(check.get('metrics', {}), ensure_ascii=False)}`")
        lines.append("")
    return "\n".join(lines)


def write_markdown(report: dict[str, Any], path: str | Path) -> None:
    p = Path(path)
    p.parent.mkdir(parents=True, exist_ok=True)
    p.write_text(markdown_for_report(report), encoding="utf-8")


def annotate_image(image_path: str | Path, components: list[DetectedComponent], results: list[CheckResult], output_path: str | Path) -> None:
    img = Image.open(image_path).convert("RGB")
    d = ImageDraw.Draw(img)
    try:
        font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 14)
    except Exception:
        font = ImageFont.load_default()
    for c in components:
        color = (80, 200, 255) if c.source == "spec" else (120, 255, 160)
        d.rectangle(tuple(c.box), outline=color, width=2)
        d.text((c.box[0] + 3, c.box[1] + 3), f"{c.id}:{c.role}", fill=color, font=font)
    for r in results:
        if r.status not in {"fail", "warning", "needs_review", "error"}:
            continue
        color = (255, 80, 80) if r.status == "fail" else (255, 200, 80)
        for target in r.targets:
            comp = next((c for c in components if c.id == target), None)
            if comp:
                d.rectangle(tuple(comp.box), outline=color, width=4)
        metrics = r.metrics
        pos = metrics.get("position_px")
        axis = metrics.get("axis")
        if isinstance(pos, (int, float)) and axis == "vertical":
            d.line((int(pos), 0, int(pos), img.height), fill=color, width=2)
        elif isinstance(pos, (int, float)) and axis == "horizontal":
            d.line((0, int(pos), img.width, int(pos)), fill=color, width=2)
    p = Path(output_path)
    p.parent.mkdir(parents=True, exist_ok=True)
    img.save(p)
