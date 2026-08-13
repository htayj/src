# CSS packaging and validation for 9-slice web surfaces

## `border-image` packaging

Use `border-image` when the source image already contains the border, corners, and optional center fill.

```css
.fantasy-button {
  --slice-top: 24;
  --slice-right: 28;
  --slice-bottom: 24;
  --slice-left: 28;
  --border-top: 24px;
  --border-right: 28px;
  --border-bottom: 24px;
  --border-left: 28px;

  box-sizing: border-box;
  border-style: solid;
  border-width: var(--border-top) var(--border-right) var(--border-bottom) var(--border-left);
  border-image: url("./fantasy-button.png") var(--slice-top) var(--slice-right) var(--slice-bottom) var(--slice-left) fill / var(--border-top) var(--border-right) var(--border-bottom) var(--border-left) / 0 stretch;
  min-inline-size: 10rem;
  min-block-size: 3rem;
  display: inline-grid;
  place-items: center;
  color: #fff6d6;
}
```

Notes:
- `fill` uses the center of the image as the element background. Remove it if the center smears or hurts readability.
- `stretch` works for smooth gradients and bevels. Try `round` or `repeat` for repeating ornamental edge strips.
- CSS slice numbers are unitless source-image coordinates; border widths are rendered CSS lengths.

## Layered background fallback

Use `border-image` for the border and separate CSS layers for the interior when image-model center texture is too noisy.

```css
.fantasy-panel {
  border: 32px solid transparent;
  border-image: url("./fantasy-panel.png") 32 32 32 32 / 32px 32px 32px 32px / 0 round;
  background:
    linear-gradient(180deg, rgb(48 36 28 / 0.90), rgb(24 18 16 / 0.96)) padding-box,
    radial-gradient(circle at 50% 20%, rgb(255 220 150 / 0.18), transparent 55%) padding-box;
  color: #fff2d0;
}
```

## Parchment panel pattern

For paper/parchment panels, avoid using the source center as `border-image fill` when the center has texture. Use the source only for the protected border/silhouette and repeat a separate long-period center tile in the padding box.

```css
.parchment-panel {
  --paper-border: 64px;
  border: var(--paper-border) solid transparent;
  border-image-source: url("./parchment.source.png");
  border-image-slice: 96;
  border-image-width: var(--paper-border);
  border-image-repeat: round;
  background-image:
    linear-gradient(180deg, rgb(255 233 159 / .14), rgb(112 62 24 / .08)),
    url("./parchment.center.png");
  background-origin: padding-box;
  background-clip: padding-box;
  background-repeat: no-repeat, repeat;
  background-size: 100% 100%, 512px 512px;
  color: #2d170a;
}

@media (max-width: 700px) {
  .parchment-panel { --paper-border: clamp(40px, 12vw, 52px); }
}
```

Parchment-specific checks:

- The center tile should be mathematically seamless and visually non-repetitive at wide widths; a 512px period is safer than 128-256px when stains are visible.
- Corners should blend into adjacent edge strips; square bright corner patches are a common 9-slice giveaway.
- Side-edge raggedness should be subtle enough that tall panels do not show a repeated scallop cadence.
- Demo pages should include quest, journal, nested, card-grid, tall, wide, hostile-background, and tile/source audit sections.

## Overlay and state patterns

```css
.surface-button {
  position: relative;
  isolation: isolate;
}

.surface-button::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
  background: linear-gradient(180deg, rgb(255 255 255 / 0.18), transparent 45%);
  mix-blend-mode: screen;
  opacity: 0.65;
}

.surface-button:hover { filter: brightness(1.08) saturate(1.05); }
.surface-button:active { transform: translateY(1px); filter: brightness(0.92); }
.surface-button:disabled,
.surface-button[aria-disabled="true"] { filter: grayscale(0.65) opacity(0.65); }
.surface-button:focus-visible { outline: 3px solid CanvasText; outline-offset: 3px; }
```

Prefer separate image assets for large state changes; use CSS filters only for subtle, accessible state feedback.

## Retina and file-size notes

- Generate source plates at 2x or 3x the planned CSS border width, then use CSS `border-width` for rendered size.
- Keep transparent padding minimal after final crop; excessive empty margins make slice insets harder to reason about.
- Use PNG/WebP for raster transparency; use SVG only when the source is vector or the demo is synthetic.
- Optimize final assets after visual approval, not before slice/inset iteration.

## Validation checklist

Check every generated HTML/CSS artifact before shipping:

- **Artifact paths:** CSS, HTML, manifest, source image, and optional tiles exist and use relative URLs.
- **Corners:** corners do not warp, clip, smear, or change radius at each target size.
- **Seams:** edge joins at corners are not visible; center-to-edge transitions are smooth.
- **Repeat mode:** `stretch`, `round`, or `repeat` is appropriate for the artwork; repeated motifs do not cut abruptly.
- **Scaling:** test narrow, normal, wide, short, and tall component sizes.
- **Center readability:** text remains legible over the filled or layered background.
- **Contrast:** body text and state indicators satisfy the product's contrast target, typically WCAG AA (4.5:1 for normal text, 3:1 for large text/non-text indicators).
- **States:** normal/hover/active/focus/disabled keep identical geometry and do not shift content.
- **Browser screenshot critique:** screenshot the demo page and ask a vision model to flag seam artifacts, noisy centers, contrast issues, and prompt/inset revisions.
- **Paper-surface repeat audit:** for parchment, inspect a wide proof for repeated stains, a tall proof for side-edge cadence, and hostile cyan/magenta backgrounds for matte contamination.

## Browser critique prompt

```text
Inspect this browser screenshot of generated 9-slice web surfaces.
Find visible seams, warped corners, repeated-edge artifacts, noisy centers, contrast/readability failures, and state inconsistencies.
Recommend whether to change CSS insets/repeat mode or regenerate the source image, and give exact revised values/prompts when possible.
```

## Themed game-UI scorecard

For `high-fantasy`, `dark-gothic`, or `sci-fi` surfaces, add these objective checks:

- **Family fit:** generic material cues match the selected family without needing protected names.
- **IP safety:** no logos, faction emblems, named characters, copied UI layouts, readable letters, exact screenshots, or trademarks.
- **Sliceability:** all distinctive corners/caps/spikes/bolts/gems remain inside the selected top/right/bottom/left insets.
- **Edge behavior:** repeated trim, rivets, runes, cracks, or energy seams have a clean cadence under `stretch`, `round`, or `repeat`.
- **Center readability:** parchment/wood/smoke/glass/metal center stays quiet enough for intended text.
- **Contrast:** theme glow and material texture do not drop text or focus indicator contrast below target.
- **State consistency:** normal/hover/pressed/disabled/focus variants keep identical canvas, silhouette, and slice geometry.

## Themed browser critique prompt

```text
Inspect this browser screenshot of an original game-UI-inspired 9-slice web surface.
Target family: [high-fantasy / dark-gothic / sci-fi].
Score 0-5 and explain: family fit, IP safety, protected-corner adequacy, edge seam/stretch behavior, center readability, contrast, and state consistency.
Flag any copied/trademarked-looking visual elements, logos, faction emblems, readable letters, exact screenshot/layout similarity, or over-specific protected motifs.
Recommend exact CSS insets, border widths, repeat mode, and whether to regenerate with a safer generic material prompt.
```

## Themed local-demo checks

```bash
python3 scripts/package_9slice_surface.py --help | grep -E -- '--demo-theme|high-fantasy|dark-gothic|sci-fi'
python3 scripts/package_9slice_surface.py \
  --demo --demo-theme high-fantasy \
  --out-dir /tmp/pi-9slice-high-fantasy-demo \
  --name high-fantasy-panel \
  --insets 28 32 28 32 \
  --border-width 28 32 28 32 \
  --sizes 180x56,320x96,520x160 \
  --repeat round
grep -q '"demoTheme": "high-fantasy"' /tmp/pi-9slice-high-fantasy-demo/high-fantasy-panel.manifest.json
grep -q 'data-demo-theme="high-fantasy"' /tmp/pi-9slice-high-fantasy-demo/high-fantasy-panel.source.svg
```

## Ornate raster 3-slice button checks

Use 3-slice instead of 9-slice for horizontal buttons when ornate end caps should remain fixed and only the center grows. Keep the layout simple and test the actual browser renderer.

CSS structure:

- Grid columns: `fixed cap | flexible middle content bay | fixed cap`.
- Middle layer spans `grid-column: 1 / -1` and underlaps the caps by about `4-8px`.
- Cap pseudo-elements sit above the middle layer.
- Label sits in `grid-column: 2` only; do not center the label across the caps.
- States keep identical geometry; pressed may move label by `1px`.
- Add `:focus-visible` outline independent of raster art.

Asset checks:

- Middle tile is a rectangular opaque PNG, commonly `512x64` for a 64px-high button.
- The tile repeats horizontally with no visible last-column/first-column seam.
- No baked checkerboard, near-white matte, cyan/magenta key color, or gray fringe remains.
- The center is quiet enough for labels; texture/detail lives mostly in bevel bands.
- Lower bevel has subtle wrapped scuffs/variation so very wide buttons do not read as a mechanical straight bar.

Proof matrix:

- Widths: `330`, `460`, `640`, `860`, and a stress width such as `1024`.
- Backgrounds: dark, mid-gray, parchment, cyan, magenta.
- States: normal, hover, pressed, disabled, focus.
- Labels: short, medium, long/ellipsized, and optionally no-label.

High-fidelity scoring prompt:

```text
Score the new top candidate only as an original IP-safe early-2000s raster game-UI 3-slice web button.
The baseline scored [baseline]/100. This iteration preserves caps and CSS geometry, changes only the repeat-x middle, and targets [specific blocker].
Evaluate: visual polish, middle richness vs readability, wide repeat behavior, cap/middle joins, hostile-background alpha cleanliness, content-bay text placement, and states.
Return a strict score out of 100, explicitly say whether it passes [goal]/100, and list only blocking fixes if it does not pass.
```
