# VLM benchmark score summary

Manifest: `data/comprehensive_manifest.jsonl`
Manifest cases: 16
Offset tolerance for offset-aware score: ±6.0 px magnitude
Inputs:
- `results/comprehensive-qwen3vl-8b.jsonl`
- `results/comprehensive-uivenus-8b.jsonl`

## Overall

| Run | Model | Input | Prompt | Answer score | Answer accuracy | Offset-aware score | Offset-aware accuracy | Valid JSON answer | Requested schema | Mean latency | Total latency |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| qwen3vl-8b | qwen3vl-8b |  |  | 6/16 | 37.5% | 4/16 | 25.0% | 16/16 | 16/16 | 37.77s | 604.24s |
| uivenus-8b | uivenus-8b |  |  | 8/16 | 50.0% | 7/16 | 43.8% | 16/16 | 16/16 | 36.63s | 586.02s |

## Coverage

| Model | Complete | Observed rows | Unique IDs | Missing | Unknown | Duplicates |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| qwen3vl-8b | True | 16 | 16 | 0 | 0 | 0 |
| uivenus-8b | True | 16 | 16 | 0 | 0 | 0 |

## Category breakdown

### qwen3vl-8b

| Category | Answer score | Answer accuracy | Offset-aware score | Offset-aware accuracy |
| --- | ---: | ---: | ---: | ---: |
| comprehensive_alignment | 1/2 | 50.0% | 0/2 | 0.0% |
| comprehensive_icon_centering | 1/2 | 50.0% | 0/2 | 0.0% |
| comprehensive_padding_symmetry | 0/2 | 0.0% | 0/2 | 0.0% |
| comprehensive_size | 1/2 | 50.0% | 1/2 | 50.0% |
| comprehensive_spacing | 1/2 | 50.0% | 1/2 | 50.0% |
| comprehensive_state_consistency | 1/2 | 50.0% | 1/2 | 50.0% |
| comprehensive_text_alignment | 1/2 | 50.0% | 1/2 | 50.0% |
| comprehensive_texture_tiling | 0/2 | 0.0% | 0/2 | 0.0% |

### uivenus-8b

| Category | Answer score | Answer accuracy | Offset-aware score | Offset-aware accuracy |
| --- | ---: | ---: | ---: | ---: |
| comprehensive_alignment | 1/2 | 50.0% | 1/2 | 50.0% |
| comprehensive_icon_centering | 0/2 | 0.0% | 0/2 | 0.0% |
| comprehensive_padding_symmetry | 2/2 | 100.0% | 2/2 | 100.0% |
| comprehensive_size | 1/2 | 50.0% | 1/2 | 50.0% |
| comprehensive_spacing | 2/2 | 100.0% | 2/2 | 100.0% |
| comprehensive_state_consistency | 0/2 | 0.0% | 0/2 | 0.0% |
| comprehensive_text_alignment | 1/2 | 50.0% | 0/2 | 0.0% |
| comprehensive_texture_tiling | 1/2 | 50.0% | 1/2 | 50.0% |

## Answer misses

### qwen3vl-8b

- `comp_align_top_ok_center` (comprehensive_alignment): expected `yes`, predicted `no`. Response: {   "answer": "no",   "confidence": 0.95,   "evidence": "Top edges of buttons A and B are visibly misaligned, with button B's top edge slightly lower.",   "offset_px": 4 }
- `comp_size_bad_width_16` (comprehensive_size): expected `no`, predicted `yes`. Response: {   "answer": "yes",   "confidence": 1.0,   "evidence": "Buttons A and B have identical width and height, aligned horizontally with consistent spacing and visual texture.",   "offset_px": null }
- `comp_spacing_bad_wide_gap_18` (comprehensive_spacing): expected `no`, predicted `yes`. Response: {   "answer": "yes",   "confidence": 1.0,   "evidence": "Visual alignment shows equal horizontal gaps between A-B and B-C.",   "offset_px": 16 }
- `comp_texture_ok_wide` (comprehensive_texture_tiling): expected `yes`, predicted `no`. Response: {   "answer": "no",   "confidence": 0.98,   "evidence": "Visible seam along the right edge of the button",   "offset_px": 2 }
- `comp_texture_bad_phase_07` (comprehensive_texture_tiling): expected `no`, predicted `yes`. Response: {   "answer": "yes",   "confidence": 0.98,   "evidence": "Texture seamlessly repeats with no visible seam along edges.",   "offset_px": null }
- `comp_icon_ok_plus` (comprehensive_icon_centering): expected `yes`, predicted `no`. Response: {   "answer": "no",   "confidence": 0.95,   "evidence": "The white plus icon is visibly offset to the top-left within the blue circular button.",   "offset_px": 12 }
- `comp_state_bad_radius` (comprehensive_state_consistency): expected `no`, predicted `yes`. Response: {   "answer": "yes",   "confidence": 0.95,   "evidence": "B is hover state, A is default; both have same shape, corner radius, and shadow; color difference is intentional for state change.",   "offset_px": null }
- `comp_text_baseline_bad_label_06` (comprehensive_text_alignment): expected `no`, predicted `yes`. Response: {   "answer": "yes",   "confidence": 1.0,   "evidence": "The baseline of 'Email' label and input text align vertically in both A and B.",   "offset_px": 0 }
- `comp_padding_ok_card` (comprehensive_padding_symmetry): expected `yes`, predicted `no`. Response: {   "answer": "no",   "confidence": 0.95,   "evidence": "Left padding is larger than right padding",   "offset_px": 8 }
- `comp_padding_bad_top_12` (comprehensive_padding_symmetry): expected `no`, predicted `yes`. Response: {   "answer": "yes",   "confidence": 0.98,   "evidence": "Inner padding appears evenly distributed on all sides.",   "offset_px": null }

### uivenus-8b

- `comp_align_top_ok_center` (comprehensive_alignment): expected `yes`, predicted `no`. Response: {   "answer": "no",   "confidence": 0.97,   "evidence": "Button A's top edge is visibly higher than button B's top edge.",   "offset_px": 12 }
- `comp_size_ok_cyan` (comprehensive_size): expected `yes`, predicted `no`. Response: {"answer":"no","confidence":1,"evidence":"Button B is wider than button A.","offset_px":12}
- `comp_texture_bad_phase_07` (comprehensive_texture_tiling): expected `no`, predicted `yes`. Response: {"answer":"yes","confidence":1,"evidence":"The pattern repeats seamlessly across the button with no visible seam at the edges.","offset_px":0}
- `comp_icon_ok_plus` (comprehensive_icon_centering): expected `yes`, predicted `no`. Response:  {"answer":"no","confidence":1,"evidence":"The white cross icon is visibly shifted towards the bottom of the blue circular button.","offset_px":12,"offset_direction":"down"}
- `comp_icon_bad_up_left` (comprehensive_icon_centering): expected `no`, predicted `yes`. Response:  {"answer":"yes","confidence":1,"evidence":"The checkmark is visually centered within the blue circle.","offset_px":null}
- `comp_state_ok_success_hover` (comprehensive_state_consistency): expected `yes`, predicted `no`. Response: {   "answer": "no",   "confidence": 0.95,   "evidence": "State B (Hover) has a different visual texture and color gradient compared to State A (Default).",   "offset_px": 12 }
- `comp_state_bad_radius` (comprehensive_state_consistency): expected `no`, predicted `yes`. Response: {   "answer": "yes",   "confidence": 0.95,   "evidence": "Both buttons have same shape, size, and striped texture, with state B being a lighter shade of pink indicating hover state.",   "offset_px": 0 }
- `comp_text_baseline_ok_label` (comprehensive_text_alignment): expected `yes`, predicted `no`. Response: {"answer":"no","confidence":1,"evidence":"The text baselines in the two email input fields are visibly misaligned, with one appearing higher than the other.","offset_px":12}

## Offset-aware misses

### qwen3vl-8b

- `comp_align_top_bad_12_down` (comprehensive_alignment): answer was correct, but offset estimate `2.0` px was not within tolerance of expected magnitude `12.0` px. Response: {   "answer": "no",   "confidence": 0.98,   "evidence": "Top edges of buttons A and B are visibly misaligned, with button B's top edge slightly lower.",   "offset_px": 2 }
- `comp_icon_bad_up_left` (comprehensive_icon_centering): answer was correct, but offset estimate `12.0` px was not within tolerance of expected magnitude `12.806248474865697` px. Response: {   "answer": "no",   "confidence": 0.95,   "evidence": "The checkmark visually appears offset toward the top-right within the blue circle.",   "offset_px": 12 }

### uivenus-8b

- `comp_text_baseline_bad_label_06` (comprehensive_text_alignment): answer was correct, but offset estimate `12.0` px was not within tolerance of expected magnitude `6.0` px. Response: {"answer":"no","confidence":1,"evidence":"The text baselines in the two email input fields are visibly misaligned, with one appearing higher than the other.","offset_px":12}
