# Comprehensive UI/UX VLM benchmark report

Date: 2026-05-22

## Scope

Ran and extended a deterministic blind synthetic benchmark for fine-grained UI/UX inspection on the two strongest prior open-weight candidates:

- `qwen3vl-8b` — `Qwen/Qwen3-VL-8B-Instruct`
- `uivenus-8b` — `inclusionAI/UI-Venus-1.5-8B`

The benchmark contains 36 PIL-rendered 1280x768 UI screenshots with known pixel-grounded defects and expected yes/no answers. It is balanced at 18 expected `yes` and 18 expected `no`.

Categories:

- Top-edge alignment: 6 cases
- Button size equality: 4 cases
- Card spacing consistency: 4 cases
- Texture tiling seams: 4 cases
- Icon centering: 4 cases
- State consistency: 4 cases
- Text baseline alignment: 4 cases
- Padding symmetry: 6 cases

No external image API was used; GPT-image-2 remains unavailable in this environment.

## Important correction

A code review caught that the first comprehensive generator rendered the `case_id` in the screenshot footer. Because many IDs contained `ok`, `bad`, or defect magnitudes, that leaked labels into the image and invalidated the first high comprehensive scores.

The generator was fixed so the footer no longer contains the case ID or defect metadata. All `data/comprehensive_images/*.png`, full raw outputs, summaries, and this report were regenerated after the fix. The scores below are for the no-leak image set.

## Environment

- GPU: NVIDIA RTX 4090, 24GB VRAM
- Runner: existing Transformers + 4-bit bitsandbytes path in `scripts/run_vlm_baseline.py`
- PyTorch/Transformers environment: project `uv` env
- Scorer: `scripts/score_vlm_results.py`, with manifest coverage checks, duplicate exclusion, run-key grouping, subset scoring, and direction-aware offset scoring

## Artifacts

Benchmark generation/scoring:

- `scripts/generate_uiux_comprehensive_benchmark.py`
- `scripts/score_vlm_results.py`
- `scripts/measure_comprehensive_cv.py`
- `scripts/build_comprehensive_paired_inputs.py`
- `data/comprehensive_manifest.jsonl`
- `data/comprehensive_images/`
- `data/comprehensive_paired_manifest.jsonl`
- `data/comprehensive_crops/`

Default full-screenshot benchmark artifacts:

- `results/comprehensive-qwen3vl-8b.jsonl`
- `results/comprehensive-uivenus-8b.jsonl`
- `results/comprehensive-summary.json`
- `results/comprehensive-summary.md`

Deterministic CV/geometry baseline artifacts:

- `results/comprehensive-cv-baseline.jsonl`
- `results/comprehensive-cv-summary.json`
- `results/comprehensive-cv-summary.md`

Paired/cropped prompt artifacts:

- `results/comprehensive-validation-full-default-baseline-summary.json`
- `results/comprehensive-validation-full-default-baseline-summary.md`
- `results/comprehensive-paired-calibrated-smoke.jsonl`
- `results/comprehensive-paired-calibrated-validation.jsonl`
- `results/comprehensive-paired-calibrated-validation-summary.json`
- `results/comprehensive-paired-calibrated-validation-summary.md`
- `results/comprehensive-paired-calibrated-qwen3vl-8b.jsonl`
- `results/comprehensive-paired-calibrated-uivenus-8b.jsonl`
- `results/comprehensive-paired-calibrated-summary.json`
- `results/comprehensive-paired-calibrated-summary.md`

## Results: no-leak full-screenshot/default prompt

| Model | Answer score | Answer accuracy | Offset-aware score | Offset-aware accuracy | Valid JSON answer | Requested schema | Mean latency/case | Total inference latency |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `qwen3vl-8b` | 18/36 | 50.0% | 14/36 | 38.9% | 36/36 | 36/36 | 37.71s | 1357.63s |
| `uivenus-8b` | 19/36 | 52.8% | 15/36 | 41.7% | 36/36 | 36/36 | 36.68s | 1320.32s |

Coverage was complete for both models: 36 observed rows, 36 unique case IDs, 0 missing, 0 unknown, 0 duplicates.

### Category breakdown: full/default

| Category | Qwen3-VL-8B answer | Qwen3-VL-8B offset-aware | UI-Venus answer | UI-Venus offset-aware |
| --- | ---: | ---: | ---: | ---: |
| Alignment | 3/6 | 1/6 | 3/6 | 1/6 |
| Size | 2/4 | 2/4 | 2/4 | 2/4 |
| Spacing | 2/4 | 2/4 | 3/4 | 3/4 |
| Texture tiling | 2/4 | 2/4 | 2/4 | 2/4 |
| Icon centering | 2/4 | 0/4 | 1/4 | 1/4 |
| State consistency | 2/4 | 2/4 | 2/4 | 2/4 |
| Text alignment | 2/4 | 2/4 | 2/4 | 0/4 |
| Padding symmetry | 3/6 | 3/6 | 4/6 | 4/6 |

## Deterministic CV/geometry-assisted baseline

The comprehensive manifest now includes non-rendered `regions` and `measurement` metadata. A deterministic pseudo-model (`scripts/measure_comprehensive_cv.py`) uses this geometry/measurement metadata plus image loading sanity checks to emit runner-compatible rows. This is **not** an independent learned vision model and should be interpreted as an oracle-style measurement pipeline for known synthetic geometry, useful for validating labels and for future VLM+CV hybrid design.

| Run | Answer score | Offset-aware score | Mean latency | Coverage |
| --- | ---: | ---: | ---: | ---: |
| `cv-deterministic/full/default` | 36/36 = 100.0% | 36/36 = 100.0% | 0.01s | complete |

This confirms the synthetic manifest labels and measurement metadata are internally consistent.

## Crop/full paired input experiment

Added `data/comprehensive_paired_manifest.jsonl` and `data/comprehensive_crops/*.png`. Each paired row provides:

1. the original full screenshot, and
2. a 2x nearest-neighbor crop around the target region from `regions.crop`.

The runner now supports:

- `--input-mode {full,crop,paired,manifest}`
- `--prompt-variant {default,calibrated}`
- multi-image Qwen3/Qwen2.5 inputs
- `run_key`, `input_mode`, `prompt_variant`, and `image_paths` in result rows

The calibrated prompt tells the model to avoid guessing from style cues and to answer `no` only for clearly visible target discrepancies.

## Validation subset gate

A 16-case balanced validation subset was scored before and after the paired/calibrated change.

| Run | Qwen3 answer | Qwen3 offset-aware | UI-Venus answer | UI-Venus offset-aware |
| --- | ---: | ---: | ---: | ---: |
| Full/default baseline subset | 6/16 = 37.5% | 4/16 = 25.0% | 8/16 = 50.0% | 7/16 = 43.8% |
| Paired/calibrated subset | 8/16 = 50.0% | 7/16 = 43.8% | 8/16 = 50.0% | 7/16 = 43.8% |

The gate passed narrowly: Qwen3 improved by +2/16 answer-correct, UI-Venus did not regress, and paired/calibrated prompting reduced some clean-case false positives. Therefore a full paired/calibrated run was executed.

## Results: full paired/calibrated benchmark

| Model | Answer score | Answer accuracy | Offset-aware score | Offset-aware accuracy | Valid JSON answer | Requested schema | Mean latency/case | Total inference latency |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| `qwen3vl-8b` | 18/36 | 50.0% | 15/36 | 41.7% | 36/36 | 36/36 | 80.30s | 2890.77s |
| `uivenus-8b` | 18/36 | 50.0% | 15/36 | 41.7% | 36/36 | 36/36 | 79.81s | 2873.02s |

Coverage was complete for both models. Paired input roughly doubled latency versus the full/default run.

### Category breakdown: paired/calibrated

| Category | Qwen3-VL-8B answer | Qwen3-VL-8B offset-aware | UI-Venus answer | UI-Venus offset-aware |
| --- | ---: | ---: | ---: | ---: |
| Alignment | 3/6 | 0/6 | 3/6 | 0/6 |
| Size | 2/4 | 2/4 | 2/4 | 2/4 |
| Spacing | 2/4 | 2/4 | 2/4 | 2/4 |
| Texture tiling | 2/4 | 2/4 | 2/4 | 2/4 |
| Icon centering | 2/4 | 2/4 | 1/4 | 1/4 |
| State consistency | 2/4 | 2/4 | 3/4 | 3/4 |
| Text alignment | 2/4 | 2/4 | 2/4 | 2/4 |
| Padding symmetry | 3/6 | 3/6 | 3/6 | 3/6 |

## Interpretation

The no-leak benchmark remains hard for both 8B VLMs. Offset-aware scores are now stricter: they require nonzero estimates for nonzero defects, use per-defect tolerances, and check sign/direction when available. The paired/cropped calibrated variant changes the error shape but does not improve full-set accuracy:

- Qwen3 full/default: 18/36 answer, 14/36 direction-aware offset.
- Qwen3 paired/calibrated: 18/36 answer, 15/36 direction-aware offset.
- UI-Venus full/default: 19/36 answer, 15/36 direction-aware offset.
- UI-Venus paired/calibrated: 18/36 answer, 15/36 direction-aware offset.

Paired/calibrated prompting reduced some clean-case false positives (for example clean icons/padding), but it also introduced or preserved many false negatives on defect cases. The paired prompt often made models answer `yes` broadly, missing subtle injected defects in size, spacing, texture, icon offset, state, text baseline, and padding.

Both models still comply with the requested JSON shape, so the limiting factor is visual judgment/calibration, not formatting.

## Recommendation

Do **not** treat either 8B model as a reliable standalone pixel-level UI/UX inspector yet. `uivenus-8b` remains a slight full/default winner, but the difference is not meaningful enough to choose it as a fine-tuning base by score alone. The paired/crop approach is not worth using as-is because it doubles latency and does not improve full-set accuracy.

Recommended next steps:

1. Build the intended hybrid architecture: VLM locates/interprets UI targets; deterministic CV measures boxes, edges, centers, gaps, baselines, padding, and seams.
2. Use the geometry/CV pseudo-model as a label/measurement oracle for synthetic data, but replace parts with true pixel detectors as needed for natural screenshots.
3. For fine-tuning, emphasize calibrated negative/clean examples and explicit abstention/uncertainty. Current models overcall clean alignment but also miss subtle defects when prompted to be conservative.
4. Try crop-only and lower-resolution crop prompts only if latency can be reduced; paired full+crop is too slow at ~80s/case.
5. If model selection remains necessary, keep both Qwen3-VL-8B and UI-Venus-1.5-8B in the candidate pool, but evaluate any fine-tuning base with this no-leak benchmark plus CV-assisted checks before training.
