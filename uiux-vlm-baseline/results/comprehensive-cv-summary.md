# VLM benchmark score summary

Manifest: `data/comprehensive_manifest.jsonl`
Manifest cases: 36
Offset tolerance for offset-aware score: ±6.0 px magnitude
Inputs:
- `results/comprehensive-cv-baseline.jsonl`

## Overall

| Run | Model | Input | Prompt | Answer score | Answer accuracy | Offset-aware score | Offset-aware accuracy | Valid JSON answer | Requested schema | Mean latency | Total latency |
| --- | --- | --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| cv-deterministic/full/default | cv-deterministic | full | default | 36/36 | 100.0% | 36/36 | 100.0% | 36/36 | 36/36 | 0.01s | 0.47s |

## Coverage

| Model | Complete | Observed rows | Unique IDs | Missing | Unknown | Duplicates |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| cv-deterministic/full/default | True | 36 | 36 | 0 | 0 | 0 |

## Category breakdown

### cv-deterministic/full/default

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

### cv-deterministic/full/default

No answer misses.

## Offset-aware misses

### cv-deterministic/full/default

No extra offset-aware misses beyond answer misses.
