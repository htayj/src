# Raster 3-slice button workflow

Use a 3-slice workflow for ornate horizontal buttons where the end caps carry most of the identity and a full 9-slice plate would make edge art smear or repeat awkwardly.

## Contract

- Left cap: fixed-width ornate end cap, including the inner join brace.
- Middle strip: opaque, quiet, horizontally tileable `repeat-x` art.
- Right cap: fixed-width companion cap, including the inner join brace.
- Text: centered in the flexible middle content bay, not across the caps.
- States: reuse identical geometry for normal, hover, pressed, disabled, and focus.

This is best for buttons, tabs, compact labels, and menu rows. Use a full 9-slice/9-patch for panels, cards, tooltips, and components that must grow vertically.

## Visual recipe

1. Preserve a good baseline before polishing.
2. Keep layout geometry stable while improving art.
3. Let caps be decorative; keep the middle less ornate than the caps.
4. Generate or paint the middle as a long-period periodic strip, commonly `512x64` for a 64px-high button.
5. Put visual interest mostly in bevel bands and near-edge material, not behind labels.
6. Make the lower bevel varied with small dark nicks and amber scuffs, but avoid memorable repeated scratches.
7. Avoid white, checkerboard, cyan, magenta, gray matte, text, logos, emblems, readable runes, or protected motifs.

## CSS assembly pattern

```css
.button3 {
  --cap-w: 104px;
  --h: 64px;
  display: grid;
  grid-template-columns: var(--cap-w) minmax(42px, 1fr) var(--cap-w);
  block-size: var(--h);
  background: transparent;
}

.button3 .mid {
  grid-column: 1 / -1;
  grid-row: 1;
  margin-inline: calc(var(--cap-w) - 8px); /* middle underlaps caps */
  background: url("middle.png") left center / auto 100% repeat-x;
  z-index: 0;
}

.button3::before,
.button3::after {
  content: "";
  grid-row: 1;
  z-index: 2;
  background-position: center;
  background-size: 100% 100%;
  background-repeat: no-repeat;
}

.button3::before { grid-column: 1; background-image: url("left.png"); }
.button3::after { grid-column: 3; background-image: url("right.png"); }

.button3 .label {
  grid-column: 2;
  grid-row: 1;
  z-index: 3;
  align-self: center;
  justify-self: stretch;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

Use a small underlap, often `4-8px`, so cap braces hide the middle/cap transition. Do not change cap widths, overlap, or label placement during art polish unless review identifies them as the blocker.

## Middle-strip generation checks

Suggested checks for an opaque repeat-x middle tile:

- Dimensions match the CSS source height, e.g. `512x64`.
- Alpha is fully opaque for the rectangular strip.
- No near-white/desaturated pixels from source matte or checkerboard backgrounds.
- No cyan/magenta pixels unless those are intentional asset colors.
- Seam jump from last column to first column is no worse than normal internal column jumps.
- Center luma standard deviation is moderate: textured enough to avoid flatness, quiet enough for text.
- Lower bevel has x-axis variation without hard vertical seams or recognizable repeated marks.

For wrapped drawing, draw every scuff at `x`, `x - width`, and `x + width`, or paint in a 3x tiled canvas and crop the center after blur/downsample.

## Proofs

Render proofs in the actual browser and in static composition.

Recommended widths:

- `330px`
- `460px`
- `640px`
- `860px`
- `1024px` or wider as a stress proof

Recommended backgrounds:

- dark brown/black
- mid gray
- parchment/tan
- cyan
- magenta

Cyan and magenta are hostile backgrounds: they expose alpha halos, leftover matte pixels, and accidental transparent holes.

## Scoring prompt template

```text
Please score the new top candidate only as an original IP-safe early-2000s fantasy raster 3-slice web button.
Current best baseline scored [score]/100. This iteration preserves caps and CSS grid geometry, changes only the opaque repeat-x middle strip, and targets [goal] by [specific blocker].

Evaluate visual polish, repeat behavior at wide widths, cap/middle joins, text placement in the content bay, hostile-background alpha/matte cleanliness, and states.
Return a strict score out of 100, explicitly say whether it passes [goal]/100, and name only remaining blocking fixes if it does not pass.
```

## IP-safety reminders

Describe materials, era, lighting, and construction. Do not ask for or include copied game UI, protected logos, faction emblems, named characters, readable symbols, exact screenshots, trademarks, or recognizable proprietary layouts.
