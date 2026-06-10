# UI/UX VLM baseline report

Date: 2026-05-22

## Scope

Created and ran a small synthetic UI/UX benchmark to quickly check whether candidate open-weight VLMs are obviously unsuitable for fine-grained UI inspection tasks.

The benchmark covers:

- Button top-edge alignment
- Button size equality
- Card spacing consistency
- Texture tiling seams
- Button state consistency
- Icon centering

Two sets were generated:

- `data/manifest.jsonl` + `data/images/`: 13 cases with some visual guides/annotations.
- `data/blind_manifest.jsonl` + `data/blind_images/`: 9 harder cases with no guide lines or defect callouts.

## GPT-image-2 note

Attempted to use GPT-image-2 / GPT-image path first:

- `openrouter_image_generate` required an OpenRouter API key not present in the environment.
- `openai_image_generate` required an OpenAI API key not present in the environment.
- Codex subscription image tool rejected explicit `gpt-image-2` (`model is not supported when using Codex with a ChatGPT account`).
- The fallback Codex image generation produced an unrelated educational worksheet, saved at `assets/gpt-image/openai-image-2026-05-22T14-11-20-622Z-ig_78046bc7.png`, so it was not used for scoring.

For this first baseline, deterministic PIL-rendered synthetic data was used instead. This is actually better for scoring because the exact pixel offsets/defects are known.

## Environment

- GPU: NVIDIA RTX 4090, 24,564 MiB VRAM
- Project: `/home/tay/src/uiux-vlm-baseline`
- Python env: `uv`, Python 3.11, PyTorch 2.9.1+cu128, Transformers 5.9.0

## Models tested

| Key | Model | Notes |
| --- | --- | --- |
| `qwen3vl-8b` | `Qwen/Qwen3-VL-8B-Instruct` | 4-bit BNB load, strong but slow under current Transformers path. |
| `uivenus-8b` | `inclusionAI/UI-Venus-1.5-8B` | Qwen3-VL GUI-specialist, 4-bit BNB load. |
| `qwen3vl-4b` | `Qwen/Qwen3-VL-4B-Instruct` | 4-bit BNB load. |
| `qwen25vl-3b` | `Qwen/Qwen2.5-VL-3B-Instruct` | 4-bit BNB load. |
| `minicpm-v45` | `openbmb/MiniCPM-V-4_5` | bf16 load; required small runtime patch for current Transformers. |
| `infigui-3b` | `InfiX-ai/InfiGUI-G1-3B` | Qwen2.5-VL GUI-grounding specialist. |

Attempted but did not finish:

- `Tongyi-MAI/MAI-UI-8B`: first generation hung/ran extremely slowly after one case; aborted by timeout. Removed cached files to recover disk space.

Not tested yet because disk/time constraints:

- `llava-hf/llava-onevision-qwen2-7b-ov-hf`
- `microsoft/GUI-Actor-7B-Qwen2.5-VL`
- `ByteDance-Seed/UI-TARS-1.5-7B`
- `allenai/Molmo-7B-D-0924`
- PaliGemma 2 variants
- Gemma 4 variants

## Results: guided/annotated 13-case set

| Model | Score | Notable misses |
| --- | ---: | --- |
| Qwen3-VL 8B | 13/13 = 100.0% | None |
| UI-Venus 1.5 8B | 12/13 = 92.3% | One false negative on equal-size buttons |
| Qwen3-VL 4B | 11/13 = 84.6% | State-ok and icon-ok false negatives |
| Qwen2.5-VL 3B | 11/13 = 84.6% | Missed 6px and 12px top-edge alignment offsets |
| MiniCPM-V 4.5 | 11/13 = 84.6% | False negatives on equal-size buttons and centered icon |
| InfiGUI-G1 3B | 11/13 = 84.6% | Missed 12px alignment and state-ok |

Raw files:

- `results/full-qwen3vl-8b.jsonl`
- `results/full-uivenus-8b.jsonl`
- `results/full-qwen3vl-4b.jsonl`
- `results/full-qwen25vl-3b.jsonl`
- `results/full-minicpm-v45.jsonl`
- `results/full-infigui-3b.jsonl`

## Results: blind 9-case set

| Model | Score | Notable misses |
| --- | ---: | --- |
| Qwen3-VL 8B | 9/9 = 100.0% | None |
| UI-Venus 1.5 8B | 9/9 = 100.0% | None |
| MiniCPM-V 4.5 | 8/9 = 88.9% | False negative on aligned buttons |
| Qwen2.5-VL 3B | 7/9 = 77.8% | Missed off-center icon; false negative on state-ok |
| Qwen3-VL 4B | 7/9 = 77.8% | False negatives on aligned buttons and centered icon |
| InfiGUI-G1 3B | 6/9 = 66.7% | Missed texture seam, off-center icon, state-ok |

Raw files:

- `results/blind-qwen3vl-8b.jsonl`
- `results/blind-uivenus-8b.jsonl`
- `results/blind-midsize-comparison.jsonl`

## Preliminary conclusions

1. **Not trash:** Qwen3-VL-8B and UI-Venus-1.5-8B both passed all blind cases and look very promising.
2. **Likely first local baseline:** Qwen3-VL-8B is the strongest general model tested so far.
3. **Best GUI-specialist baseline:** UI-Venus-1.5-8B is strong and may be especially useful for element grounding.
4. **MiniCPM-V 4.5 is promising but memory-heavy:** Very fast per case and good blind score, but bf16 load uses ~19.5GB+ VRAM and leaves little headroom. Need int4/quantized path or lower-res settings for a comfortable workflow.
5. **Smaller 3B/4B models are not hopeless but brittle:** They often overcall defects in clean cases or miss subtle icon/state issues.
6. **The current inference path for Qwen3/UI-Venus is slow:** ~36-39s/case despite low VRAM in 4-bit. We should try vLLM/SGLang or adjust visual token budget for throughput before large benchmark runs.
7. **MAI-UI 8B had a runtime issue:** It loaded but generation was impractically slow/hung on the second case. Could revisit with vLLM, since the project docs recommend vLLM.

## Next recommendations

1. Expand blind benchmark to 50-100 cases with no visible measurement labels.
2. Add cropped-region and full-screenshot paired inputs.
3. Test Qwen3-VL-8B and UI-Venus-1.5-8B with vLLM for speed.
4. Add a deterministic CV-assisted baseline that measures known boxes/edges.
5. Try explicit structured output with boxes/points, not just yes/no.
6. If GPT-image-2 access becomes available, generate more natural UI screenshots, then post-process/annotate them with known synthetic defects for scoring.
