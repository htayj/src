# UI feedback report: `data/local_feedback_sample/feedback_ok.png`

## Summary

| Status | Count |
| --- | ---: |
| pass | 7 |
| fail | 0 |
| warning | 0 |
| needs_review | 0 |
| error | 0 |

## Issues

No issues detected.

## Components

| ID | Role | Source | Box |
| --- | --- | --- | --- |
| primary | button | spec | `[120, 176, 300, 238]` |
| secondary | button | spec | `[340, 176, 520, 238]` |
| card1 | card | spec | `[120, 288, 320, 468]` |
| card2 | card | spec | `[364, 288, 564, 468]` |
| card3 | card | spec | `[608, 288, 808, 468]` |
| panel | panel | spec | `[760, 172, 1010, 378]` |
| panel_content | content | spec | `[798, 206, 972, 344]` |
| icon_button | button | spec | `[805, 430, 925, 550]` |
| texture | texture | spec | `[120, 520, 520, 626]` |
| contrast_button | button | spec | `[570, 520, 730, 582]` |
| auto_1 | panel | detector | `[56, 48, 1065, 671]` |
| auto_2 | card | detector | `[608, 172, 1011, 469]` |

## Checks

### buttons-top (alignment)

- Status: **pass**
- Message: top alignment spread is 0.0px
- Targets: `['primary', 'secondary']`
- Metrics: `{"edge": "top", "values_px": [176.0, 176.0], "delta_px": 0.0, "tolerance_px": 3.0}`

### buttons-size (size_consistency)

- Status: **pass**
- Message: size spread width=0.0px height=0.0px
- Targets: `['primary', 'secondary']`
- Metrics: `{"widths_px": [180, 180], "heights_px": [62, 62], "width_delta_px": 0, "height_delta_px": 0, "tolerance_px": 6.0}`

### cards-spacing (spacing_consistency)

- Status: **pass**
- Message: x-axis gap spread is 0.0px
- Targets: `['card1', 'card2', 'card3']`
- Metrics: `{"axis": "x", "gaps_px": [44.0, 44.0], "delta_px": 0.0, "tolerance_px": 8.0}`

### panel-padding (padding_balance)

- Status: **pass**
- Message: padding deltas horizontal=0.0px vertical=0.0px
- Targets: `['panel']`
- Metrics: `{"content_box": [798, 206, 972, 344], "left_px": 38, "right_px": 38, "top_px": 34, "bottom_px": 34, "horizontal_delta_px": 0, "vertical_delta_px": 0, "tolerance_px": 8.0}`

### icon-center (content_centering)

- Status: **pass**
- Message: content center offset is (0.5, 0.5)px
- Targets: `['icon_button']`
- Metrics: `{"content_box": [831, 456, 900, 525], "offset_x_px": 0.5, "offset_y_px": 0.5, "offset_px": 0.7071067811865476, "tolerance_px": 6.0}`

### texture-seam (texture_continuity)

- Status: **pass**
- Message: texture continuity score 0.00
- Targets: `['texture']`
- Metrics: `{"continuity_score": 0.0, "axis": "vertical", "position_px": 175, "estimated_period_x_px": 42, "estimated_period_y_px": 42, "threshold": 8.0}`

### contrast (contrast)

- Status: **pass**
- Message: contrast ratio is 4.64:1
- Targets: `['contrast_button']`
- Metrics: `{"foreground_box": [623, 540, 679, 548], "foreground_rgb": [206.0, 209.0, 214.0], "background_rgb": [80.0, 88.0, 108.0], "contrast_ratio": 4.643790434557316, "min_ratio": 4.5}`
