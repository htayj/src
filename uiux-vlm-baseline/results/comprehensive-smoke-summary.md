# VLM benchmark score summary

Manifest: `data/comprehensive_manifest.jsonl`
Manifest cases: 36
Offset tolerance for offset-aware score: ±6.0 px magnitude
Inputs:
- `results/comprehensive-smoke.jsonl`

## Overall

| Model | Answer score | Answer accuracy | Offset-aware score | Offset-aware accuracy | Valid JSON answer | Requested schema | Mean latency | Total latency |
| --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| qwen3vl-8b | 1/2 | 50.0% | 1/2 | 50.0% | 2/2 | 2/2 | 37.9s | 75.8s |
| uivenus-8b | 1/2 | 50.0% | 0/2 | 0.0% | 2/2 | 2/2 | 37.91s | 75.82s |

## Coverage

| Model | Complete | Observed rows | Unique IDs | Missing | Unknown | Duplicates |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| qwen3vl-8b | False | 2 | 2 | 34 | 0 | 0 |
| uivenus-8b | False | 2 | 2 | 34 | 0 | 0 |

## Category breakdown

### qwen3vl-8b

| Category | Answer score | Answer accuracy | Offset-aware score | Offset-aware accuracy |
| --- | ---: | ---: | ---: | ---: |
| comprehensive_alignment | 1/2 | 50.0% | 1/2 | 50.0% |

### uivenus-8b

| Category | Answer score | Answer accuracy | Offset-aware score | Offset-aware accuracy |
| --- | ---: | ---: | ---: | ---: |
| comprehensive_alignment | 1/2 | 50.0% | 0/2 | 0.0% |

## Answer misses

### qwen3vl-8b

- `comp_align_top_ok_center` (comprehensive_alignment): expected `yes`, predicted `no`. Response: {   "answer": "no",   "confidence": 0.95,   "evidence": "Top edges of buttons A and B are visibly misaligned, with button B's top edge slightly lower.",   "offset_px": 4 }

### uivenus-8b

- `comp_align_top_ok_center` (comprehensive_alignment): expected `yes`, predicted `no`. Response: {   "answer": "no",   "confidence": 0.97,   "evidence": "Button A's top edge is visibly higher than button B's top edge.",   "offset_px": 12 }

## Offset-aware misses

### qwen3vl-8b

No extra offset-aware misses beyond answer misses.

### uivenus-8b

- `comp_align_top_bad_04_down` (comprehensive_alignment): answer was correct, but offset estimate `12.0` px was not within tolerance of expected magnitude `4.0` px. Response: {   "answer": "no",   "confidence": 0.97,   "evidence": "Button A's top edge is visibly higher than button B's top edge.",   "offset_px": 12 }

## Coverage issues

### qwen3vl-8b
- missing_ids: `comp_align_top_bad_08_up`, `comp_align_top_bad_12_down`, `comp_align_top_ok_green`, `comp_align_top_ok_purple`, `comp_icon_bad_right_10`, `comp_icon_bad_up_left`, `comp_icon_ok_check`, `comp_icon_ok_plus`, `comp_padding_bad_card_right_20`, `comp_padding_bad_left_16`, `comp_padding_bad_top_12`, `comp_padding_ok_card`, `comp_padding_ok_large`, `comp_padding_ok_repeat`, `comp_size_bad_height_12`, `comp_size_bad_width_16`, `comp_size_ok_blue`, `comp_size_ok_cyan`, `comp_spacing_bad_narrow_gap_14`, `comp_spacing_bad_wide_gap_18` … +14 more

### uivenus-8b
- missing_ids: `comp_align_top_bad_08_up`, `comp_align_top_bad_12_down`, `comp_align_top_ok_green`, `comp_align_top_ok_purple`, `comp_icon_bad_right_10`, `comp_icon_bad_up_left`, `comp_icon_ok_check`, `comp_icon_ok_plus`, `comp_padding_bad_card_right_20`, `comp_padding_bad_left_16`, `comp_padding_bad_top_12`, `comp_padding_ok_card`, `comp_padding_ok_large`, `comp_padding_ok_repeat`, `comp_size_bad_height_12`, `comp_size_bad_width_16`, `comp_size_ok_blue`, `comp_size_ok_cyan`, `comp_spacing_bad_narrow_gap_14`, `comp_spacing_bad_wide_gap_18` … +14 more
