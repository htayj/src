# Raster parchment panel workflow

Use this workflow for reusable parchment/paper-like 9-slice panels, journals, quest surfaces, cards, and scroll panes. It is based on the deterministic `/tmp/pi-9slice-demo/gpt-parchment-panel` candidate that Oracle scored **95/100** in session `9slice-parchment-paper-iter2`.

## Asset contract

Recommended defaults:

- Source: `768x512` RGBA.
- Insets: `96 96 96 96` source pixels.
- CSS border: `64px` desktop, responsive down to about `40-52px` on narrow screens.
- Center tile: separate periodic PNG, preferably `512x512` for panels so wide layouts do not reveal short-period stains.
- Rendering: `border-image` from the source for the ragged/burnt silhouette; separate repeated center tile clipped to the padding box.
- Content: all text, icons, links, and controls are HTML/CSS, never baked into the raster source.

## Deterministic generation pattern

1. Generate the center tile first.
   - Make it periodic in both x and y.
   - Favor low-contrast fibers and small pore variation.
   - Avoid recognizable large stains on short periods; a mathematically seamless tile can still fail visually if the motif repeats.
2. Generate top/bottom edge strips periodic in x and left/right strips periodic in y.
   - Pin first/last samples after generation for clean metrics.
   - Keep rag amplitude organic but not so regular that tall panels show a scallop cadence.
3. Generate protected corners separately.
   - Corners may be richer/darker, but blend their inner boundaries into adjacent edge strips to avoid square 9-slice patches.
4. Add ragged alpha edges.
   - Transparent/partial-alpha pixels should carry warm burnt RGB, not white/gray/cyan/magenta matte colors.
5. Export source, center tile, slice guide, nine extracted tiles, proof image, tile montage, and manifest metrics.

## CSS package

Use border image only for the border/silhouette and keep the center as a normal background layer:

```css
.parchment-panel {
  --paper-border: 64px;
  border: var(--paper-border) solid transparent;
  border-image-source: url("panel.source.png");
  border-image-slice: 96;
  border-image-width: var(--paper-border);
  border-image-repeat: round;
  background-image: url("panel.center.png");
  background-origin: padding-box;
  background-clip: padding-box;
  background-repeat: repeat;
  background-size: 512px 512px;
  color: #2d170a;
}

@media (max-width: 700px) {
  .parchment-panel { --paper-border: clamp(40px, 12vw, 52px); }
}
```

Add focus styles independent of the raster art and keep link/body text contrast above the product target.

## Proof/demo requirements

A parchment panel should be reviewed as a system. Include:

- Hero quest panel.
- Two-column journal layout.
- Nested note/card.
- Card grid.
- Tall scroll panel.
- Wide stress panel.
- Hostile-background matrix: dark, gray, parchment, cyan, magenta.
- Tile/source audit with source PNG, center tile, slice guide, proof image, tile montage, manifest, CSS, and HTML.

## Validation gates

Minimum manifest checks:

- Source dimensions and insets match the contract.
- Alpha range spans `0..255` and includes partial-alpha edge pixels.
- No bad transparent matte pixels: white/gray, cyan key, or magenta key contamination.
- Center seam x/y p95 below a small threshold (ideally 0 after edge pinning).
- Edge seam/alpha p95 below a small threshold.
- Ink text contrast p05 at least `4.5:1`; link/non-text indicators at least `3:1`.
- Browser screenshots at desktop, tablet, and narrow widths.

Vision/Oracle blockers to watch:

- Visually detectable center motif repeat even when metrics are perfect.
- Square-ish corner patches or rigid inner bands that reveal the 9-slice construction.
- Regular side-edge scallop cadence in tall panels.
- Mobile borders consuming too much content width.
- Any baked text/symbols, logos, copied UI, or protected game-specific motifs.
