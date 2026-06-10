# VLM benchmark score summary

Manifest: `data/comprehensive_paired_manifest.jsonl`
Manifest cases: 16
Offset tolerance for offset-aware score: ±6.0 px magnitude
Inputs:
- `results/comprehensive-paired-calibrated-validation.jsonl`

## Overall

| Run | Model | Input | Prompt | Answer score | Answer accuracy | Offset-aware score | Offset-aware accuracy | Valid JSON answer | Requested schema | Mean latency | Total latency |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| qwen3vl-8b/paired/calibrated | qwen3vl-8b | paired | calibrated | 8/16 | 50.0% | 7/16 | 43.8% | 16/16 | 16/16 | 71.36s | 1141.7s |
| uivenus-8b/paired/calibrated | uivenus-8b | paired | calibrated | 8/16 | 50.0% | 7/16 | 43.8% | 16/16 | 16/16 | 74.87s | 1197.88s |

## Coverage

| Model | Complete | Observed rows | Unique IDs | Missing | Unknown | Duplicates |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| qwen3vl-8b/paired/calibrated | True | 16 | 16 | 0 | 0 | 0 |
| uivenus-8b/paired/calibrated | True | 16 | 16 | 0 | 0 | 0 |

## Category breakdown

### qwen3vl-8b/paired/calibrated

| Category | Answer score | Answer accuracy | Offset-aware score | Offset-aware accuracy |
| --- | ---: | ---: | ---: | ---: |
| comprehensive_alignment | 1/2 | 50.0% | 0/2 | 0.0% |
| comprehensive_icon_centering | 1/2 | 50.0% | 1/2 | 50.0% |
| comprehensive_padding_symmetry | 1/2 | 50.0% | 1/2 | 50.0% |
| comprehensive_size | 1/2 | 50.0% | 1/2 | 50.0% |
| comprehensive_spacing | 1/2 | 50.0% | 1/2 | 50.0% |
| comprehensive_state_consistency | 1/2 | 50.0% | 1/2 | 50.0% |
| comprehensive_text_alignment | 1/2 | 50.0% | 1/2 | 50.0% |
| comprehensive_texture_tiling | 1/2 | 50.0% | 1/2 | 50.0% |

### uivenus-8b/paired/calibrated

| Category | Answer score | Answer accuracy | Offset-aware score | Offset-aware accuracy |
| --- | ---: | ---: | ---: | ---: |
| comprehensive_alignment | 1/2 | 50.0% | 0/2 | 0.0% |
| comprehensive_icon_centering | 1/2 | 50.0% | 1/2 | 50.0% |
| comprehensive_padding_symmetry | 1/2 | 50.0% | 1/2 | 50.0% |
| comprehensive_size | 1/2 | 50.0% | 1/2 | 50.0% |
| comprehensive_spacing | 1/2 | 50.0% | 1/2 | 50.0% |
| comprehensive_state_consistency | 1/2 | 50.0% | 1/2 | 50.0% |
| comprehensive_text_alignment | 1/2 | 50.0% | 1/2 | 50.0% |
| comprehensive_texture_tiling | 1/2 | 50.0% | 1/2 | 50.0% |

## Answer misses

### qwen3vl-8b/paired/calibrated

- `comp_align_top_ok_center` (comprehensive_alignment): expected `yes`, predicted `no`. Response: {   "answer": "no",   "confidence": 0.98,   "evidence": "Top edges of buttons A and B are visibly offset vertically.",   "offset_px": 2 }
- `comp_size_bad_width_16` (comprehensive_size): expected `no`, predicted `yes`. Response: {   "answer": "yes",   "confidence": 1.0,   "evidence": "Buttons A and B have identical width and height in both images.",   "offset_px": null }
- `comp_spacing_bad_wide_gap_18` (comprehensive_spacing): expected `no`, predicted `yes`. Response: {   "answer": "yes",   "confidence": 1.0,   "evidence": "The horizontal gaps between A-B and B-C are visually identical in both images.",   "offset_px": null }
- `comp_texture_bad_phase_07` (comprehensive_texture_tiling): expected `no`, predicted `yes`. Response: {   "answer": "yes",   "confidence": 1.0,   "evidence": "Texture seamlessly repeats across button C with no visible seam.",   "offset_px": null }
- `comp_icon_bad_up_left` (comprehensive_icon_centering): expected `no`, predicted `yes`. Response: {   "answer": "yes",   "confidence": 1.0,   "evidence": "The white checkmark is visually centered within the blue circular button.",   "offset_px": null }
- `comp_state_bad_radius` (comprehensive_state_consistency): expected `no`, predicted `yes`. Response: {   "answer": "yes",   "confidence": 1.0,   "evidence": "B is a lighter pink with same border and shadow as A, indicating hover state consistency.",   "offset_px": null }
- `comp_text_baseline_bad_label_06` (comprehensive_text_alignment): expected `no`, predicted `yes`. Response: {   "answer": "yes",   "confidence": 1.0,   "evidence": "The baseline of 'Email' label and input text 'name@example' align vertically in both A and B.",   "offset_px": null }
- `comp_padding_bad_top_12` (comprehensive_padding_symmetry): expected `no`, predicted `yes`. Response: {   "answer": "yes",   "confidence": 1.0,   "evidence": "Inner padding appears evenly distributed on all sides.",   "offset_px": null }

### uivenus-8b/paired/calibrated

- `comp_align_top_ok_center` (comprehensive_alignment): expected `yes`, predicted `no`. Response: {"answer":"no","confidence":1,"evidence":"Top edges of buttons A and B are not aligned; there is a visible vertical misalignment.","offset_px":12}
- `comp_size_bad_width_16` (comprehensive_size): expected `no`, predicted `yes`. Response: {"answer":"yes","confidence":1,"evidence":"Both buttons have identical width and height in the cropped view.","offset_px":0}
- `comp_spacing_bad_wide_gap_18` (comprehensive_spacing): expected `no`, predicted `yes`. Response: {"answer":"yes","confidence":1,"evidence":"Spacing between A-B and B-C appears equal in both images.","offset_px":0}
- `comp_texture_bad_phase_07` (comprehensive_texture_tiling): expected `no`, predicted `yes`. Response: {"answer":"yes","confidence":1,"evidence":"Pattern repeats seamlessly across the button with no visible seam at the edge.","offset_px":0}
- `comp_icon_bad_up_left` (comprehensive_icon_centering): expected `no`, predicted `yes`. Response:  {"answer":"yes","confidence":1,"evidence":"The white checkmark is visually centered within the blue circular button.","offset_px":0}
- `comp_state_bad_radius` (comprehensive_state_consistency): expected `no`, predicted `yes`. Response:  {"answer":"yes","confidence":1,"evidence":"B's pink shade and striped pattern match A's design language","offset_px":0}
- `comp_text_baseline_bad_label_06` (comprehensive_text_alignment): expected `no`, predicted `yes`. Response: {"answer":"yes","confidence":1,"evidence":"The text baselines in both A and B are horizontally aligned within their respective input fields.","offset_px":0}
- `comp_padding_bad_top_12` (comprehensive_padding_symmetry): expected `no`, predicted `yes`. Response: {"answer":"yes","confidence":1,"evidence":"Inner padding appears evenly distributed on all sides of component A.","offset_px":0}

## Offset-aware misses

### qwen3vl-8b/paired/calibrated

- `comp_align_top_bad_12_down` (comprehensive_alignment): answer was correct, but offset estimate `2.0` px was not within tolerance of expected magnitude `12.0` px. Response: {   "answer": "no",   "confidence": 0.98,   "evidence": "Top edges of buttons A and B are visibly offset vertically.",   "offset_px": 2 }

### uivenus-8b/paired/calibrated

- `comp_align_top_bad_12_down` (comprehensive_alignment): answer was correct, but offset estimate `12.0` px was not within tolerance of expected magnitude `12.0` px. Response: {"answer":"no","confidence":1,"evidence":"Top edges of buttons A and B are not aligned; there is a visible vertical misalignment.","offset_px":12}
