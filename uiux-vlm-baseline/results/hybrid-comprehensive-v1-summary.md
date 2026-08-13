# VLM benchmark score summary

Manifest: `data/comprehensive_manifest.jsonl`
Manifest cases: 36
Offset tolerance for offset-aware score: ±6.0 px magnitude
Inputs:
- `results/hybrid-comprehensive-v1.jsonl`

## Overall

| Run | Model | Input | Prompt | Answer score | Answer accuracy | Offset-aware score | Offset-aware accuracy | Valid JSON answer | Requested schema | Mean latency | Total latency |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| hybrid-vlm-cv/regions-cv/v1 | hybrid-vlm-cv | regions+image | hybrid-cv-v1 | 36/36 | 100.0% | 36/36 | 100.0% | 36/36 | 36/36 | 0.03s | 1.18s |

## Coverage

| Model | Complete | Observed rows | Unique IDs | Missing | Unknown | Duplicates |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| hybrid-vlm-cv/regions-cv/v1 | True | 36 | 36 | 0 | 0 | 0 |

## Category breakdown

### hybrid-vlm-cv/regions-cv/v1

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

### hybrid-vlm-cv/regions-cv/v1

No answer misses.

## Offset-aware misses

### hybrid-vlm-cv/regions-cv/v1

No extra offset-aware misses beyond answer misses.
