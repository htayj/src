#!/usr/bin/env python3
"""General local UI screenshot feedback analyzer."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

from PIL import Image

from ui_feedback_checks import run_check
from ui_feedback_detection import build_components, component_map
from ui_feedback_reports import annotate_image, build_report, write_json, write_markdown

ROOT = Path(__file__).resolve().parents[1]
TRUTH_PREFIXES = ("expected_",)
TRUTH_FIELDS = {"expected_answer", "regions"}


def cli_path(path: str | Path) -> Path:
    """Resolve user CLI paths relative to the caller's current directory."""
    p = Path(path)
    return p if p.is_absolute() else Path.cwd() / p


def load_spec(path: str | None) -> tuple[dict[str, Any] | None, list[str]]:
    if not path:
        return None, []
    spec = json.loads(cli_path(path).read_text(encoding="utf-8"))
    warnings: list[str] = []
    for key in list(spec.keys()):
        if key in TRUTH_FIELDS or key.startswith(TRUTH_PREFIXES):
            warnings.append(f"ignored truth-like spec field: {key}")
            spec.pop(key, None)
    for check in spec.get("checks", []):
        for key in list(check.keys()):
            if key in TRUTH_FIELDS or key.startswith(TRUTH_PREFIXES):
                warnings.append(f"ignored truth-like check field {check.get('id')}.{key}")
                check.pop(key, None)
    return spec, warnings


def parse_checks_arg(value: str | None) -> set[str] | None:
    if not value or value == "all":
        return None
    aliases = {
        "spacing": "spacing_consistency",
        "size": "size_consistency",
        "padding": "padding_balance",
        "centering": "content_centering",
        "texture": "texture_continuity",
    }
    return {aliases.get(x.strip(), x.strip()) for x in value.split(",") if x.strip()}


def auto_checks(components, enabled_types: list[str] | None = None, tolerance_px: float = 6) -> list[dict[str, Any]]:
    enabled = set(enabled_types or ["contrast", "alignment", "spacing"])
    checks: list[dict[str, Any]] = []
    buttons = [c for c in components if c.role == "button" and 32 <= c.height <= 110 and c.width <= 280]
    cards = [c for c in components if c.role == "card" and c.width >= 100 and c.height >= 80]
    if "contrast" in enabled:
        for c in buttons[:8]:
            checks.append({"id": f"auto-contrast-{c.id}", "type": "contrast", "target": c.id, "min_ratio": 4.5})
    if "alignment" in enabled and len(buttons) >= 2:
        rows: list[list[Any]] = []
        for c in sorted(buttons, key=lambda item: item.box[1]):
            for row in rows:
                if abs(row[0].box[1] - c.box[1]) <= max(12, tolerance_px * 2):
                    row.append(c)
                    break
            else:
                rows.append([c])
        best = max(rows, key=len) if rows else []
        if len(best) >= 2:
            checks.append({"id": "auto-button-top-alignment", "type": "alignment", "targets": [c.id for c in sorted(best, key=lambda item: item.box[0])], "edge": "top", "tolerance_px": tolerance_px})
    if "spacing" in enabled and len(cards) >= 3:
        rows = []
        for c in sorted(cards, key=lambda item: item.box[1]):
            for row in rows:
                if abs(((row[0].box[1] + row[0].box[3]) / 2) - ((c.box[1] + c.box[3]) / 2)) <= max(16, tolerance_px * 3):
                    row.append(c)
                    break
            else:
                rows.append([c])
        best_cards = max(rows, key=len) if rows else []
        best_cards = sorted(best_cards, key=lambda item: item.box[0])
        if len(best_cards) >= 3 and all(b.box[0] - a.box[2] >= 0 for a, b in zip(best_cards, best_cards[1:])):
            checks.append({"id": "auto-card-spacing", "type": "spacing_consistency", "targets": [c.id for c in best_cards], "axis": "x", "tolerance_px": max(8, tolerance_px)})
    return checks


def checks_from_spec(spec: dict[str, Any] | None, components, checks_filter: set[str] | None) -> list[dict[str, Any]]:
    checks = list((spec or {}).get("checks", []))
    auto = (spec or {}).get("auto_checks", {}) if spec else {"enabled": True}
    if auto.get("enabled", not checks):
        checks.extend(auto_checks(components, auto.get("types"), float(auto.get("tolerance_px", 6))))
    if checks_filter is not None:
        checks = [c for c in checks if str(c.get("type")) in checks_filter]
    return checks


def analyze_image(image_arg: str, spec: dict[str, Any] | None, spec_warnings: list[str], checks_filter: set[str] | None, annotate: str | None = None) -> dict[str, Any]:
    image_path = cli_path(image_arg)
    img = Image.open(image_path).convert("RGB")
    components, diagnostics = build_components(img, spec)
    diagnostics.setdefault("warnings", []).extend(spec_warnings)
    cmap = component_map(components)
    check_requests = checks_from_spec(spec, components, checks_filter)
    results = [run_check(c, cmap, img) for c in check_requests]
    artifacts: dict[str, str] = {}
    if annotate:
        annotate_image(image_path, components, results, cli_path(annotate))
        artifacts["annotation"] = annotate
    report = build_report(str(image_path.relative_to(ROOT) if image_path.is_relative_to(ROOT) else image_path), components, results, diagnostics, (spec or {}).get("id") if spec else None, artifacts)
    return report


def fail_code(summary: dict[str, int], fail_on: str) -> int:
    if fail_on == "never":
        return 0
    if fail_on == "error":
        return 1 if summary.get("error", 0) else 0
    if fail_on == "warning":
        return 1 if summary.get("warning", 0) or summary.get("fail", 0) or summary.get("error", 0) else 0
    if fail_on == "fail":
        return 1 if summary.get("fail", 0) or summary.get("error", 0) else 0
    return 0


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--image", action="append", required=True)
    parser.add_argument("--spec")
    parser.add_argument("--checks")
    parser.add_argument("--out-json")
    parser.add_argument("--out-md")
    parser.add_argument("--annotate")
    parser.add_argument("--annotations-dir")
    parser.add_argument("--fail-on", choices=["fail", "warning", "error", "never"], default="fail")
    parser.add_argument("--debug-components", action="store_true")
    args = parser.parse_args()

    spec, spec_warnings = load_spec(args.spec)
    checks_filter = parse_checks_arg(args.checks)
    reports = []
    for idx, image in enumerate(args.image):
        annotate = args.annotate if len(args.image) == 1 else None
        if args.annotations_dir:
            annotate = str(Path(args.annotations_dir) / (Path(image).stem + "-annotated.png"))
        reports.append(analyze_image(image, spec, spec_warnings, checks_filter, annotate))
    output: dict[str, Any] | list[dict[str, Any]] = reports[0] if len(reports) == 1 else reports
    if args.out_md:
        if len(reports) == 1:
            reports[0]["artifacts"]["markdown"] = args.out_md
            write_markdown(reports[0], cli_path(args.out_md))
        else:
            p = cli_path(args.out_md)
            p.parent.mkdir(parents=True, exist_ok=True)
            p.write_text("\n\n".join(f"# Report {i+1}\n\n" + json.dumps(r["summary"], indent=2) for i, r in enumerate(reports)), encoding="utf-8")
    if args.out_json:
        write_json(output, cli_path(args.out_json))
    else:
        print(json.dumps(output, indent=2, ensure_ascii=False))
    combined = {"pass": 0, "fail": 0, "warning": 0, "needs_review": 0, "error": 0}
    for report in reports:
        for key, value in report.get("summary", {}).items():
            combined[key] = combined.get(key, 0) + int(value)
    raise SystemExit(fail_code(combined, args.fail_on))


if __name__ == "__main__":
    main()
