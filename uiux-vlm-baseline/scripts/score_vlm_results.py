#!/usr/bin/env python3
"""Score raw VLM benchmark JSONL outputs against a manifest.

Primary scoring remains yes/no answer accuracy. For rows whose manifest declares
``scoring: yes_no_offset``, this script also reports an offset-aware score using
absolute offset magnitude tolerance. Coverage and structured-output quality are
reported explicitly so missing, duplicate, or malformed outputs do not silently
inflate trust in a benchmark run.
"""

from __future__ import annotations

import argparse
import json
import math
import re
import statistics
import sys
from collections import Counter, defaultdict
from pathlib import Path
from typing import Any


def load_jsonl(path: Path) -> list[dict[str, Any]]:
    rows = []
    with path.open("r", encoding="utf-8") as f:
        for line_no, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError as exc:
                raise ValueError(f"{path}:{line_no}: invalid JSON: {exc}") from exc
    return rows


def extract_jsonish(text: str) -> dict[str, Any] | None:
    candidates: list[str] = []
    fenced = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, flags=re.S | re.I)
    if fenced:
        candidates.append(fenced.group(1))
    inline = re.search(r"(\{.*\})", text, flags=re.S)
    if inline:
        candidates.append(inline.group(1))
    for candidate in candidates:
        try:
            data = json.loads(candidate)
        except Exception:
            continue
        if isinstance(data, dict):
            return data
    return None


def answer_from_json(data: dict[str, Any] | None) -> str | None:
    if not isinstance(data, dict):
        return None
    ans = str(data.get("answer", "")).strip().lower()
    return ans if ans in {"yes", "no"} else None


def normalize_yes_no(text: str) -> str | None:
    data = extract_jsonish(text)
    ans = answer_from_json(data)
    if ans is not None:
        return ans
    low = text.lower()
    m = re.search(r'"?answer"?\s*[:=]\s*"?(yes|no)"?', low)
    if m:
        return m.group(1)
    m = re.search(r"\b(yes|no)\b", low[:400])
    if m:
        return m.group(1)
    return None


def numeric_from_json(data: dict[str, Any] | None, key: str) -> float | None:
    if not isinstance(data, dict) or key not in data:
        return None
    val = data[key]
    if val is None:
        return None
    if isinstance(val, bool):
        return None
    if isinstance(val, (int, float)):
        return float(val)
    if isinstance(val, str):
        m = re.search(r"-?\d+(?:\.\d+)?", val)
        if m:
            return float(m.group(0))
    return None


def is_valid_confidence(value: Any) -> bool:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        return False
    return 0 <= float(value) <= 1


def has_valid_json_answer(data: dict[str, Any] | None) -> bool:
    return answer_from_json(data) in {"yes", "no"}


def has_expected_response_schema(data: dict[str, Any] | None) -> bool:
    """Validate the JSON shape requested by scripts/run_vlm_baseline.py."""
    if not isinstance(data, dict):
        return False
    if answer_from_json(data) not in {"yes", "no"}:
        return False
    if not is_valid_confidence(data.get("confidence")):
        return False
    if not isinstance(data.get("evidence"), str) or not data["evidence"].strip():
        return False
    if "offset_px" not in data:
        return False
    # offset_px may be null for clean cases, otherwise numeric/string numeric.
    return data["offset_px"] is None or numeric_from_json(data, "offset_px") is not None


def expected_offset_spec(row: dict[str, Any]) -> dict[str, Any] | None:
    if "expected_offset_px" in row and row["expected_offset_px"] is not None:
        signed = float(row["expected_offset_px"])
        return {"kind": "signed_scalar", "signed": signed, "magnitude": abs(signed)}
    if "expected_offset_x_px" in row or "expected_offset_y_px" in row:
        x = float(row.get("expected_offset_x_px", 0) or 0)
        y = float(row.get("expected_offset_y_px", 0) or 0)
        return {"kind": "vector", "x": x, "y": y, "magnitude": math.hypot(x, y)}
    return None


def expected_offset_magnitude(row: dict[str, Any]) -> float | None:
    spec = expected_offset_spec(row)
    return None if spec is None else float(spec["magnitude"])


def dynamic_offset_tolerance(expected_magnitude: float, max_tolerance: float) -> float:
    # A flat ±6px tolerance lets offset_px=0 pass 4px/6px defects. Use a
    # stricter per-defect tolerance while still allowing coarser estimates for
    # larger offsets.
    return min(float(max_tolerance), max(2.0, expected_magnitude * 0.5))


def structured_direction_text(data: dict[str, Any] | None) -> str:
    parts: list[str] = []
    if isinstance(data, dict):
        for key in ("offset_direction", "direction", "offset_direction_x", "offset_direction_y"):
            value = data.get(key)
            if value is not None:
                parts.append(str(value))
    return " ".join(parts).lower()


def evidence_text(data: dict[str, Any] | None, response: str) -> str:
    parts: list[str] = []
    if isinstance(data, dict) and data.get("evidence") is not None:
        parts.append(str(data["evidence"]))
    parts.append(response)
    return " ".join(parts).lower()


def has_word(text: str, *words: str) -> bool:
    return any(re.search(rf"\b{re.escape(word)}\b", text) for word in words)


def text_says_positive_y(text: str) -> bool:
    # Avoid treating "bottom edge" as direction; require relational words.
    return has_word(text, "down", "lower", "below")


def text_says_negative_y(text: str) -> bool:
    # Avoid treating "top edge" as direction; require relational words.
    return has_word(text, "up", "upper", "higher", "above")


def text_says_positive_x(text: str) -> bool:
    return has_word(text, "right")


def text_says_negative_x(text: str) -> bool:
    return has_word(text, "left")


def component_relation_direction(text: str) -> int | None:
    """Return signed B-relative-to-A y direction when text is unambiguous.

    +1 means B is lower/down/below A. -1 means B is higher/up/above A. None
    means there is no reliable target-component relation. This intentionally
    rejects vague text such as "top edges are offset" and avoids matching the
    generic "A and B" preamble as if it were a B-specific clause.
    """
    norm = re.sub(r"\s+", " ", text.lower())
    down_words = r"(?:lower|below|down)"
    up_words = r"(?:higher|above|up)"
    b_ref = r"(?:button\s*)?b(?:'s)?"
    a_ref = r"(?:button\s*)?a(?:'s)?"
    clauses = [c.strip() for c in re.split(r"[.;,]|\bwith\b", norm) if c.strip()]
    for clause in clauses:
        # Explicit two-component relations are safest.
        if re.search(rf"\b{b_ref}\b(?:(?!\b{a_ref}\b).){{0,80}}\b{down_words}\b(?:\s+than)?(?:(?!\b{b_ref}\b).){{0,80}}\b{a_ref}\b", clause):
            return 1
        if re.search(rf"\b{b_ref}\b(?:(?!\b{a_ref}\b).){{0,80}}\b{up_words}\b(?:\s+than)?(?:(?!\b{b_ref}\b).){{0,80}}\b{a_ref}\b", clause):
            return -1
        if re.search(rf"\b{a_ref}\b(?:(?!\b{b_ref}\b).){{0,80}}\b{up_words}\b(?:\s+than)?(?:(?!\b{a_ref}\b).){{0,80}}\b{b_ref}\b", clause):
            return 1
        if re.search(rf"\b{a_ref}\b(?:(?!\b{b_ref}\b).){{0,80}}\b{down_words}\b(?:\s+than)?(?:(?!\b{a_ref}\b).){{0,80}}\b{b_ref}\b", clause):
            return -1
        # Single-component clauses are accepted only if they do not mention the
        # other component; this avoids "A and B ... with A higher" cross-talk.
        has_a = re.search(rf"\b{a_ref}\b", clause) is not None
        has_b = re.search(rf"\b{b_ref}\b", clause) is not None
        if has_b and not has_a:
            if re.search(rf"\b{down_words}\b", clause):
                return 1
            if re.search(rf"\b{up_words}\b", clause):
                return -1
        if has_a and not has_b:
            if re.search(rf"\b{up_words}\b", clause):
                return 1
            if re.search(rf"\b{down_words}\b", clause):
                return -1
    return None


def scalar_direction_ok(expected_signed: float, pred_offset: float | None, data: dict[str, Any] | None, response: str) -> bool:
    if expected_signed == 0:
        return True
    # Do not infer direction from the sign of generic `offset_px`; the prompt
    # never defines a signed convention for that field. Require explicit
    # structured direction or an unambiguous A/B relation in evidence.
    structured = structured_direction_text(data)
    if structured:
        relation = component_relation_direction(structured)
        if relation is not None:
            return (expected_signed > 0 and relation > 0) or (expected_signed < 0 and relation < 0)
        if expected_signed > 0:
            return text_says_positive_y(structured) and not text_says_negative_y(structured)
        return text_says_negative_y(structured) and not text_says_positive_y(structured)

    relation = component_relation_direction(evidence_text(data, response))
    if relation is None:
        return False
    return (expected_signed > 0 and relation > 0) or (expected_signed < 0 and relation < 0)


def vector_pred_components(data: dict[str, Any] | None) -> tuple[float | None, float | None]:
    if not isinstance(data, dict):
        return None, None
    x = None
    y = None
    for key in ("offset_x_px", "x_offset_px", "dx_px", "offset_x", "dx"):
        x = numeric_from_json(data, key)
        if x is not None:
            break
    for key in ("offset_y_px", "y_offset_px", "dy_px", "offset_y", "dy"):
        y = numeric_from_json(data, key)
        if y is not None:
            break
    return x, y


def vector_direction_ok(expected_x: float, expected_y: float, data: dict[str, Any] | None, response: str) -> bool:
    text = structured_direction_text(data) or evidence_text(data, response)
    x_ok = True
    y_ok = True
    if expected_x > 0:
        x_ok = text_says_positive_x(text)
    elif expected_x < 0:
        x_ok = text_says_negative_x(text)
    if expected_y > 0:
        y_ok = text_says_positive_y(text)
    elif expected_y < 0:
        y_ok = text_says_negative_y(text)
    return x_ok and y_ok


def offset_score(
    row: dict[str, Any],
    data: dict[str, Any] | None,
    response: str,
    max_tolerance_px: float,
) -> dict[str, Any]:
    spec = expected_offset_spec(row)
    pred_offset = numeric_from_json(data, "offset_px")
    if spec is None:
        return {
            "expected_offset_px": None,
            "pred_offset_px": pred_offset,
            "offset_abs_error_px": None,
            "offset_within_tolerance": None,
            "offset_direction_ok": None,
            "offset_tolerance_used_px": None,
        }

    expected_mag = float(spec["magnitude"])
    tolerance = dynamic_offset_tolerance(expected_mag, max_tolerance_px)
    pred_mag = None if pred_offset is None else abs(float(pred_offset))
    abs_error = None if pred_mag is None else abs(pred_mag - expected_mag)
    magnitude_ok = pred_mag is not None and abs_error is not None and abs_error <= tolerance
    direction_ok: bool | None = None

    if spec["kind"] == "signed_scalar":
        direction_ok = scalar_direction_ok(float(spec["signed"]), pred_offset, data, response)
        within = magnitude_ok and direction_ok
    elif spec["kind"] == "vector":
        pred_x, pred_y = vector_pred_components(data)
        if pred_x is not None and pred_y is not None:
            vector_error = math.hypot(pred_x - float(spec["x"]), pred_y - float(spec["y"]))
            abs_error = vector_error
            direction_ok = True
            within = vector_error <= tolerance
        else:
            direction_ok = vector_direction_ok(float(spec["x"]), float(spec["y"]), data, response)
            within = magnitude_ok and direction_ok
    else:
        within = magnitude_ok

    return {
        "expected_offset_px": expected_mag,
        "expected_offset_signed_px": spec.get("signed"),
        "expected_offset_x_px": spec.get("x"),
        "expected_offset_y_px": spec.get("y"),
        "pred_offset_px": pred_offset,
        "offset_abs_error_px": abs_error,
        "offset_within_tolerance": within,
        "offset_direction_ok": direction_ok,
        "offset_tolerance_used_px": tolerance,
    }

def summarize_latencies(rows: list[dict[str, Any]]) -> dict[str, float | int | None]:
    latencies = [float(r["latency_seconds"]) for r in rows if isinstance(r.get("latency_seconds"), (int, float))]
    if not latencies:
        return {"count": 0, "mean": None, "median": None, "min": None, "max": None, "total": None}
    return {
        "count": len(latencies),
        "mean": round(statistics.mean(latencies), 2),
        "median": round(statistics.median(latencies), 2),
        "min": round(min(latencies), 2),
        "max": round(max(latencies), 2),
        "total": round(sum(latencies), 2),
    }


def coverage_for_model(manifest_ids: set[str], case_rows: list[dict[str, Any]]) -> dict[str, Any]:
    ids = [str(r.get("case_id")) for r in case_rows if r.get("case_id") is not None]
    counts = Counter(ids)
    unknown = sorted([case_id for case_id in counts if case_id not in manifest_ids])
    duplicates = sorted([case_id for case_id, n in counts.items() if n > 1])
    missing = sorted(manifest_ids - set(ids))
    return {
        "observed_case_rows": len(case_rows),
        "unique_case_ids": len(counts),
        "missing_ids": missing,
        "unknown_ids": unknown,
        "duplicate_ids": duplicates,
        "complete": not missing and not unknown and not duplicates,
    }


def score_rows(
    manifest_rows: list[dict[str, Any]],
    result_rows: list[dict[str, Any]],
    offset_tolerance_px: float = 6.0,
) -> dict[str, Any]:
    manifest_ids_list = [str(r["id"]) for r in manifest_rows]
    manifest_counts = Counter(manifest_ids_list)
    duplicate_manifest_ids = sorted([case_id for case_id, n in manifest_counts.items() if n > 1])
    if duplicate_manifest_ids:
        raise ValueError(f"Manifest has duplicate IDs: {duplicate_manifest_ids[:10]}")
    manifest = {str(r["id"]): r for r in manifest_rows}
    manifest_ids = set(manifest)

    by_model: dict[str, list[dict[str, Any]]] = defaultdict(list)
    ignored_rows: list[dict[str, Any]] = []
    load_errors = []
    for r in result_rows:
        run_key = str(r.get("run_key") or r.get("model_key", "unknown"))
        if "load_error" in r:
            load_errors.append(r)
            by_model[run_key].append(r)
        elif "case_id" in r:
            by_model[run_key].append(r)
        else:
            ignored_rows.append(r)

    out: dict[str, Any] = {
        "manifest_total": len(manifest_rows),
        "offset_tolerance_px": offset_tolerance_px,
        "offset_scoring": "direction-aware; per-defect tolerance=min(max_tolerance, max(2px, 50% of expected magnitude)); duplicate rows excluded from headline scoring; missing rows count as incorrect",
        "models": {},
        "load_errors": load_errors,
        "ignored_rows": ignored_rows,
    }
    for model_key, rows in sorted(by_model.items()):
        case_rows = [r for r in rows if "case_id" in r]
        known_case_rows = [r for r in case_rows if str(r.get("case_id")) in manifest]
        errors = [r for r in rows if "error" in r or "load_error" in r]
        coverage = coverage_for_model(manifest_ids, case_rows)

        first_by_case: dict[str, dict[str, Any]] = {}
        duplicate_rows: list[dict[str, Any]] = []
        for r in known_case_rows:
            case_id = str(r.get("case_id"))
            if case_id not in first_by_case:
                first_by_case[case_id] = r
            else:
                duplicate_rows.append(r)

        scored = []
        category: dict[str, dict[str, Any]] = {}
        json_object_count = 0
        valid_json_answer_count = 0
        requested_schema_count = 0
        parseable_answer_count = 0
        offset_metric_rows = []

        for case_id in manifest_ids_list:
            mrow = manifest[case_id]
            r = first_by_case.get(case_id)
            expected = str(mrow["expected_answer"]).strip().lower()
            missing_result = r is None
            response = "" if r is None else str(r.get("response", ""))
            data = None if r is None else extract_jsonish(response)
            pred = None if r is None else normalize_yes_no(response)
            json_object = data is not None
            valid_json_answer = has_valid_json_answer(data)
            requested_schema = has_expected_response_schema(data)
            if r is not None:
                if json_object:
                    json_object_count += 1
                if valid_json_answer:
                    valid_json_answer_count += 1
                if requested_schema:
                    requested_schema_count += 1
                if pred in {"yes", "no"}:
                    parseable_answer_count += 1

            answer_correct = pred == expected
            scoring = str(mrow.get("scoring", "yes_no"))
            offset_required = scoring == "yes_no_offset" and expected == "no"
            offset_info = offset_score(mrow, data, response, offset_tolerance_px)
            if scoring == "yes_no_offset" and offset_info["expected_offset_px"] is not None:
                offset_metric_rows.append(
                    {
                        "case_id": case_id,
                        "expected_answer": expected,
                        "pred_answer": pred,
                        **offset_info,
                    }
                )
            strict_correct = answer_correct and (not offset_required or offset_info["offset_within_tolerance"] is True)

            cat = str(mrow.get("category", "unknown"))
            info = category.setdefault(
                cat,
                {"correct": 0, "strict_correct": 0, "total": 0, "cases": []},
            )
            info["total"] += 1
            if answer_correct:
                info["correct"] += 1
            if strict_correct:
                info["strict_correct"] += 1

            scored_row = {
                "case_id": case_id,
                "category": cat,
                "expected_answer": expected,
                "pred_answer": pred,
                "correct": answer_correct,
                "strict_correct": strict_correct,
                "missing_result": missing_result,
                "scoring": scoring,
                "json_object": json_object,
                "valid_json_answer": valid_json_answer,
                "requested_schema": requested_schema,
                **offset_info,
                "latency_seconds": None if r is None else r.get("latency_seconds"),
                "response": response,
                "error": None if r is None else r.get("error"),
            }
            scored.append(scored_row)
            info["cases"].append(scored_row)

        total = len(scored)
        answer_correct_n = sum(1 for r in scored if r["correct"])
        strict_correct_n = sum(1 for r in scored if r["strict_correct"])
        for cat_info in category.values():
            cat_info["accuracy"] = (cat_info["correct"] / cat_info["total"]) if cat_info["total"] else None
            cat_info["strict_accuracy"] = (
                cat_info["strict_correct"] / cat_info["total"] if cat_info["total"] else None
            )
        unique_known_rows = list(first_by_case.values())
        out["models"][model_key] = {
            "model_key": next((r.get("model_key") for r in rows if r.get("model_key")), model_key),
            "run_key": model_key,
            "model_id": next((r.get("model_id") for r in rows if r.get("model_id")), None),
            "input_mode": next((r.get("input_mode") for r in rows if r.get("input_mode")), None),
            "prompt_variant": next((r.get("prompt_variant") for r in rows if r.get("prompt_variant")), None),
            "correct": answer_correct_n,
            "total": total,
            "accuracy": (answer_correct_n / total) if total else None,
            "strict_correct": strict_correct_n,
            "strict_accuracy": (strict_correct_n / total) if total else None,
            "json_object_count": json_object_count,
            "json_object_rate": (json_object_count / total) if total else None,
            "valid_json_answer_count": valid_json_answer_count,
            "valid_json_answer_rate": (valid_json_answer_count / total) if total else None,
            "requested_schema_count": requested_schema_count,
            "requested_schema_rate": (requested_schema_count / total) if total else None,
            "parseable_answer_count": parseable_answer_count,
            "parseable_answer_rate": (parseable_answer_count / total) if total else None,
            "latency": summarize_latencies(unique_known_rows),
            "coverage": coverage,
            "duplicate_rows_excluded": duplicate_rows,
            "errors": errors,
            "category": category,
            "misses": [r for r in scored if not r["correct"]],
            "strict_misses": [r for r in scored if not r["strict_correct"]],
            "offset_metrics": offset_metric_rows,
        }
    return out

def pct(x: float | None) -> str:
    return "n/a" if x is None else f"{100 * x:.1f}%"


def fmt_seconds(x: float | int | None) -> str:
    return "n/a" if x is None else f"{x}s"


def compact_response(text: str, max_len: int = 500) -> str:
    response = text.replace("\n", " ")
    if len(response) > max_len:
        response = response[: max_len - 3] + "..."
    return response


def write_markdown(summary: dict[str, Any], out: Path, manifest_path: Path, inputs: list[Path]) -> None:
    lines: list[str] = []
    lines.append("# VLM benchmark score summary")
    lines.append("")
    lines.append(f"Manifest: `{manifest_path}`")
    lines.append(f"Manifest cases: {summary['manifest_total']}")
    lines.append(f"Offset tolerance for offset-aware score: ±{summary['offset_tolerance_px']} px magnitude")
    lines.append("Inputs:")
    for p in inputs:
        lines.append(f"- `{p}`")
    lines.append("")
    lines.append("## Overall")
    lines.append("")
    lines.append(
        "| Run | Model | Input | Prompt | Answer score | Answer accuracy | Offset-aware score | Offset-aware accuracy | Valid JSON answer | Requested schema | Mean latency | Total latency |"
    )
    lines.append("| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |")
    for model_key, m in summary["models"].items():
        lat = m["latency"]
        lines.append(
            f"| {model_key} | {m.get('model_key') or ''} | {m.get('input_mode') or ''} | {m.get('prompt_variant') or ''} | "
            f"{m['correct']}/{m['total']} | {pct(m['accuracy'])} | "
            f"{m['strict_correct']}/{m['total']} | {pct(m['strict_accuracy'])} | "
            f"{m['valid_json_answer_count']}/{m['total']} | {m['requested_schema_count']}/{m['total']} | "
            f"{fmt_seconds(lat['mean'])} | {fmt_seconds(lat['total'])} |"
        )
    lines.append("")
    lines.append("## Coverage")
    lines.append("")
    lines.append("| Model | Complete | Observed rows | Unique IDs | Missing | Unknown | Duplicates |")
    lines.append("| --- | ---: | ---: | ---: | ---: | ---: | ---: |")
    for model_key, m in summary["models"].items():
        c = m["coverage"]
        lines.append(
            f"| {model_key} | {c['complete']} | {c['observed_case_rows']} | {c['unique_case_ids']} | "
            f"{len(c['missing_ids'])} | {len(c['unknown_ids'])} | {len(c['duplicate_ids'])} |"
        )
    lines.append("")
    lines.append("## Category breakdown")
    lines.append("")
    for model_key, m in summary["models"].items():
        lines.append(f"### {model_key}")
        lines.append("")
        lines.append("| Category | Answer score | Answer accuracy | Offset-aware score | Offset-aware accuracy |")
        lines.append("| --- | ---: | ---: | ---: | ---: |")
        for cat, c in sorted(m["category"].items()):
            lines.append(
                f"| {cat} | {c['correct']}/{c['total']} | {pct(c['accuracy'])} | "
                f"{c['strict_correct']}/{c['total']} | {pct(c['strict_accuracy'])} |"
            )
        lines.append("")
    lines.append("## Answer misses")
    lines.append("")
    for model_key, m in summary["models"].items():
        lines.append(f"### {model_key}")
        if not m["misses"]:
            lines.append("")
            lines.append("No answer misses.")
            lines.append("")
            continue
        lines.append("")
        for miss in m["misses"]:
            lines.append(
                f"- `{miss['case_id']}` ({miss['category']}): expected `{miss['expected_answer']}`, "
                f"predicted `{miss['pred_answer']}`. Response: {compact_response(miss.get('response', ''))}"
            )
        lines.append("")
    lines.append("## Offset-aware misses")
    lines.append("")
    for model_key, m in summary["models"].items():
        offset_misses = [r for r in m["strict_misses"] if r.get("correct") and r.get("scoring") == "yes_no_offset"]
        lines.append(f"### {model_key}")
        if not offset_misses:
            lines.append("")
            lines.append("No extra offset-aware misses beyond answer misses.")
            lines.append("")
            continue
        lines.append("")
        for miss in offset_misses:
            lines.append(
                f"- `{miss['case_id']}` ({miss['category']}): answer was correct, but offset estimate "
                f"`{miss['pred_offset_px']}` px was not within tolerance of expected magnitude "
                f"`{miss['expected_offset_px']}` px. Response: {compact_response(miss.get('response', ''))}"
            )
        lines.append("")
    coverage_errors = [
        (model_key, m["coverage"])
        for model_key, m in summary["models"].items()
        if not m["coverage"]["complete"]
    ]
    if coverage_errors:
        lines.append("## Coverage issues")
        lines.append("")
        for model_key, c in coverage_errors:
            lines.append(f"### {model_key}")
            for label in ("missing_ids", "unknown_ids", "duplicate_ids"):
                if c[label]:
                    shown = ", ".join(f"`{x}`" for x in c[label][:20])
                    more = "" if len(c[label]) <= 20 else f" … +{len(c[label]) - 20} more"
                    lines.append(f"- {label}: {shown}{more}")
            lines.append("")
    if summary.get("load_errors"):
        lines.append("## Load errors")
        lines.append("")
        for err in summary["load_errors"]:
            lines.append(f"- `{err.get('model_key')}`: {err.get('load_error')}")
        lines.append("")
    out.write_text("\n".join(lines) + "\n", encoding="utf-8")


def has_coverage_errors(summary: dict[str, Any]) -> bool:
    return any(not m["coverage"]["complete"] for m in summary["models"].values())


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--manifest", required=True)
    parser.add_argument("--inputs", nargs="+", required=True)
    parser.add_argument("--out-json", required=True)
    parser.add_argument("--out-md", required=True)
    parser.add_argument("--case", action="append", help="Score only this case id (can repeat)")
    parser.add_argument("--offset-tolerance-px", type=float, default=6.0)
    parser.add_argument("--fail-on-coverage-errors", action="store_true")
    args = parser.parse_args()

    manifest_path = Path(args.manifest)
    input_paths = [Path(p) for p in args.inputs]
    manifest_rows = load_jsonl(manifest_path)
    result_rows: list[dict[str, Any]] = []
    for p in input_paths:
        result_rows.extend(load_jsonl(p))
    if args.case:
        keep = set(args.case)
        found = {str(r["id"]) for r in manifest_rows if str(r["id"]) in keep}
        missing = sorted(keep - found)
        if missing:
            raise SystemExit(f"Requested --case IDs not in manifest: {missing}")
        manifest_rows = [r for r in manifest_rows if str(r["id"]) in keep]
        result_rows = [r for r in result_rows if "load_error" in r or str(r.get("case_id")) in keep]
    summary = score_rows(manifest_rows, result_rows, offset_tolerance_px=args.offset_tolerance_px)

    out_json = Path(args.out_json)
    out_md = Path(args.out_md)
    out_json.write_text(json.dumps(summary, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    write_markdown(summary, out_md, manifest_path, input_paths)
    print(f"Wrote {out_json}")
    print(f"Wrote {out_md}")
    for model_key, model in summary["models"].items():
        print(
            f"{model_key}: answer {model['correct']}/{model['total']} = {pct(model['accuracy'])}; "
            f"offset-aware {model['strict_correct']}/{model['total']} = {pct(model['strict_accuracy'])}"
        )
    if args.fail_on_coverage_errors and has_coverage_errors(summary):
        print("Coverage errors detected", file=sys.stderr)
        raise SystemExit(2)


if __name__ == "__main__":
    main()
