#!/usr/bin/env python3
"""Run UI feedback analyzer against deterministic holdout cases and score statuses."""

from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Any

from ui_feedback_analyzer import analyze_image, load_spec
from ui_feedback_reports import write_json

ROOT = Path(__file__).resolve().parents[1]


def rel(path: str | Path) -> Path:
    p = Path(path)
    return p if p.is_absolute() else ROOT / p


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    return [json.loads(line) for line in path.read_text(encoding="utf-8").splitlines() if line.strip()]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", default="data/ui_feedback_holdout/manifest.jsonl")
    parser.add_argument("--out-json", default="results/ui-feedback-holdout-results.json")
    parser.add_argument("--out-md", default="results/ui-feedback-holdout-summary.md")
    parser.add_argument("--annotations-dir")
    parser.add_argument("--fail-on-mismatch", action="store_true")
    args = parser.parse_args()

    rows = load_jsonl(rel(args.manifest))
    results: list[dict[str, Any]] = []
    failures: list[str] = []
    for row in rows:
        spec, warnings = load_spec(str(rel(row["spec"])))
        annotation = None
        if args.annotations_dir:
            annotation = str(Path(args.annotations_dir) / f"{row['id']}-annotated.png")
        report = analyze_image(str(rel(row["image"])), spec, warnings, None, annotation)
        observed = {check["id"]: check["status"] for check in report["checks"]}
        expected = row["expected"]
        ok = True
        for check_id, expected_status in expected.items():
            actual = observed.get(check_id)
            if actual != expected_status:
                ok = False
                failures.append(f"{row['id']}:{check_id} expected {expected_status}, got {actual}")
        results.append({"id": row["id"], "family": row["family"], "image": row["image"], "spec": row["spec"], "expected": expected, "observed": observed, "ok": ok, "summary": report["summary"], "issues": report["issues"]})

    total = len(results)
    passed = sum(1 for r in results if r["ok"])
    by_family: dict[str, dict[str, int]] = {}
    for result in results:
        fam = result["family"]
        by_family.setdefault(fam, {"total": 0, "passed": 0})
        by_family[fam]["total"] += 1
        by_family[fam]["passed"] += int(bool(result["ok"]))
    summary = {"manifest": args.manifest, "total": total, "passed": passed, "accuracy": passed / total if total else 0, "by_family": by_family, "failures": failures, "results": results}
    write_json(summary, rel(args.out_json))

    md = ["# UI feedback holdout summary", "", f"Manifest: `{args.manifest}`", "", f"Score: {passed}/{total} = {passed/total*100 if total else 0:.1f}%", "", "## By family", "", "| Family | Score |", "| --- | ---: |"]
    for fam, counts in sorted(by_family.items()):
        md.append(f"| {fam} | {counts['passed']}/{counts['total']} |")
    md.append("")
    md.append("## Failures")
    md.append("")
    if failures:
        md.extend(f"- {f}" for f in failures)
    else:
        md.append("No failures.")
    out_md = rel(args.out_md)
    out_md.parent.mkdir(parents=True, exist_ok=True)
    out_md.write_text("\n".join(md), encoding="utf-8")
    print(f"Holdout score: {passed}/{total}")
    print(f"Wrote {args.out_json} and {args.out_md}")
    if failures and args.fail_on_mismatch:
        raise SystemExit(2)


if __name__ == "__main__":
    main()
