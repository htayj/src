#!/usr/bin/env python3
"""No-leak invariant checks for the generic UI feedback benchmark adapter."""

from __future__ import annotations

import argparse
import copy
import json
import shutil
import tempfile
from pathlib import Path
from typing import Any

from run_ui_feedback_benchmark import predict, rel

ALLOWED_MEASUREMENT_FIELDS = {"type", "tolerance_px", "hue_tolerance_deg", "radius_tolerance_px"}
DISALLOWED_KEYS = {"expected_answer", "icon"}


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def poison(row: dict[str, Any], neutral_image: str) -> dict[str, Any]:
    p = copy.deepcopy(row)
    p["id"] = "neutral_case"
    p["image"] = neutral_image
    p.pop("regions", None)
    p["expected_answer"] = "POISON"
    p["target"] = "POISON"
    p["icon"] = "POISON"
    for key in list(p.keys()):
        if key.startswith("expected_"):
            p[key] = "POISON"
    m = p.get("measurement")
    if isinstance(m, dict):
        for key in list(m.keys()):
            if key not in ALLOWED_MEASUREMENT_FIELDS:
                m[key] = "POISON"
    return p


def assert_no_disallowed_keys(value: Any) -> None:
    if isinstance(value, dict):
        for key, child in value.items():
            if key in DISALLOWED_KEYS or key.startswith("expected_"):
                raise AssertionError(f"measurement diagnostics contain disallowed key {key}")
            assert_no_disallowed_keys(child)
    elif isinstance(value, list):
        for child in value:
            assert_no_disallowed_keys(child)


def scrub_measurements(measurements: dict[str, Any]) -> dict[str, Any]:
    # Region boxes are detector outputs and can legitimately appear in
    # diagnostics. They are included in equality comparison so poisoning would
    # still fail if detector output changed.
    return measurements


def stable_prediction(row: dict[str, Any]) -> tuple[Any, ...]:
    answer, evidence, measurements, offset_px, extra = predict(row)
    assert_no_disallowed_keys(measurements)
    return answer, evidence, round(float(offset_px), 4) if offset_px is not None else None, extra, scrub_measurements(measurements)


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", action="append", required=True)
    args = parser.parse_args()
    failures: list[str] = []
    checked = 0
    for manifest_arg in args.manifest:
        for row in load_jsonl(rel(manifest_arg)):
            checked += 1
            try:
                with tempfile.TemporaryDirectory(prefix="ui-feedback-no-leak-") as td:
                    neutral = Path(td) / "neutral.png"
                    shutil.copy2(rel(row["image"]), neutral)
                    base_row = copy.deepcopy(row)
                    base_row["id"] = "neutral_case"
                    base_row["image"] = str(neutral)
                    base = stable_prediction(base_row)
                    poisoned = stable_prediction(poison(row, str(neutral)))
                if base != poisoned:
                    failures.append(f"{manifest_arg}:{row['id']} changed: {base!r} != {poisoned!r}")
            except Exception as exc:
                failures.append(f"{manifest_arg}:{row.get('id')} raised {type(exc).__name__}: {exc}")
    if failures:
        print(f"UI feedback no-leak check FAILED for {len(failures)} of {checked} rows")
        for f in failures:
            print(f"- {f}")
        raise SystemExit(1)
    print(f"UI feedback no-leak check passed for {checked} rows across {len(args.manifest)} manifest(s)")


if __name__ == "__main__":
    main()
