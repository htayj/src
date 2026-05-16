# Image Model Guide

This guide is local-practice oriented rather than a universal benchmark. Model availability changes; use `openai_image_models`, `openrouter_image_models`, and `comfyui_models` to verify the current machine.

## Recommended defaults

| Task | Default | Why |
|---|---|---|
| Best final generation/editing | Newest available GPT-image via `openai_image_generate` | Prior human feedback in this setup preferred newest GPT-image. Strong prompt following, coherent scenes, and better text/design adherence. |
| Local/private generation | ComfyUI | Keeps images local; supports checkpoints, LoRAs, ControlNet, inpainting, upscaling, batching, seed/sampler control, and reusable workflows. |
| Image analysis/critique | OpenRouter vision model via `openrouter_image_analyze` | Good for visual reasoning, variant comparison, screenshot critique, artifact diagnosis, and revised prompt writing. |
| Fast private rough analysis | Local LM Studio vision model through normal Pi model selection | No upload/cost, but weaker than top hosted vision models. |

## GPT-image family

Use for:
- final user-facing images;
- prompt-to-image from natural-language art direction;
- image edits where high instruction-following matters;
- mockups/product shots/posters/story illustrations;
- cases where readable text or exact requested details matter.

Strengths:
- best observed result quality in this local history;
- strong instruction following;
- simple workflow: prompt in, image file out;
- better compositional coherence than many untuned diffusion defaults.

Weaknesses:
- remote API/cost path;
- less low-level control than ComfyUI;
- less suitable for exact seeded reproducibility;
- model names evolve, so check available models and set `PI_OPENAI_IMAGE_MODEL` to the newest GPT-image model if needed.

## ComfyUI local workflows

Use for:
- private images that should stay local;
- custom styles/characters/checkpoints/LoRAs;
- ControlNet, IPAdapter, masks, inpainting, outpainting, upscaling;
- reproducible experiments with seeds, samplers, schedulers, and saved workflows;
- batching many variants cheaply.

Strengths:
- local and controllable;
- broad ecosystem of checkpoints and nodes;
- exact workflow JSON can be saved and reused;
- good for technical image operations and model experimentation.

Weaknesses:
- quality depends on installed assets and workflow design;
- prompt adherence may require negative prompts, LoRAs, or ControlNet;
- more operational complexity than GPT-image;
- server/node/model availability must be checked first.

## OpenRouter vision models

Use for:
- analyzing generated outputs;
- comparing variants and selecting the best;
- screenshot/UI/UX review;
- OCR-ish inspection of labels and visible text;
- writing revised image prompts or edit instructions.

Strengths:
- model-swappable API;
- strong multimodal reasoning with top Gemini/OpenAI-class models;
- can analyze local files by data URL or public URLs;
- useful as an independent critic in an image iteration loop.

Weaknesses:
- analysis only unless a chosen model explicitly supports image output;
- uploads local images to the remote provider;
- tiny text or dense diagrams may need crops/high-resolution inputs;
- OpenRouter model IDs/capabilities change frequently.

## Local vision models

Use for:
- private rough descriptions;
- quick triage when LM Studio has a vision model loaded;
- avoiding remote upload/cost for non-critical analysis.

Strengths:
- local/private;
- low marginal cost;
- often good enough for coarse descriptions.

Weaknesses:
- can miss subtle visual issues;
- weaker OCR and layout critique;
- depends on which local model is currently loaded;
- not for generation in this toolkit.

## Practical loops

### Highest-quality image loop

1. `openai_image_generate` with newest GPT-image.
2. `show_image` the saved output.
3. `openrouter_image_analyze` with the original prompt and image path.
4. Ask for concrete defects plus a revised prompt/edit instruction.
5. Regenerate or edit.

### Local-control loop

1. `comfyui_status`.
2. `comfyui_models` and `comfyui_object_info`.
3. Create/read workflow with `comfyui_workflow`.
4. Queue with `comfyui_queue_workflow` (`wait:true`).
5. Fetch image with `comfyui_image` and display with `show_image`.
6. Analyze with `openrouter_image_analyze` or a local vision model.

### Variant comparison prompt for analysis

```text
Compare these generated images against the original prompt below. Rank them best to worst.
For each image, list: prompt adherence, composition, style, artifacts, text issues, and one concrete next edit.
Original prompt: ...
```
