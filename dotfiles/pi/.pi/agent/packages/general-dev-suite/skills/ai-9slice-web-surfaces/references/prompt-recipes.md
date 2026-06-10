# Prompt recipes for AI 9-slice web surfaces

Use these as starting points. Replace bracketed fields and keep the constraints that protect sliceability.

## Button plate

```text
Create a single [style/material] web button surface plate for 9-slice CSS use.
Orthographic front-on view, centered, one asset only, no perspective.
Transparent background or a flat solid background that can be removed.
No words, no letters, no icons, no symbols, no UI mockup, no cursor.
Canvas: [e.g. 512x192] with generous padding.
Shape: [rounded rectangle / pill / chamfered rectangle].
Corners and bevels must remain inside [T/R/B/L] slice margins.
Edges should be smooth or seamlessly repeatable when stretched horizontally and vertically.
Center area should be quiet, low-detail, and readable behind text.
Lighting must be symmetrical enough that the left/right and top/bottom edges can scale without obvious seams.
Return only the plate asset.
```

## Ornate raster 3-slice button

Use this when a horizontal button should scale with fixed caps and a repeat-x middle instead of a full 9-slice plate.

```text
Create an original IP-safe raster-painted [style family] 3-slice horizontal web button asset set, front-on orthographic, no perspective.

Return three separated components on transparent background or a flat removable chroma-key background, with no checkerboard pattern:

1. Left fixed cap: ornate [material] end cap with chunky bevels and an inner vertical join brace. No text, letters, logos, emblems, icons, crests, readable symbols, named characters, copied UI layout, screenshot elements, or trademarks.
2. Middle repeat-x tile: a deliberately quiet seamless horizontal strip, [dark material] content bay, continuous but subtly varied top/bottom bevels, low-contrast painterly grain, and wrapped scuffs. No unique ornaments, no readable marks, no rivets or symbols that will create obvious repetition. Left and right edges must tile cleanly.
3. Right fixed cap: companion cap matching the left cap, same scale and lighting, with an inner vertical join brace.

Style: early-2000s-inspired raster game UI mood using generic materials only: [examples: hammered bronze, blackened iron, aged wood, dark leather, carved stone, warm amber bevels]. Production sprite quality, clean alpha edges, 6-8px bleed inside each component, no shadow or glow extending outside component boxes, no text.
```

Post-process notes: preserve cap geometry, make the middle opaque and long-period when possible, prove on hostile cyan/magenta backgrounds, and center labels only in the flexible middle bay.

## Panel surface

```text
Create a scalable 9-slice panel/card background plate for web UI.
Front-on orthographic view, one rectangular panel only, transparent or removable flat background.
No text, icons, screenshots, labels, decorative content in the center, or perspective tilt.
Style: [ornate fantasy frame / glassmorphism plate / brass machine panel / soft clay card].
Canvas: [e.g. 768x512]. Protected corner details fit within [T/R/B/L] pixels.
The center must be calm and tile/stretch safely; edge strips must be seamless under stretch or repeat.
Include subtle inner depth and outer shadow only if it remains within the slice margins.
```

## Parchment/paper panel surface

Use this when the desired output is a reusable paper-surface system rather than a single decorative frame.

```text
Create one original IP-safe parchment/paper 9-slice web UI surface plate.
Front-on orthographic rectangular paper sheet, transparent background, no perspective.
Canvas: 768x512 RGBA target. Protected slice insets: 96px top/right/bottom/left.
Style: warm aged fantasy parchment, burnt/ragged alpha edges, subtle fibers, faint stains, early-2000s raster UI mood using generic material cues only.
No words, letters, numbers, logos, faction emblems, readable runes, icons, seals, screenshots, copied UI layouts, trademarks, characters, or symbols.
Corners: protected, organic, slightly darker/burnt, but blend into adjacent top/bottom/side strips so the 9-slice construction is not obvious.
Edges: top/bottom should be seamless or periodic in x; left/right should be seamless or periodic in y; raggedness should not form a short regular scallop cadence.
Center: quiet parchment suitable for dark ink body text; no unique stains that will visibly repeat. Prefer a separate long-period center tile, e.g. 512x512, for CSS padding-box fill.
Return only clean raster assets; all text and controls will be HTML/CSS.
```

Revision notes: if a seamless center still shows repeating stains at wide widths, enlarge the tile period or dilute recognizable marks. If corners look square, soften corner-to-edge transitions rather than changing slice insets. See `raster-parchment-panel-workflow.md`.

## State variants

```text
Generate [normal, hover, pressed, disabled, focus] state variants of the same 9-slice web button plate.
All variants must use identical canvas size, identical silhouette, identical slice boundaries, identical corner geometry, and identical transparent background.
No text, icons, letters, labels, or mock UI.
Only change lighting/material response appropriate to the state:
- normal: [baseline material]
- hover: slightly brighter rim and clearer focus of material
- pressed: inset/pressed lighting, reduced highlight, same outline
- disabled: lower contrast and saturation, same geometry
- focus: optional outer glow that stays inside or consistently outside the planned border area
Return variants as separate clean assets or a clearly aligned grid with equal cells.
```

## Critique prompt

Use this with a generated source plate or browser screenshot.

```text
Evaluate this as a 9-slice web UI surface asset.
Check whether it will scale cleanly with CSS border-image.
Report: protected-corner adequacy, edge stretch/repeat seams, center readability for text, background removal issues, perspective/skew problems, state consistency, and likely WCAG contrast concerns.
Recommend exact top/right/bottom/left slice insets in pixels if possible.
If it is not suitable, give a concise revised image-generation prompt.
```

## Revision prompt

```text
Revise the previous 9-slice surface asset for better web scaling.
Keep the same style and overall silhouette, but make these corrections:
- [e.g. make the center flatter and less noisy]
- [e.g. make left and right edge strips symmetrical and stretchable]
- [e.g. enlarge corner caps so 28px insets protect all bevel/shadow details]
- [e.g. remove accidental letters/icons/background texture]
Keep orthographic front-on geometry, one asset only, no text/icons, transparent or removable flat background, and identical slice geometry.
```

## Negative constraints to keep

- No text, letters, logos, icons, watermark, cursor, UI screenshot, or labels.
- No perspective, rotation, camera angle, foreshortening, or cast shadow that crosses slice boundaries.
- No high-frequency texture in the center unless it is meant to tile.
- No asymmetric edge ornament unless the target component will only render at one fixed size.

## IP-safe era-inspired game UI recipes

Use these for game-UI mood without asking for copied game assets. Keep all prompts generic: material, lighting, geometry, and craft only.

### `high-fantasy` button or panel

```text
Create one original high-fantasy 9-slice web UI surface plate.
Use generic materials: carved stone, aged dark wood, hammered gold trim, invented rune-like geometric accents, warm torchlit bevels.
Orthographic front-on view, centered, one asset only, transparent or flat removable background.
No text, letters, numbers, logos, faction emblems, recognizable crests, named characters, copied UI layouts, screenshots, icons, watermarks, or trademarks.
Canvas: [512x192 button / 768x512 panel].
Corners: large protected corner caps suitable for [28 32 28 32] slice insets.
Edges: trim should stretch or repeat cleanly; small accents must stay inside corner/border zones.
Center: quiet parchment, dark wood, or low-contrast stone fill readable behind warm cream text.
Return only the plate asset.
```

Revision notes: if it looks too close to a known game frame, remove heraldry and use simpler stone/wood/gold material cues; if center runes hurt readability, flatten the center and keep abstract geometry only on the border.

### `dark-gothic` button or panel

```text
Create one original dark-gothic 9-slice web UI surface plate.
Use generic materials: blackened iron, bone-colored trim, cracked leather, ember fissures, smoky umber/crimson glow.
Orthographic front-on view, centered, one asset only, transparent or flat removable background.
No text, letters, numbers, logos, faction emblems, skull-logo symbols, named characters, copied UI layouts, screenshots, icons, watermarks, or trademarks.
Canvas: [512x192 button / 768x512 panel].
Corners: iron and bone caps remain inside [30 34 30 34] slice insets; spikes must not cross slice boundaries.
Edges: bevels should stretch cleanly; repeated rivets/spikes need even cadence.
Center: quiet smoky black or dark leather center with enough contrast for pale amber text.
Return only the plate asset.
```

Revision notes: if it becomes an emblem instead of a surface, remove central symbols; if ember cracks create seams, confine cracks to corners or make them horizontal and repeatable.

### `sci-fi` button or panel

```text
Create one original sci-fi 9-slice web UI surface plate.
Use generic materials: brushed gunmetal, segmented plating, smoky glass, small bolt caps, cool cyan or green energy seams.
Orthographic front-on view, centered, one asset only, transparent or flat removable background.
No text, letters, serial numbers, logos, faction emblems, race/species marks, named characters, copied UI layouts, screenshots, icons, watermarks, or trademarks.
Canvas: [512x192 button / 768x512 panel].
Corners: hard-surface caps and bolts fit inside [24 30 24 30] slice insets.
Edges: panel seams align to horizontal/vertical strips and remain seamless under stretch or round repeat.
Center: quiet smoky blue-black glass or recessed metal readable behind cyan/ice text.
Return only the plate asset.
```

Revision notes: if linework breaks when stretched, simplify edge strips into longer continuous seams; if it resembles a known command-card frame, change the silhouette and bolt placement.

### Themed critique prompt

```text
Evaluate this as an original IP-safe game-UI-inspired 9-slice surface.
Score 0-5 for: style-family fit ([high-fantasy/dark-gothic/sci-fi]), IP safety, protected corners, edge seam/stretch behavior, center readability, contrast, and state-variant consistency.
Flag any logos, faction emblems, readable text/letters, copied UI layouts, trademarks, or recognizable protected motifs.
Recommend exact top/right/bottom/left insets and CSS repeat mode.
If it fails, provide a revised generic material-based prompt with no protected names or copied elements.
```
