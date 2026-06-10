# VLM benchmark score summary

Manifest: `data/variant_manifest.jsonl`
Manifest cases: 16
Offset tolerance for offset-aware score: ±6.0 px magnitude
Inputs:
- `results/pure-vlm-variant-v1.jsonl`

## Overall

| Run | Model | Input | Prompt | Answer score | Answer accuracy | Offset-aware score | Offset-aware accuracy | Valid JSON answer | Requested schema | Mean latency | Total latency |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| qwen3vl-8b/full/default | qwen3vl-8b | full | default | 9/16 | 56.2% | 6/16 | 37.5% | 16/16 | 16/16 | 40.37s | 645.91s |
| uivenus-8b/full/default | uivenus-8b | full | default | 8/16 | 50.0% | 8/16 | 50.0% | 16/16 | 16/16 | 40.77s | 652.25s |

## Coverage

| Model | Complete | Observed rows | Unique IDs | Missing | Unknown | Duplicates |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| qwen3vl-8b/full/default | True | 16 | 16 | 0 | 0 | 0 |
| uivenus-8b/full/default | True | 16 | 16 | 0 | 0 | 0 |

## Category breakdown

### qwen3vl-8b/full/default

| Category | Answer score | Answer accuracy | Offset-aware score | Offset-aware accuracy |
| --- | ---: | ---: | ---: | ---: |
| variant_alignment | 1/2 | 50.0% | 0/2 | 0.0% |
| variant_icon_centering | 1/2 | 50.0% | 0/2 | 0.0% |
| variant_padding_symmetry | 1/2 | 50.0% | 1/2 | 50.0% |
| variant_size | 1/2 | 50.0% | 1/2 | 50.0% |
| variant_spacing | 1/2 | 50.0% | 1/2 | 50.0% |
| variant_state_consistency | 1/2 | 50.0% | 1/2 | 50.0% |
| variant_text_alignment | 2/2 | 100.0% | 1/2 | 50.0% |
| variant_texture_tiling | 1/2 | 50.0% | 1/2 | 50.0% |

### uivenus-8b/full/default

| Category | Answer score | Answer accuracy | Offset-aware score | Offset-aware accuracy |
| --- | ---: | ---: | ---: | ---: |
| variant_alignment | 1/2 | 50.0% | 1/2 | 50.0% |
| variant_icon_centering | 1/2 | 50.0% | 1/2 | 50.0% |
| variant_padding_symmetry | 1/2 | 50.0% | 1/2 | 50.0% |
| variant_size | 1/2 | 50.0% | 1/2 | 50.0% |
| variant_spacing | 1/2 | 50.0% | 1/2 | 50.0% |
| variant_state_consistency | 1/2 | 50.0% | 1/2 | 50.0% |
| variant_text_alignment | 1/2 | 50.0% | 1/2 | 50.0% |
| variant_texture_tiling | 1/2 | 50.0% | 1/2 | 50.0% |

## Answer misses

### qwen3vl-8b/full/default

- `variant_align_ok_offset_layout` (variant_alignment): expected `yes`, predicted `no`. Response: {   "answer": "no",   "confidence": 0.95,   "evidence": "Top edges of A and B are visibly offset vertically",   "offset_px": 12 }
- `variant_size_bad_taller_14` (variant_size): expected `no`, predicted `yes`. Response: {   "answer": "yes",   "confidence": 1.0,   "evidence": "Buttons A and B have identical width, height, and padding.",   "offset_px": null }
- `variant_spacing_bad_gap_22` (variant_spacing): expected `no`, predicted `yes`. Response: {   "answer": "yes",   "confidence": 0.98,   "evidence": "Visual alignment shows equal horizontal gaps between A-B and B-C.",   "offset_px": 12 }
- `variant_texture_bad_vertical_11` (variant_texture_tiling): expected `no`, predicted `yes`. Response: {   "answer": "yes",   "confidence": 0.98,   "evidence": "Texture seamlessly repeats across all edges with no visible seam.",   "offset_px": null }
- `variant_icon_ok_plus_large` (variant_icon_centering): expected `yes`, predicted `no`. Response: {   "answer": "no",   "confidence": 0.98,   "evidence": "Icon A is positioned above and to the left of the button center.",   "offset_px": -15 }
- `variant_state_bad_hue` (variant_state_consistency): expected `no`, predicted `yes`. Response: {   "answer": "yes",   "confidence": 0.95,   "evidence": "Same shape, alignment, and shadow; only color/label differs.",   "offset_px": null }
- `variant_padding_ok_wide` (variant_padding_symmetry): expected `yes`, predicted `no`. Response: {   "answer": "no",   "confidence": 0.95,   "evidence": "Left padding is larger than right padding",   "offset_px": 8 }

### uivenus-8b/full/default

- `variant_align_ok_offset_layout` (variant_alignment): expected `yes`, predicted `no`. Response: {"answer":"no","confidence":1,"evidence":"Top edges of buttons A and B are not level; B is slightly lower than A.","offset_px":12}
- `variant_size_bad_taller_14` (variant_size): expected `no`, predicted `yes`. Response: {"answer":"yes","confidence":1,"evidence":"Both buttons have identical dimensions and visual appearance, with matching rounded corners and striped texture.","offset_px":0}
- `variant_spacing_bad_gap_22` (variant_spacing): expected `no`, predicted `yes`. Response: {   "answer": "yes",   "confidence": 0.95,   "evidence": "The horizontal gaps between the three cards appear visually equal, with no noticeable variation in spacing.",   "offset_px": 128 }
- `variant_texture_bad_vertical_11` (variant_texture_tiling): expected `no`, predicted `yes`. Response: {"answer":"yes","confidence":1.0,"evidence":"The pattern repeats seamlessly across the button's surface without visible breaks or misalignment.","offset_px":0}
- `variant_icon_bad_down_right` (variant_icon_centering): expected `no`, predicted `yes`. Response: {"answer":"yes","confidence":1.0,"evidence":"The plus icon is perfectly centered within the circular button.","offset_px":null}
- `variant_state_bad_hue` (variant_state_consistency): expected `no`, predicted `yes`. Response: {   "answer": "yes",   "confidence": 0.95,   "evidence": "Both buttons have identical shape, size, and shadow effects, with only color difference.",   "offset_px": 0 }
- `variant_text_bad_field_09` (variant_text_alignment): expected `no`, predicted `yes`. Response: {"answer":"yes","confidence":1.0,"evidence":"The text in both A and B appears to be horizontally aligned at the same baseline level.","offset_px":0}
- `variant_padding_ok_wide` (variant_padding_symmetry): expected `yes`, predicted `no`. Response: {"answer":"no","confidence":1.0,"evidence":"The left inner padding is larger than the right inner padding, creating an asymmetrical appearance.","offset_px":28}

## Offset-aware misses

### qwen3vl-8b/full/default

- `variant_align_bad_up_10` (variant_alignment): answer was correct, but offset estimate `12.0` px was not within tolerance of expected magnitude `10.0` px. Response: {   "answer": "no",   "confidence": 0.95,   "evidence": "Top edges of A and B are visibly offset vertically",   "offset_px": 12 }
- `variant_icon_bad_down_right` (variant_icon_centering): answer was correct, but offset estimate `-15.0` px was not within tolerance of expected magnitude `12.727922061357855` px. Response: {   "answer": "no",   "confidence": 0.98,   "evidence": "Icon A is positioned above and to the left of the button center.",   "offset_px": -15 }
- `variant_text_bad_field_09` (variant_text_alignment): answer was correct, but offset estimate `2.0` px was not within tolerance of expected magnitude `9.0` px. Response: {   "answer": "no",   "confidence": 0.95,   "evidence": "The baseline of 'Username' label is visibly higher than the baseline of 'pixel_user' input text.",   "offset_px": 2 }

### uivenus-8b/full/default

No extra offset-aware misses beyond answer misses.
