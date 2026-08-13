# VLM benchmark score summary

Manifest: `data/comprehensive_manifest.jsonl`
Manifest cases: 36
Offset tolerance for offset-aware score: ±6.0 px magnitude
Inputs:
- `results/ui-feedback-comprehensive.jsonl`

## Overall

| Run | Model | Input | Prompt | Answer score | Answer accuracy | Offset-aware score | Offset-aware accuracy | Valid JSON answer | Requested schema | Mean latency | Total latency |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ui-feedback/detector/v1 | ui-feedback | detector+image | ui-feedback-v1 | 36/36 | 100.0% | 36/36 | 100.0% | 36/36 | 36/36 | 1.47s | 52.75s |

## Coverage

| Model | Complete | Observed rows | Unique IDs | Missing | Unknown | Duplicates |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| ui-feedback/detector/v1 | True | 36 | 36 | 0 | 0 | 0 |

## Category breakdown

### ui-feedback/detector/v1

| Category | Answer score | Answer accuracy | Offset-aware score | Offset-aware accuracy |
| --- | ---: | ---: | ---: | ---: |
| comprehensive_alignment | 6/6 | 100.0% | 6/6 | 100.0% |
| comprehensive_icon_centering | 4/4 | 100.0% | 4/4 | 100.0% |
| comprehensive_padding_symmetry | 6/6 | 100.0% | 6/6 | 100.0% |
| comprehensive_size | 4/4 | 100.0% | 4/4 | 100.0% |
| comprehensive_spacing | 4/4 | 100.0% | 4/4 | 100.0% |
| comprehensive_state_consistency | 4/4 | 100.0% | 4/4 | 100.0% |
| comprehensive_text_alignment | 4/4 | 100.0% | 4/4 | 100.0% |
| comprehensive_texture_tiling | 4/4 | 100.0% | 4/4 | 100.0% |

## Answer misses

### ui-feedback/detector/v1

No answer misses.

## Offset-aware misses

### ui-feedback/detector/v1

No extra offset-aware misses beyond answer misses.
