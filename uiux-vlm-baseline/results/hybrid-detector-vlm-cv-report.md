# Detector-based hybrid VLM/CV UI/UX inspector report

Date: 2026-05-25

## What changed

This iteration replaces the previous perfect manifest-region assumption with an image-derived detector mode and replaces generator-template texture matching with a general periodic-continuity seam check.

Implemented:

- `scripts/image_region_detector.py`
  - Detects visible A/B/C badge circles from pixels.
  - Maps badges to UI component surfaces via connected components and dense-surface refinement.
  - Produces region outputs for alignment, size, spacing, texture, icon-centering, state-consistency, text-baseline, and padding tasks.
  - Does **not** read manifest `regions`, `expected_answer`, `expected_*`, `target`, `icon`, or non-contract measurement truth fields.
- `scripts/run_hybrid_cv_inspector.py`
  - Added `--localization-mode {manifest,detector}`.
  - Manifest mode remains available as a sanity baseline: `hybrid-vlm-cv/regions-cv/v1`.
  - Detector mode uses `hybrid-vlm-cv/detector-cv/v1` with `input_mode=detector+image`.
  - Texture inspection now estimates period from pixels and looks for periodic-continuity discontinuities, rather than comparing to the benchmark generator's exact tile template.
- `scripts/check_hybrid_no_leak.py`
  - Added `--localization-mode {manifest,detector,both}`.
  - Detector mode removes manifest regions during poisoning and verifies predictions stay invariant.

## No-leak boundary

Detector-mode prediction may use:

- Image pixels.
- `question` / `category` for task-family context.
- `measurement.type` and generic tolerance contract fields: `tolerance_px`, `hue_tolerance_deg`, `radius_tolerance_px`.

Detector-mode prediction must not use:

- Manifest `regions`.
- `expected_answer` or any `expected_*` field.
- Top-level `target` / `icon`.
- Measurement truth fields such as offsets, phase shift, seam axis/position, dimensions, declared colors, or declared radii.

Verified with:

```bash
uv run python scripts/check_hybrid_no_leak.py \
  --localization-mode both \
  --manifest data/comprehensive_manifest.jsonl \
  --manifest data/variant_manifest.jsonl
```

Result: passed for 104 checks.

## Results

### Existing comprehensive benchmark

Detailed summary: `results/hybrid-detector-comprehensive-comparison-summary.md`

| Run | Answer | Offset-aware | Mean latency |
| --- | ---: | ---: | ---: |
| `hybrid-vlm-cv/detector-cv/v1` | 36/36 | 36/36 | 1.48s |
| `hybrid-vlm-cv/regions-cv/v1` | 36/36 | 36/36 | 0.72s |
| `qwen3vl-8b` | 18/36 | 14/36 | 37.71s |
| `uivenus-8b` | 19/36 | 15/36 | 36.68s |

### New variant benchmark

Detailed summary: `results/hybrid-detector-variant-comparison-summary.md`

| Run | Answer | Offset-aware | Mean latency |
| --- | ---: | ---: | ---: |
| `hybrid-vlm-cv/detector-cv/v1` | 16/16 | 16/16 | 1.61s |
| `hybrid-vlm-cv/regions-cv/v1` | 16/16 | 16/16 | 0.89s |
| `qwen3vl-8b/full/default` | 9/16 | 6/16 | 40.37s |
| `uivenus-8b/full/default` | 8/16 | 8/16 | 40.77s |

## Validation commands run

```bash
PYTHONPYCACHEPREFIX=/tmp/uiux-detector-pycache uv run python -m py_compile \
  scripts/run_hybrid_cv_inspector.py \
  scripts/image_region_detector.py \
  scripts/check_hybrid_no_leak.py \
  scripts/score_vlm_results.py

uv run python scripts/run_hybrid_cv_inspector.py --localization-mode manifest --manifest data/comprehensive_manifest.jsonl --out results/hybrid-comprehensive-regions-v1.jsonl --fail-on-mismatch
uv run python scripts/run_hybrid_cv_inspector.py --localization-mode manifest --manifest data/variant_manifest.jsonl --out results/hybrid-variant-regions-v1.jsonl --fail-on-mismatch
uv run python scripts/run_hybrid_cv_inspector.py --localization-mode detector --manifest data/comprehensive_manifest.jsonl --out results/hybrid-comprehensive-detector-v1.jsonl --fail-on-mismatch
uv run python scripts/run_hybrid_cv_inspector.py --localization-mode detector --manifest data/variant_manifest.jsonl --out results/hybrid-variant-detector-v1.jsonl --fail-on-mismatch
uv run python scripts/check_hybrid_no_leak.py --localization-mode both --manifest data/comprehensive_manifest.jsonl --manifest data/variant_manifest.jsonl
```

## Limitations

- The detector is a classical image-derived benchmark-family detector, not a learned VLM detector. It uses visible badge circles and synthetic UI component structure.
- Badge mapping is order-based rather than OCR-based.
- Texture detection is now template-free, but still tuned to periodic textures; natural/non-periodic textures need additional seam logic.
- The next real-world step is to replace badge/order localization with an actual GUI detector or VLM box/point outputs and evaluate on natural screenshots with human/geometry labels.
