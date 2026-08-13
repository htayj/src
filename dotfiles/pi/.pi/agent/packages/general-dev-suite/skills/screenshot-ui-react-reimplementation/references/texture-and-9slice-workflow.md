# Texture and 9-Slice Border Workflow

Research notes: CSS `border-image-slice` divides an image into nine regions: four fixed corners, four scalable edges, and a center that is ignored unless `fill` is used. Game/UI 9-slice systems use this specifically to preserve corners while stretching edges for variable-size panels/buttons. In CSS, always provide a real border box, typically `border: <width> solid transparent`, then set `border-image-source`, `border-image-slice`, `border-image-width`, and `border-image-repeat`.

Use this when a screenshot contains ornate frames, parchment panels, metal buttons, stone backgrounds, or other textured UI that CSS gradients alone cannot capture.

## Decision tree

1. **CSS-only first** when the surface is simple: flat color, simple gradient, standard border, mild shadow.
2. **Texture patch background** when the surface has repeating grain/noise but its border is simple. Crop an interior patch away from text/icons and use it with `background-image` plus a tinting gradient.
3. **9-slice / 9-patch border** when corners and edges are ornate and must scale independently: parchment cards, fantasy frames, engraved buttons, speech bubbles, metallic panels.
4. **Manual vector/CSS approximation** when the screenshot asset is too small, text-covered, copyrighted, or visually noisy.

Prefer the least invasive technique that improves fidelity without changing layout. If a 9-slice crop breaks sizing, repeats text, or paints unwanted center content, revert to texture backgrounds plus conventional CSS borders or use a transparent-center overlay instead of `border-image`.

## Component decomposition with a vision model

For high-fidelity border work, ask an image-capable model to decompose the reference into coordinate boxes before cropping. Attach the actual reference image and ask for:

- major component bounding boxes `(x,y,w,h)`;
- 9-slice candidate crop boxes;
- slice insets `(top right bottom left)`;
- repeat mode (`stretch` vs `round`);
- whether `fill` is safe;
- clean texture sample boxes without text/icons;
- warnings for regions that should not be 9-sliced.

The model cannot see local file paths unless the image is attached/uploaded. Treat coordinates as approximate and verify by cropping/capturing in-browser.

## Manual crop procedure

1. Save the screenshot locally and record native dimensions.
2. Identify a clean representative component instance: panel, button, card, frame, badge.
3. Crop the full component including corners and edges.
4. Choose slice insets that isolate corners from stretchable edges, typically 8–32 px depending on asset size.
5. Save the crop under the implementation's local assets directory.
6. Apply CSS:

```css
.panel {
  border: 24px solid transparent;
  border-image: url('./assets/panel-9slice.png') 28 fill stretch;
  background:
    linear-gradient(rgba(220, 190, 120, .75), rgba(200, 160, 90, .82)),
    url('./assets/parchment-texture.png') center / 360px auto repeat;
}
```

Use `round` when the edge art is tileable/repeating and must avoid partial tiles; use `stretch` when the edge is painterly or should scale continuously. Include `fill` only when the center of the 9-slice image is clean, text-free, and intended to paint the background. Avoid `fill` for crops that include labels, list rows, icons, or other content; otherwise the browser may smear/repeat those details across the component.

If the center slice does not visually mesh with the edges, split the asset into layers:

1. a clean/tileable interior texture as `background-image`;
2. a no-fill `border-image` for scalable borders; or
3. for very noisy screenshot-derived frames, a transparent-center overlay PNG positioned with `::before`/`::after` using `background-size: 100% 100%`.

Use overlay PNGs when the screenshot crop has irregular ornamentation that does not tile cleanly but you need exact reference edges at a fixed target size.

## Separate decorative texture from content-derived structure

Before extracting assets, classify every visible mark as one of:

1. **Surface texture** — random/organic material such as parchment grain, stone cracks, metal noise, cloth, dirt, stains. This can be cropped as a repeating/covering background.
2. **Border/frame art** — corners, rails, bevels, jewels, carved metal/wood edges. This belongs in 9-slice borders or fixed ornaments.
3. **Content-derived structure** — row lines, column separators, table grids, list dividers, selected/hover states, text baselines, icon slots, alignment guides. These must be generated from DOM/CSS based on content, not baked into the background texture.

For tables/lists, do **not** use a background crop that contains row lines unless the rows are static and exactly the same count/height as the reference. Prefer:

```css
.file-row { border-bottom: 1px solid rgba(70, 42, 12, .35); }
.file-row:nth-child(even) { background: rgba(80, 50, 15, .025); }
```

or a separate divider asset repeated at each row boundary by CSS/DOM. This keeps rows aligned with real content rather than with an unrelated bitmap pattern.

## Extracting texture patches

- Crop interior areas with minimal text/icons and without semantic/content lines when possible.
- Prefer larger patches for organic paper/stone; prefer narrow strips for rails/edges.
- If a crop includes table row lines, section dividers, text ghosts, icons, or content shadows, reject it as a surface texture and either crop elsewhere or recreate those marks as CSS tied to DOM structure.
- Smooth or reduce contrast if the patch creates visible seams.
- Layer a CSS gradient/color over the patch so text remains legible.

## ComfyUI segmentation guidance

ComfyUI segmentation can help when:

- the component boundary is irregular or overlaps a textured background;
- you need a mask for a crest, seal, icon, or decorative object;
- manual rectangular crops include too much neighboring content;
- you want to isolate a foreground ornament before using it as an overlay.

Manual crop is usually better when:

- the target is a rectangular card/button/panel suitable for `border-image`;
- you only need corners/edges/interior texture;
- the screenshot already provides clean rectangular bounds;
- segmentation would add setup time without improving the 9-slice.

If using ComfyUI, keep it as an optional mask-generation step: export the mask/isolated PNG, inspect it manually, then use the resulting crop in normal CSS. Do not make the React component depend on ComfyUI at runtime.

## Validation checklist

- [ ] Cropped assets are local and documented.
- [ ] CSS uses `border-image` or layered `background-image` intentionally.
- [ ] Text remains legible over textures.
- [ ] Component scales without distorted corners.
- [ ] The crop does not repeat/smear embedded source text or icons into the component body.
- [ ] Layout dimensions remain close to the pre-texture version.
- [ ] The implementation still uses semantic React components, not one screenshot image.
- [ ] Report includes crop source coordinates or a description of the sampled region.
