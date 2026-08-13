---
name: ai-9slice-web-surfaces
description: Use when generating or packaging AI-made web button, panel, card, frame, or surface plate assets as 9-slice/9-patch CSS border-image or layered-background components, including slice inset selection, seamless edge validation, state variants, and image-model critique.
---
# AI 9-slice Web Surfaces

Use this skill when a user wants web buttons or scalable UI surfaces made from image-model output. The goal is a source plate with protected corners, stretchable/tileable edges, and a clean center that can be packaged as CSS `border-image`, layered backgrounds, and/or fixed-cap 3-slice button tiles.

For ornate horizontal raster buttons, prefer a 3-slice workflow when the caps carry the identity and the middle should only repeat horizontally. See `references/raster-3slice-button-workflow.md`.

For parchment/paper-like panels, journals, cards, and scroll surfaces, treat the target as a full surface system: deterministic source, separate long-period center tile, browser layouts, hostile-background matrix, and tile audit. See `references/raster-parchment-panel-workflow.md`.

For model selection, generation, viewing, and critique, also use the `image-toolkit` skill.

## IP-safe game-UI style families

Use generic, IP-safe material language for game-UI-inspired 9-slice assets. Do not ask an image model to copy a particular game's UI, screenshot, logo, faction emblem, named character, trademark, readable label, or exact layout.

Supported reusable style families:

- `high-fantasy`: carved stone, aged wood, hammered gold, invented rune-like geometry, warm torch glow, quiet parchment/wood centers.
- `dark-gothic`: blackened iron, bone/ivory trim, cracked leather, ember fissures, deep smoky red-brown centers.
- `sci-fi`: brushed gunmetal, segmented plating, smoky glass, cyan/green energy seams, bolt/corner caps, quiet blue-black centers.

See `references/ip-safe-game-ui-style-families.md` for style-family constraints, suggested insets, repeat modes, colors, and local deterministic demo checks.

## Workflow

1. **Define the asset contract before generating.**
   - Target component: button, card, panel, tooltip, frame, input, badge, etc.
   - States: normal, hover, active/pressed, focus, disabled.
   - Minimum and maximum rendered sizes.
   - Slice insets: top/right/bottom/left pixels that protect corners and edge ornamentation.
   - Text/content color needs and required contrast.

2. **Generate a clean source plate.**
   - Ask for one front-on, orthographic surface per image; no perspective unless the user explicitly wants a non-scalable illusion.
   - Require a transparent or flat removable background, no labels, no icons, no text, no mock UI chrome.
   - Require a quiet center fill and edge details that can stretch or repeat without obvious seams.
   - For state variants, require identical canvas size and identical slice geometry across all states.
   - See `references/prompt-recipes.md` for copy/paste prompts, including IP-safe high-fantasy, dark-gothic, and sci-fi game-UI recipes.

3. **Pick or refine slice insets.**
   - Insets should fully contain rounded corners, bevels, shadows, and decorative end caps.
   - Keep the center region as plain as possible; if the center has texture, test it at several aspect ratios.
   - If edge ornamentation repeats, use CSS `round` or `repeat`; if it is a smooth bevel/gradient, start with `stretch`.
   - For ornate one-line buttons, consider 3-slice instead of 9-slice: fixed left cap, long-period opaque `repeat-x` middle, fixed right cap, cap overlap, and label centered only in the middle content bay.

4. **Package a local demo.**
   - Use `scripts/package_9slice_surface.py` from this skill directory to emit CSS, HTML, a manifest, and an optional demo source:
     ```bash
     python3 scripts/package_9slice_surface.py \
       --input ./source-button.png \
       --out-dir ./dist/9slice-button \
       --name fantasy-button \
       --insets 24 28 24 28 \
       --sizes 160x48,240x64,360x96
     ```
   - Run the built-in demo when no source image is ready:
     ```bash
     python3 scripts/package_9slice_surface.py \
       --demo --out-dir /tmp/pi-9slice-demo --name demo-plate --insets 24 24 24 24
     ```
   - Run a deterministic themed demo without external image APIs:
     ```bash
     python3 scripts/package_9slice_surface.py \
       --demo --demo-theme high-fantasy \
       --out-dir /tmp/pi-9slice-high-fantasy-demo \
       --name high-fantasy-panel \
       --insets 28 32 28 32 \
       --border-width 28 32 28 32 \
       --sizes 180x56,320x96,520x160 \
       --repeat round
     ```
   - Use `--no-fill` when the center of the image smears badly; add a separate layered background for the content area.
   - For parchment panels, prefer a long-period separate center tile (for example 512×512) and prove the surface across quest, journal, card, tall, wide, nested, hostile-background, and tile-audit layouts.

5. **Validate in a browser and with image critique.**
   - Open or screenshot the generated HTML at small, medium, wide, and tall sizes.
   - Check corners, seams, edge repeat cadence, center fill, focus/hover/active states, and text contrast.
   - Use `openrouter_image_analyze` on screenshots when useful; ask for seam artifacts, scaling defects, contrast problems, and revised generation/edit prompts.
   - See `references/css-and-validation.md` for CSS patterns and quality gates.

6. **Iterate deliberately.**
   - If corners warp, increase the relevant inset or regenerate with larger protected corners.
   - If edges smear, switch repeat mode or regenerate with smoother/repeating edge strips.
   - If center texture fights text, regenerate with a cleaner center or use `--no-fill` plus a CSS background.
   - If state variants jump, regenerate as a sprite-like set with identical canvas and slice guides.

## Helper quick checks

From this skill directory:

```bash
python3 scripts/package_9slice_surface.py --help
rm -rf /tmp/pi-9slice-demo /tmp/pi-9slice-high-fantasy-demo
python3 scripts/package_9slice_surface.py \
  --demo --out-dir /tmp/pi-9slice-demo --name demo-plate --insets 24 24 24 24 --sizes 160x48,320x96
python3 scripts/package_9slice_surface.py \
  --demo --demo-theme high-fantasy --out-dir /tmp/pi-9slice-high-fantasy-demo \
  --name high-fantasy-panel --insets 28 32 28 32 --border-width 28 32 28 32 \
  --sizes 180x56,320x96,520x160 --repeat round
ls /tmp/pi-9slice-demo /tmp/pi-9slice-high-fantasy-demo
```

Expected demo artifacts: `<name>.source.svg`, `<name>.css`, `<name>.html`, and `<name>.manifest.json`.

## Secrets and privacy

Do not put API keys, tokens, cookies, service credentials, private source images, or generated secrets in skill files, prompts, manifests, or demo assets. Image-generation credentials must come from the environment or the configured Pi image tools.
