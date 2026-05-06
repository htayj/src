---
name: "imagegen"
description: "Generate or edit raster images when the task benefits from AI-created bitmap visuals such as photos, illustrations, textures, sprites, mockups, or transparent-background cutouts. Use when the Clawmacs agent should create a brand-new image, transform an existing image, or derive visual variants from references, and the output should be a bitmap asset rather than repo-native code or vector. Do not use when the task is better handled by editing existing SVG/vector/code-native assets, extending an established icon or logo system, or building the visual directly in HTML/CSS/canvas."
---

# Image Generation Skill

Generates or edits images for the current project using the bundled `scripts/image_gen.py` CLI. Clawmacs does not provide a built-in image generation tool, so this skill is CLI-only and requires `OPENAI_API_KEY` for live API calls.

## Rules

- Use the bundled `scripts/image_gen.py` workflow; do not create one-off SDK runners.
- Run the CLI through the execution mechanism available to the Clawmacs agent, such as Lisp evaluation with `uiop:run-program` when shell execution is needed.
- Never modify `scripts/image_gen.py`. If something is missing, ask the user before doing anything else.
- Write project-bound final artifacts into the workspace, preferably under `output/imagegen/`, unless the user names another destination.
- Do not overwrite an existing asset unless the user explicitly asked for replacement; otherwise create a sibling versioned filename such as `hero-v2.png` or `item-icon-edited.png`.
- Never ask the user to paste an API key in chat. Ask them to set `OPENAI_API_KEY` locally and confirm when ready.

The CLI exposes three subcommands:
- `generate`
- `edit`
- `generate-batch`

## When to use

- Generate a new image, such as concept art, product shots, covers, website heroes, UI mockups, sprites, or infographics.
- Generate a new image using one or more reference images for style, composition, or mood.
- Edit an existing image, such as inpainting, lighting/weather transformations, background replacement, object removal, compositing, or transparent background extraction.
- Produce many assets or variants for one task.

## When not to use

- Extending or matching an existing SVG/vector icon set, logo system, or illustration library inside the repo.
- Creating simple shapes, diagrams, wireframes, or icons that are better produced directly in SVG, HTML/CSS, or canvas.
- Making a small project-local asset edit when the source file already exists in an editable native format.
- Any task where the user clearly wants deterministic code-native output instead of a generated bitmap.

## Workflow

1. Decide the intent: `generate`, `edit`, or `generate-batch`.
2. Decide whether the output is preview-only or meant to be consumed by the current project.
3. Collect inputs up front: prompt(s), exact text, constraints/avoid list, and any input images.
4. For every input image, label its role explicitly: reference image, edit target, or supporting insert/style/compositing input.
5. Build the prompt using the shared schema below and the prompting references.
6. Use `references/cli.md` for command syntax, output paths, masks, batch JSONL, and dry-runs.
7. Use `references/image-api.md` for `quality`, `input_fidelity`, masks, output format, and API parameter guidance.
8. Use `references/clawmacs-network.md` if the CLI cannot access the network from the active harness.
9. Inspect outputs and validate subject, style, composition, text accuracy, and invariants/avoid items.
10. Iterate with a single targeted change, then re-check.
11. Report the final saved path, final prompt, and command mode used.

## Shared prompt schema

Use the following labeled spec as prompt scaffolding:

```text
Use case: <taxonomy slug>
Asset type: <where the asset will be used>
Primary request: <user's main prompt>
Input images: <Image 1: role; Image 2: role> (optional)
Scene/backdrop: <environment>
Subject: <main subject>
Style/medium: <photo/illustration/3D/etc>
Composition/framing: <wide/close/top-down; placement>
Lighting/mood: <lighting + mood>
Color palette: <palette notes>
Materials/textures: <surface details>
Text (verbatim): "<exact text>"
Constraints: <must keep/must avoid>
Avoid: <negative constraints>
```

## Use-case taxonomy

Generate:
- `photorealistic-natural` - candid/editorial lifestyle scenes with real texture and natural lighting.
- `product-mockup` - product/packaging shots, catalog imagery, merch concepts.
- `ui-mockup` - app/web interface mockups and wireframes; specify the desired fidelity.
- `infographic-diagram` - diagrams/infographics with structured layout and text.
- `logo-brand` - logo/mark exploration, vector-friendly.
- `illustration-story` - comics, children's book art, narrative scenes.
- `stylized-concept` - style-driven concept art, 3D/stylized renders.
- `historical-scene` - period-accurate/world-knowledge scenes.

Edit:
- `text-localization` - translate/replace in-image text, preserve layout.
- `identity-preserve` - try-on, person-in-scene; lock face/body/pose.
- `precise-object-edit` - remove/replace a specific element.
- `lighting-weather` - time-of-day/season/atmosphere changes only.
- `background-extraction` - transparent background or clean cutout.
- `style-transfer` - apply reference style while changing subject/scene.
- `compositing` - multi-image insert/merge with matched lighting/perspective.
- `sketch-to-render` - drawing/line art to photoreal render.

## Prompting rules

- Structure prompt as scene/backdrop -> subject -> details -> constraints.
- Include intended use to set the mode and polish level.
- Use camera/composition language for photorealism.
- Quote exact text and specify typography plus placement.
- For tricky words, spell them letter-by-letter and require verbatim rendering.
- For multi-image inputs, reference images by index and describe how they should be used.
- For edits, repeat invariants every iteration to reduce drift.
- If the prompt is generic, add only the extra detail that will materially help.
- If the prompt is already detailed, normalize it instead of expanding it.

## Environment

- `OPENAI_API_KEY` must be set for live API calls.
- `--dry-run` does not require network or the `openai` Python package.
- If dependencies are missing, tell the user which dependency is missing and how to install it into the active environment.

Required Python package:
```bash
uv pip install openai
```

Optional for downscaling only:
```bash
uv pip install pillow
```

## Reference map

- `references/prompting.md`: shared prompting principles.
- `references/sample-prompts.md`: copy/paste prompt recipes.
- `references/cli.md`: CLI usage via `scripts/image_gen.py`.
- `references/image-api.md`: API/CLI parameter reference.
- `references/clawmacs-network.md`: network/sandbox troubleshooting for CLI mode.
- `scripts/image_gen.py`: CLI implementation.
