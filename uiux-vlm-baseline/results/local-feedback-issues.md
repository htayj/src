# UI feedback report: `data/local_feedback_sample/feedback_issues.png`

## Summary

| Status | Count |
| --- | ---: |
| pass | 0 |
| fail | 7 |
| warning | 0 |
| needs_review | 0 |
| error | 0 |

## Issues

| Check | Severity | Message | Suggestion |
| --- | --- | --- | --- |
| buttons-top | fail | top alignment spread is 12.0px | Align top values within 3px; current spread is 12.0px. |
| buttons-size | fail | size spread width=28.0px height=0.0px | Make compared components the same size or update the spec tolerance. |
| cards-spacing | fail | x-axis gap spread is 28.0px | Make adjacent x-axis gaps consistent; spread is 28.0px. |
| panel-padding | fail | padding deltas horizontal=18.0px vertical=-10.0px | Balance inner content padding or adjust the container/content box. |
| icon-center | fail | content center offset is (12.5, -9.5)px | Move content by approximately (-12.5, 9.5)px. |
| texture-seam | fail | texture continuity score 29.75 | Inspect the highlighted periodic discontinuity for a tiling seam. |
| contrast | fail | contrast ratio is 2.03:1 | Increase contrast to at least 4.5:1. |

## Components

| ID | Role | Source | Box |
| --- | --- | --- | --- |
| primary | button | spec | `[120, 176, 300, 238]` |
| secondary | button | spec | `[340, 188, 548, 250]` |
| card1 | card | spec | `[120, 288, 320, 468]` |
| card2 | card | spec | `[364, 288, 564, 468]` |
| card3 | card | spec | `[636, 288, 836, 468]` |
| panel | panel | spec | `[760, 172, 1010, 378]` |
| panel_content | content | spec | `[816, 206, 972, 334]` |
| icon_button | button | spec | `[805, 430, 925, 550]` |
| texture | texture | spec | `[120, 520, 520, 626]` |
| contrast_button | button | spec | `[570, 520, 730, 582]` |
| auto_1 | panel | detector | `[56, 48, 1065, 671]` |
| auto_2 | card | detector | `[636, 172, 1011, 551]` |

## Checks

### buttons-top (alignment)

- Status: **fail**
- Message: top alignment spread is 12.0px
- Suggestion: Align top values within 3px; current spread is 12.0px.
- Targets: `['primary', 'secondary']`
- Metrics: `{"edge": "top", "values_px": [176.0, 188.0], "delta_px": 12.0, "tolerance_px": 3.0}`

### buttons-size (size_consistency)

- Status: **fail**
- Message: size spread width=28.0px height=0.0px
- Suggestion: Make compared components the same size or update the spec tolerance.
- Targets: `['primary', 'secondary']`
- Metrics: `{"widths_px": [180, 208], "heights_px": [62, 62], "width_delta_px": 28, "height_delta_px": 0, "tolerance_px": 6.0}`

### cards-spacing (spacing_consistency)

- Status: **fail**
- Message: x-axis gap spread is 28.0px
- Suggestion: Make adjacent x-axis gaps consistent; spread is 28.0px.
- Targets: `['card1', 'card2', 'card3']`
- Metrics: `{"axis": "x", "gaps_px": [44.0, 72.0], "delta_px": 28.0, "tolerance_px": 8.0}`

### panel-padding (padding_balance)

- Status: **fail**
- Message: padding deltas horizontal=18.0px vertical=-10.0px
- Suggestion: Balance inner content padding or adjust the container/content box.
- Targets: `['panel']`
- Metrics: `{"content_box": [816, 206, 972, 334], "left_px": 56, "right_px": 38, "top_px": 34, "bottom_px": 44, "horizontal_delta_px": 18, "vertical_delta_px": -10, "tolerance_px": 8.0}`

### icon-center (content_centering)

- Status: **fail**
- Message: content center offset is (12.5, -9.5)px
- Suggestion: Move content by approximately (-12.5, 9.5)px.
- Targets: `['icon_button']`
- Metrics: `{"content_box": [843, 446, 912, 515], "offset_x_px": 12.5, "offset_y_px": -9.5, "offset_px": 15.700318468107582, "tolerance_px": 6.0}`

### texture-seam (texture_continuity)

- Status: **fail**
- Message: texture continuity score 29.75
- Suggestion: Inspect the highlighted periodic discontinuity for a tiling seam.
- Targets: `['texture']`
- Metrics: `{"continuity_score": 29.74960317460339, "axis": "vertical", "position_px": 330, "estimated_period_x_px": 42, "estimated_period_y_px": 42, "threshold": 8.0}`

### contrast (contrast)

- Status: **fail**
- Message: contrast ratio is 2.03:1
- Suggestion: Increase contrast to at least 4.5:1.
- Targets: `['contrast_button']`
- Metrics: `{"foreground_box": [623, 540, 679, 548], "foreground_rgb": [132.0, 137.0, 151.0], "background_rgb": [80.0, 88.0, 108.0], "contrast_ratio": 2.03358421859738, "min_ratio": 4.5}`
