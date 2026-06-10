# UI feedback holdout aggregate summary

Generated: 2026-05-25

Purpose: check that the UI feedback analyzer is not only passing the original comprehensive/variant benchmark cases.

Holdout design:
- No A/B/C badges.
- Neutral case IDs, image filenames, spec filenames, and spec IDs: no `_ok`, `_bad`, `pass`, `fail`, defect direction, or magnitude tokens.
- Spec supplies component boxes and check requests, not expected answers or defect magnitudes.
- Expected pass/fail statuses live only in the holdout manifest and are used after analyzer output for scoring.
- Seven families: alignment, size, spacing, padding, content centering, texture continuity, contrast.
- Three independent deterministic seeds; 28 cases per seed.
- Hash audit after regeneration: 84/84 unique images and 84/84 unique specs.

| Seed | Alignment | Size | Spacing | Padding | Centering | Texture | Contrast | Total |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| 20260525 | 4/4 | 4/4 | 4/4 | 4/4 | 4/4 | 4/4 | 4/4 | 28/28 |
| 20260601 | 4/4 | 4/4 | 4/4 | 4/4 | 4/4 | 4/4 | 4/4 | 28/28 |
| 20260602 | 4/4 | 4/4 | 4/4 | 4/4 | 4/4 | 4/4 | 4/4 | 28/28 |

Aggregate: **84/84**.

Additional check:
- Absolute output directory generation/scoring works: `/tmp/ui_feedback_abs_holdout`, seed `20260707`, 28/28.

Per-seed details:
- `results/ui-feedback-holdout-20260525-summary.md`
- `results/ui-feedback-holdout-20260601-summary.md`
- `results/ui-feedback-holdout-20260602-summary.md`
