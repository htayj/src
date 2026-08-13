# VLM benchmark score summary

Manifest: `data/variant_manifest.jsonl`
Manifest cases: 16
Offset tolerance for offset-aware score: ±6.0 px magnitude
Inputs:
- `results/hybrid-variant-v1.jsonl`

## Overall

| Run | Model | Input | Prompt | Answer score | Answer accuracy | Offset-aware score | Offset-aware accuracy | Valid JSON answer | Requested schema | Mean latency | Total latency |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| hybrid-vlm-cv/regions-cv/v1 | hybrid-vlm-cv | regions+image | hybrid-cv-v1 | 16/16 | 100.0% | 16/16 | 100.0% | 16/16 | 16/16 | 0.04s | 0.65s |

## Coverage

| Model | Complete | Observed rows | Unique IDs | Missing | Unknown | Duplicates |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| hybrid-vlm-cv/regions-cv/v1 | True | 16 | 16 | 0 | 0 | 0 |

## Category breakdown

### hybrid-vlm-cv/regions-cv/v1

| Category | Answer score | Answer accuracy | Offset-aware score | Offset-aware accuracy |
| --- | ---: | ---: | ---: | ---: |
| variant_alignment | 2/2 | 100.0% | 2/2 | 100.0% |
| variant_icon_centering | 2/2 | 100.0% | 2/2 | 100.0% |
| variant_padding_symmetry | 2/2 | 100.0% | 2/2 | 100.0% |
| variant_size | 2/2 | 100.0% | 2/2 | 100.0% |
| variant_spacing | 2/2 | 100.0% | 2/2 | 100.0% |
| variant_state_consistency | 2/2 | 100.0% | 2/2 | 100.0% |
| variant_text_alignment | 2/2 | 100.0% | 2/2 | 100.0% |
| variant_texture_tiling | 2/2 | 100.0% | 2/2 | 100.0% |

## Answer misses

### hybrid-vlm-cv/regions-cv/v1

No answer misses.

## Offset-aware misses

### hybrid-vlm-cv/regions-cv/v1

No extra offset-aware misses beyond answer misses.
