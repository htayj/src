#!/usr/bin/env python3
"""Check that hybrid predictions are invariant to poisoned answer/truth fields."""

from __future__ import annotations

import argparse
import copy
from typing import Any

from PIL import Image

from run_hybrid_cv_inspector import inspect, load_jsonl, measurement_contract, rel, resolve_regions

ALLOWED_MEASUREMENT_FIELDS = {
    "type",
    "tolerance_px",
    "hue_tolerance_deg",
    "radius_tolerance_px",
}
DISALLOWED_USED_FIELDS = {
    "expected_answer",
    "expected_offset_px",
    "expected_offset_x_px",
    "expected_offset_y_px",
    "expected_width_delta_px",
    "expected_height_delta_px",
    "expected_gap_delta_px",
    "expected_phase_shift_px",
    "expected_defect",
    "target",
    "icon",
    "measurement.offset_px",
    "measurement.offset_x_px",
    "measurement.offset_y_px",
    "measurement.width_delta_px",
    "measurement.height_delta_px",
    "measurement.seam_axis",
    "measurement.seam_position_px",
    "measurement.pattern_size_px",
}


def poison(row: dict[str, Any], localization_mode: str) -> dict[str, Any]:
    poisoned = copy.deepcopy(row)
    poisoned["expected_answer"] = "POISON_EXPECTED_ANSWER"
    poisoned["target"] = "POISON_TARGET"
    poisoned["icon"] = "POISON_ICON"
    poisoned["expected_offset_px"] = 9999
    poisoned["expected_offset_x_px"] = 9999
    poisoned["expected_offset_y_px"] = -9999
    poisoned["expected_width_delta_px"] = 9999
    poisoned["expected_height_delta_px"] = -9999
    poisoned["expected_gap_delta_px"] = 9999
    poisoned["expected_phase_shift_px"] = 9999
    poisoned["expected_defect"] = "POISON_DEFECT"
    measurement = poisoned.get("measurement")
    if isinstance(measurement, dict):
        for key in list(measurement.keys()):
            if key not in ALLOWED_MEASUREMENT_FIELDS:
                measurement[key] = "POISON_MEASUREMENT"
    if localization_mode == "detector":
        poisoned.pop("regions", None)
    return poisoned


def prediction_tuple(row: dict[str, Any], localization_mode: str) -> tuple[Any, ...]:
    img = Image.open(rel(row["image"])).convert("RGB")
    contract = measurement_contract(row)
    regions, region_diag = resolve_regions(row, img, contract, localization_mode)
    answer, evidence, details, offset_px, extra = inspect(row, img, regions, contract, region_diag)
    used = set(details.get("used_fields") or [])
    if localization_mode == "detector" and "regions" in used:
        raise AssertionError(f"detector mode used manifest regions for {row.get('id')}")
    leaked = sorted(used & DISALLOWED_USED_FIELDS)
    if leaked:
        raise AssertionError(f"{localization_mode} mode reported disallowed used_fields for {row.get('id')}: {leaked}")
    return answer, evidence, round(float(offset_px), 4) if offset_px is not None else None, extra


def modes_from_arg(mode: str) -> list[str]:
    if mode == "both":
        return ["manifest", "detector"]
    return [mode]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", action="append", required=True)
    parser.add_argument("--localization-mode", choices=["manifest", "detector", "both"], default="both")
    args = parser.parse_args()

    failures: list[str] = []
    checked = 0
    for mode in modes_from_arg(args.localization_mode):
        for manifest_arg in args.manifest:
            manifest = rel(manifest_arg)
            for row in load_jsonl(manifest):
                checked += 1
                try:
                    base = prediction_tuple(row, mode)
                    poisoned = prediction_tuple(poison(row, mode), mode)
                    if base != poisoned:
                        failures.append(f"{mode}:{manifest_arg}:{row['id']} changed prediction: {base!r} != {poisoned!r}")
                except Exception as exc:
                    failures.append(f"{mode}:{manifest_arg}:{row.get('id')} raised {type(exc).__name__}: {exc}")
    if failures:
        print(f"Hybrid no-leak check FAILED for {len(failures)} of {checked} checks")
        for failure in failures:
            print(f"- {failure}")
        raise SystemExit(1)
    print(f"Hybrid no-leak check passed for {checked} checks across {len(args.manifest)} manifest(s) and mode={args.localization_mode}")


if __name__ == "__main__":
    main()
