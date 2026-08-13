# Saved UI/UX VLM benchmark results

This is a durable snapshot of the current benchmark state before hybrid VLM/CV iteration.

## Current final benchmark artifacts

- Comprehensive report: `results/comprehensive-report.md`
- Full/default summaries: `results/comprehensive-summary.json`, `results/comprehensive-summary.md`
- Paired/calibrated summaries: `results/comprehensive-paired-calibrated-summary.json`, `results/comprehensive-paired-calibrated-summary.md`
- CV baseline summaries: `results/comprehensive-cv-summary.json`, `results/comprehensive-cv-summary.md`
- Validation subset summaries:
  - `results/comprehensive-validation-full-default-baseline-summary.json`
  - `results/comprehensive-paired-calibrated-validation-summary.json`

## Final headline scores

| Run | Qwen3 answer | Qwen3 direction-aware offset | UI-Venus answer | UI-Venus direction-aware offset |
| --- | ---: | ---: | ---: | ---: |
| Full/default no-leak | 18/36 | 14/36 | 19/36 | 15/36 |
| Paired/calibrated | 18/36 | 15/36 | 18/36 | 15/36 |
| Deterministic CV/geometry baseline | 36/36 | 36/36 | n/a | n/a |

## Current conclusion

Standalone 8B VLMs are not reliable pixel-level UI/UX inspectors. The next target is a hybrid system: VLM for target interpretation/semantic routing, deterministic CV for geometry and pixel measurements.
