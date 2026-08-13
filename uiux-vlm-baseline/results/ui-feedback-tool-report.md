# UI Feedback Tool Report

Date: 2026-05-25

## Goal

Evolve the benchmark-specific detector into a general local UI feedback/analysis tool for a UI creation loop. The tool accepts arbitrary screenshots, optionally a JSON spec, performs deterministic image/CV UX checks, and emits JSON/Markdown reports plus annotated images.

## Implemented CLI

```bash
uv run python scripts/ui_feedback_analyzer.py \
  --image path/to/screenshot.png \
  --spec optional-spec.json \
  --out-json results/report.json \
  --out-md results/report.md \
  --annotate results/annotated.png \
  --fail-on never
```

Spec/CLI docs: `docs/ui-feedback-spec.md`

## New modules

- `scripts/ui_feedback_types.py` — shared boxes, components, check result types, color/contrast helpers.
- `scripts/ui_feedback_detection.py` — generic no-badge component detector plus explicit spec/selector resolution.
- `scripts/ui_feedback_checks.py` — objective checks: alignment, spacing, size, padding balance, content centering, texture continuity, contrast, visual consistency, text baseline.
- `scripts/ui_feedback_reports.py` — JSON/Markdown reports and PIL annotations.
- `scripts/ui_feedback_analyzer.py` — general screenshot CLI.
- `scripts/run_ui_feedback_benchmark.py` — no-leak benchmark adapter for existing manifests.
- `scripts/check_ui_feedback_no_leak.py` — poisoned-manifest invariant checker.
- `scripts/generate_ui_feedback_sample.py` — fresh no-badge local feedback sample generator.

Tests:

- `tests/test_ui_feedback_detection.py`
- `tests/test_ui_feedback_checks.py`
- `tests/test_ui_feedback_cli.py`

## Local no-badge feedback sample

Generated under `data/local_feedback_sample/`:

- `feedback_ok.png` + `feedback_ok_spec.json`
- `feedback_issues.png` + `feedback_spec.json`

Outputs:

| Run | Output |
| --- | --- |
| Spec-targeted issues | `results/local-feedback-issues.json`, `.md`, `-annotated.png` |
| Spec-targeted ok | `results/local-feedback-ok.json`, `.md`, `-annotated.png` |
| No-spec auto analysis | `results/local-feedback-auto.json`, `.md`, `-annotated.png` |

Observed summaries:

| Sample | Summary |
| --- | --- |
| `feedback_ok.png` with spec | 7 pass, 0 fail |
| `feedback_issues.png` with spec | 0 pass, 7 fail |
| `feedback_issues.png` no spec | produces auto components/checks and flags 5 objective issues |

The issues sample catches misaligned buttons, size mismatch, inconsistent card spacing, unbalanced padding, off-center icon content, texture seam, and low contrast.

## Holdout overfitting checks

Added deterministic no-badge holdout benchmarks with randomized layouts/colors/defect magnitudes across seven objective check families: alignment, size, spacing, padding, content centering, texture continuity, and contrast. After review, holdout IDs, image filenames, spec filenames, and spec IDs were neutralized so expected status is not visible to the analyzer.

New scripts:

- `scripts/generate_ui_feedback_holdout.py`
- `scripts/run_ui_feedback_holdout.py`

Ran three independent seeds, each with 28 cases (4 per family, balanced pass/fail):

| Seed | Cases | Score |
| --- | ---: | ---: |
| `20260525` | 28 | 28/28 |
| `20260601` | 28 | 28/28 |
| `20260602` | 28 | 28/28 |

Aggregate: **84/84** holdout checks passed. Hash audit found 84/84 unique images and 84/84 unique specs after regeneration.

Artifacts:

- `data/ui_feedback_holdout_seed_20260525/`
- `data/ui_feedback_holdout_seed_20260601/`
- `data/ui_feedback_holdout_seed_20260602/`
- `results/ui-feedback-holdout-20260525-summary.md`
- `results/ui-feedback-holdout-20260601-summary.md`
- `results/ui-feedback-holdout-20260602-summary.md`

These holdouts use no A/B/C badges and no expected-answer metadata in the analyzer spec; expected statuses are stored only in the holdout manifest consumed by the scorer after analysis. Absolute `/tmp` output-dir generation was also validated with seed `20260707` at 28/28.

## Benchmark validation

The generic adapter does not use manifest `regions` or truth fields for prediction. It maps allowed measurement contract fields to generic check requests and localizes targets from image pixels/badge hints.

### Existing comprehensive benchmark

Detailed comparison: `results/ui-feedback-comprehensive-comparison-summary.md`

| Run | Answer | Offset-aware |
| --- | ---: | ---: |
| `ui-feedback/detector/v1` | 36/36 | 36/36 |
| `qwen3vl-8b` | 18/36 | 14/36 |
| `uivenus-8b` | 19/36 | 15/36 |

### Variant benchmark

Detailed comparison: `results/ui-feedback-variant-comparison-summary.md`

| Run | Answer | Offset-aware |
| --- | ---: | ---: |
| `ui-feedback/detector/v1` | 16/16 | 16/16 |
| `qwen3vl-8b/full/default` | 9/16 | 6/16 |
| `uivenus-8b/full/default` | 8/16 | 8/16 |

## No-leak validation

Command:

```bash
uv run python scripts/check_ui_feedback_no_leak.py \
  --manifest data/comprehensive_manifest.jsonl \
  --manifest data/variant_manifest.jsonl
```

Result: passed for 52 rows.

The checker copies each screenshot to a neutral temporary filename, replaces `id` with a neutral value, removes/poisons manifest `regions`, `expected_answer`, `expected_*`, target/icon hints, and non-contract measurement truth fields, then verifies stable predictions and measurements.

## Full validation run

```bash
PYTHONPYCACHEPREFIX=/tmp/ui-feedback-pycache uv run python -m py_compile \
  scripts/ui_feedback_types.py \
  scripts/ui_feedback_detection.py \
  scripts/ui_feedback_checks.py \
  scripts/ui_feedback_reports.py \
  scripts/ui_feedback_analyzer.py \
  scripts/run_ui_feedback_benchmark.py \
  scripts/check_ui_feedback_no_leak.py \
  scripts/generate_ui_feedback_sample.py

uv run python -m unittest discover -s tests
uv run python scripts/generate_ui_feedback_sample.py
uv run python scripts/ui_feedback_analyzer.py --image data/local_feedback_sample/feedback_issues.png --spec data/local_feedback_sample/feedback_spec.json --out-json results/local-feedback-issues.json --out-md results/local-feedback-issues.md --annotate results/local-feedback-issues-annotated.png --fail-on never
uv run python scripts/ui_feedback_analyzer.py --image data/local_feedback_sample/feedback_ok.png --spec data/local_feedback_sample/feedback_ok_spec.json --out-json results/local-feedback-ok.json --out-md results/local-feedback-ok.md --annotate results/local-feedback-ok-annotated.png --fail-on never
uv run python scripts/ui_feedback_analyzer.py --image data/local_feedback_sample/feedback_issues.png --out-json results/local-feedback-auto.json --out-md results/local-feedback-auto.md --annotate results/local-feedback-auto-annotated.png --fail-on never
uv run python scripts/run_ui_feedback_benchmark.py --manifest data/comprehensive_manifest.jsonl --out results/ui-feedback-comprehensive.jsonl --fail-on-mismatch
uv run python scripts/run_ui_feedback_benchmark.py --manifest data/variant_manifest.jsonl --out results/ui-feedback-variant.jsonl --fail-on-mismatch
uv run python scripts/check_ui_feedback_no_leak.py --manifest data/comprehensive_manifest.jsonl --manifest data/variant_manifest.jsonl

for seed in 20260525 20260601 20260602; do
  outdir="data/ui_feedback_holdout_seed_${seed}"
  uv run python scripts/generate_ui_feedback_holdout.py --seed "$seed" --out-dir "$outdir"
  uv run python scripts/run_ui_feedback_holdout.py \
    --manifest "$outdir/manifest.jsonl" \
    --out-json "results/ui-feedback-holdout-${seed}-results.json" \
    --out-md "results/ui-feedback-holdout-${seed}-summary.md" \
    --fail-on-mismatch
done
```

All passed.

## Limitations and next iteration targets

- Generic component detection is heuristic and Pillow-only. It works for clean UI screenshots and explicit specs, but complex real screenshots may need VLM/object-detector boxes.
- No OCR is included; target names in arbitrary screenshots require explicit spec boxes/selectors or auto component IDs.
- Contrast is approximate without OCR/text segmentation; explicit foreground/background boxes would improve reliability.
- Texture continuity is strongest for periodic textures; non-periodic material seams should be reported as `needs_review` unless more specialized checks are added.
- For production UI creation loops, integrate this CLI with screenshot capture from Playwright/Vite and feed JSON issues back into the UI generation/refinement prompt.
