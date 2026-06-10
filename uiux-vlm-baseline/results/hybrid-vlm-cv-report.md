# Hybrid VLM/CV UI/UX inspector report

Date: 2026-05-25

## Scope

The goal was to preserve the existing pure-VLM benchmark results, design an honest hybrid VLM/CV inspection path, benchmark it against the existing no-leak comprehensive benchmark, create a new non-overfit benchmark variant for the same UI/UX task families, and compare hybrid vs pure VLM on both.

This is **not** claimed to be a general-purpose UI inspector yet. The hybrid uses manifest `regions` as a stand-in for VLM/GUI-target localization, then performs deterministic CV/geometry checks on pixels. It deliberately avoids reading `expected_answer`, `expected_*`, and non-contract measurement truth fields while predicting.

## Oracle/design-review status

Oracle was requested but unavailable in this environment. Attempts are recorded in:

- `results/oracle-attempts-hybrid.md`

Summary: MCP/browser failed on `127.0.0.1:9222`, API mode lacked `OPENAI_API_KEY`, CLI browser dry-run succeeded, and actual browser runs failed because no ChatGPT cookies were available.

## Existing result snapshot

Existing benchmark results were saved before hybrid work:

- `results/saved-benchmark-results-20260525T142953Z.md`

Old no-leak comprehensive pure-VLM baselines:

| Run | Answer | Offset-aware |
| --- | ---: | ---: |
| `qwen3vl-8b` | 18/36 | 14/36 |
| `uivenus-8b` | 19/36 | 15/36 |

## Implemented files

- `scripts/run_hybrid_cv_inspector.py` — hybrid regions+pixels inspector.
- `scripts/generate_uiux_variant_benchmark.py` — new 16-case benchmark variant across the same task families.
- `scripts/check_hybrid_no_leak.py` — poisons expected/truth fields and verifies predictions are invariant.
- `scripts/score_vlm_results.py` — fixed zero-offset detail scoring so exact `0px` predictions are marked within tolerance.

Generated benchmark/results artifacts:

- `data/variant_manifest.jsonl`
- `data/variant_images/*.png`
- `results/hybrid-comprehensive-v1.jsonl`
- `results/hybrid-comprehensive-v1-summary.md`
- `results/hybrid-comprehensive-comparison-summary.md`
- `results/hybrid-variant-v1.jsonl`
- `results/hybrid-variant-v1-summary.md`
- `results/pure-vlm-variant-v1.jsonl`
- `results/pure-vlm-variant-v1-summary.md`
- `results/hybrid-variant-comparison-summary.md`

## Results

### Existing comprehensive benchmark

| Run | Answer | Offset-aware | Mean latency |
| --- | ---: | ---: | ---: |
| `hybrid-vlm-cv/regions-cv/v1` | 36/36 | 36/36 | 0.03s |
| `qwen3vl-8b` | 18/36 | 14/36 | 37.71s |
| `uivenus-8b` | 19/36 | 15/36 | 36.68s |

Detailed comparison:

- `results/hybrid-comprehensive-comparison-summary.md`

### New variant benchmark

| Run | Answer | Offset-aware | Mean latency |
| --- | ---: | ---: | ---: |
| `hybrid-vlm-cv/regions-cv/v1` | 16/16 | 16/16 | 0.04s |
| `qwen3vl-8b/full/default` | 9/16 | 6/16 | 40.37s |
| `uivenus-8b/full/default` | 8/16 | 8/16 | 40.77s |

Detailed comparison:

- `results/hybrid-variant-comparison-summary.md`

## Leak controls

The hybrid prediction path uses:

- `regions`
- `measurement.type`
- `measurement.tolerance_px`
- generic task-contract tolerances where applicable: `measurement.hue_tolerance_deg`, `measurement.radius_tolerance_px`
- image pixels

It does not use `expected_answer`, `expected_*`, top-level `target`, `icon`, or non-contract measurement truth fields for prediction. This was checked with:

```bash
uv run python scripts/check_hybrid_no_leak.py \
  --manifest data/comprehensive_manifest.jsonl \
  --manifest data/variant_manifest.jsonl
```

Result: passed for 52 rows.

## Verification

Key commands run successfully:

```bash
PYTHONPYCACHEPREFIX=/tmp/uiux-hybrid-pycache uv run python -m py_compile \
  scripts/run_hybrid_cv_inspector.py \
  scripts/generate_uiux_variant_benchmark.py \
  scripts/check_hybrid_no_leak.py \
  scripts/score_vlm_results.py

uv run python scripts/generate_uiux_variant_benchmark.py
uv run python scripts/run_hybrid_cv_inspector.py --manifest data/comprehensive_manifest.jsonl --out results/hybrid-comprehensive-v1.jsonl --fail-on-mismatch
uv run python scripts/run_hybrid_cv_inspector.py --manifest data/variant_manifest.jsonl --out results/hybrid-variant-v1.jsonl --fail-on-mismatch
uv run python scripts/check_hybrid_no_leak.py --manifest data/comprehensive_manifest.jsonl --manifest data/variant_manifest.jsonl
```

A read-only `code-review-enforcer` subagent review found no blockers after fixes.

## Conclusion

The hybrid beats the old pure-VLM baselines on the existing benchmark and also beats pure VLM on a fresh benchmark variant. Since the first post-fix hybrid iteration reached 100% on both old and new benchmarks, no further recursive benchmark/improvement iteration was needed under the bounded auto-improvement cap.

Next work should replace perfect manifest `regions` with actual VLM/GUI detection outputs and replace benchmark-specific texture knowledge with more general seam/continuity detectors before claiming real screenshot robustness.
