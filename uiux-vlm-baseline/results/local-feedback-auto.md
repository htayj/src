# UI feedback report: `data/local_feedback_sample/feedback_issues.png`

## Summary

| Status | Count |
| --- | ---: |
| pass | 0 |
| fail | 5 |
| warning | 0 |
| needs_review | 0 |
| error | 0 |

## Issues

| Check | Severity | Message | Suggestion |
| --- | --- | --- | --- |
| auto-contrast-auto_3 | fail | contrast ratio is 3.45:1 | Increase contrast to at least 4.5:1. |
| auto-contrast-auto_4 | fail | contrast ratio is 3.58:1 | Increase contrast to at least 4.5:1. |
| auto-contrast-auto_8 | fail | contrast ratio is 2.03:1 | Increase contrast to at least 4.5:1. |
| auto-button-top-alignment | fail | top alignment spread is 12.0px | Align top values within 6px; current spread is 12.0px. |
| auto-card-spacing | fail | x-axis gap spread is 28.0px | Make adjacent x-axis gaps consistent; spread is 28.0px. |

## Components

| ID | Role | Source | Box |
| --- | --- | --- | --- |
| auto_1 | panel | detector | `[56, 48, 1065, 671]` |
| auto_2 | card | detector | `[636, 172, 1011, 551]` |
| auto_3 | button | detector | `[120, 176, 301, 239]` |
| auto_4 | button | detector | `[340, 188, 549, 251]` |
| auto_5 | card | detector | `[120, 288, 321, 469]` |
| auto_6 | card | detector | `[364, 288, 565, 469]` |
| auto_7 | button | detector | `[120, 520, 521, 627]` |
| auto_8 | button | detector | `[570, 520, 731, 583]` |

## Checks

### auto-contrast-auto_3 (contrast)

- Status: **fail**
- Message: contrast ratio is 3.45:1
- Suggestion: Increase contrast to at least 4.5:1.
- Targets: `['auto_3']`
- Metrics: `{"foreground_box": [200, 196, 220, 204], "foreground_rgb": [193.5, 211.5, 249.0], "background_rgb": [37.0, 99.0, 235.0], "contrast_ratio": 3.4496514700894125, "min_ratio": 4.5}`

### auto-contrast-auto_4 (contrast)

- Status: **fail**
- Message: contrast ratio is 3.58:1
- Suggestion: Increase contrast to at least 4.5:1.
- Targets: `['auto_4']`
- Metrics: `{"foreground_box": [428, 208, 461, 216], "foreground_rgb": [199.0, 215.0, 250.0], "background_rgb": [37.0, 99.0, 235.0], "contrast_ratio": 3.575907935871457, "min_ratio": 4.5}`

### auto-contrast-auto_8 (contrast)

- Status: **fail**
- Message: contrast ratio is 2.03:1
- Suggestion: Increase contrast to at least 4.5:1.
- Targets: `['auto_8']`
- Metrics: `{"foreground_box": [623, 540, 679, 548], "foreground_rgb": [132.0, 137.0, 151.0], "background_rgb": [80.0, 88.0, 108.0], "contrast_ratio": 2.03358421859738, "min_ratio": 4.5}`

### auto-button-top-alignment (alignment)

- Status: **fail**
- Message: top alignment spread is 12.0px
- Suggestion: Align top values within 6px; current spread is 12.0px.
- Targets: `['auto_3', 'auto_4']`
- Metrics: `{"edge": "top", "values_px": [176.0, 188.0], "delta_px": 12.0, "tolerance_px": 6.0}`

### auto-card-spacing (spacing_consistency)

- Status: **fail**
- Message: x-axis gap spread is 28.0px
- Suggestion: Make adjacent x-axis gaps consistent; spread is 28.0px.
- Targets: `['auto_5', 'auto_6', 'auto_2']`
- Metrics: `{"axis": "x", "gaps_px": [43.0, 71.0], "delta_px": 28.0, "tolerance_px": 8.0}`
