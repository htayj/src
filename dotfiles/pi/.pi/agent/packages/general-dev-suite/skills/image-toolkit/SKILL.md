---
name: image-toolkit
description: Use when generating, editing, analyzing, critiquing, viewing, comparing, or iterating on images with Pi using local ComfyUI, Civitai assets/workflows, OpenAI GPT-image models, OpenRouter vision models, or local vision models.
---
# Image Toolkit

Use this skill for image generation and image analysis work in Pi.

## First choice by task

1. **Final-quality generation/editing:** use `openrouter_image_generate` with `openai/gpt-5.4-image-2`. This is the specific model from the local OpenRouter WebUI comparison, and prior human feedback preferred it over tested alternatives.
2. **Local/private/control-heavy generation:** use ComfyUI tools (`comfyui_status`, `comfyui_models`, `comfyui_object_info`, `comfyui_workflow`, `comfyui_queue_workflow`, `comfyui_image`, `comfyui_upload_image`) for local models, Flux/SDXL/checkpoints, LoRAs, ControlNet, inpainting, upscaling, and reproducible workflows.
3. **Analysis/critique/revision prompts:** use `openrouter_image_analyze` on generated images/screenshots. Ask it for concrete defects, prompt improvements, and variant ranking.
4. **Viewing:** use `show_image` or `/image` for local image paths returned by the generators.

For model-by-model strengths and weaknesses, read [references/model-guide.md](references/model-guide.md).

## Standard generation loop

1. Call `image_model_guide` if the route is not obvious.
2. Generate:
   - `openrouter_image_generate` for OpenRouter `openai/gpt-5.4-image-2` final images; keep `openai_image_generate` only for direct OpenAI Images API tests or transparent-background OpenAI work.
   - `comfyui_queue_workflow` for local ComfyUI workflows.
3. Display the saved output with `show_image` or `/image`.
4. Analyze with `openrouter_image_analyze`, asking for:
   - visible artifacts;
   - composition/style misses;
   - text/OCR problems;
   - whether it satisfies the original prompt;
   - a revised prompt or edit instruction.
5. Iterate. Keep saved output paths and exact model/workflow/seed/prompt details.

## ComfyUI procedure

- Start with `comfyui_status` before assuming the server, queue, models, or nodes exist.
- Use `comfyui_models` to inspect checkpoints/LoRAs/upscale models.
- Use `comfyui_object_info` before inventing node input names.
- Use `comfyui_workflow` to save reusable API-format workflow JSON.
- Use `comfyui_queue_workflow` with `wait:true` to collect output image metadata.
- Use `comfyui_image` to download output images to local files, then `show_image`.
- Use `civitai_search` before `civitai_download`; run downloads dry (`confirm:false`) first.

## OpenRouter analysis procedure

- Use local paths when images were generated locally; use URLs only for public/remote images.
- Default model is configurable with `PI_OPENROUTER_VISION_MODEL`; otherwise the tool uses a strong Gemini vision default.
- For subtle visual critique, ask for ranked observations and quote coordinates/regions.
- For UI screenshots, ask for accessibility, hierarchy, contrast, spacing, responsive issues, and copy problems.

## Secrets and privacy

- Never write API keys to dotfiles, prompts, skill files, workflow JSON, or notes.
- `OPENAI_API_KEY`/`PI_OPENAI_API_KEY`, `OPENROUTER_API_KEY`/`PI_OPENROUTER_API_KEY`, and `CIVITAI_API_TOKEN` must come from the environment.
- Use ComfyUI/local vision when images are private and should not be uploaded.
