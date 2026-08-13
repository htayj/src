# IP-safe game-UI style families for 9-slice surfaces

These families help describe late-1990s/early-2000s game UI *mood* without copying protected game assets. Use generic material language, invented motifs, and new layouts.

## IP-safety rules

Always avoid these in prompts, generated source plates, CSS demos, and manifests:

- logos, faction emblems, crests, species marks, or exact insignia;
- named characters, places, units, factions, or copyrighted lore terms;
- exact UI screenshots, copied menu layouts, copied icon shapes, or traced frames;
- trademarks, product names, readable labels, letters, watermarks, or glyphs that resemble a real mark.

Prefer: material, lighting, silhouette, era, craft, and mood descriptors.

## Family table

| Family key | Generic visual language | Slice guidance | Repeat mode | Text/background notes |
|---|---|---|---|---|
| `high-fantasy` | carved stone, aged wood, hammered gold, invented rune-like geometry, warm torch/candle glow, quiet parchment or dark wood center | use larger corner caps; keep gems/metal bosses fully inside corners; protect outer glow/shadow | `round` for repeating trim, `stretch` for smooth bevels | warm cream/gold text; dark brown or parchment center; avoid busy rune texture behind text |
| `dark-gothic` | blackened iron, bone/ivory trim, cracked leather, ember fissures, deep crimson/umber glow, quiet smoky center | put spikes, bone caps, and ember cracks inside border bands; make center almost flat | `stretch` for iron bevels, `round` only for repeating rivets/spikes | pale amber text; smoky black/red center; verify red glow does not reduce contrast |
| `sci-fi` | brushed gunmetal, segmented plating, smoky glass, cool cyan/green energy seams, bolts/corner caps, quiet blue-black center | align panel seams to slice edges; keep bolts/caps in corners; avoid diagonal perspective | `stretch` for glass/metal strips, `repeat`/`round` for bolt cadence | cyan/ice text; blue-black center; verify neon bloom does not obscure text |

## Per-family prompt ingredients

### `high-fantasy`

Use: broad beveled frame, carved stone chips, weathered wood center, hammered gold trim, abstract rune-like *geometric* accents, warm rim light.

Avoid: recognizable crests, faction-colored heraldry, readable runes, swords/shields that look like logos, copied game frame silhouettes.

Suggested insets: `28 32 28 32` for a 240×96 demo-like source; increase if corners include gems or thick shadow.

### `dark-gothic`

Use: black iron frame, bone-colored corner trim, cracked leather or smoky glass center, ember fissures, subtle spikes fully inside the border.

Avoid: skull logos, pentagrams, faction marks, readable occult letters, exact inventory/menu frames.

Suggested insets: `30 34 30 34`; use `--no-fill` if ember texture makes the center too noisy.

### `sci-fi`

Use: symmetrical hard-surface plating, recessed bolts, glowing energy seams, smoky transparent glass center, cool cyan/green highlights.

Avoid: recognizable race/faction silhouettes, specific unit badges, copied command-card shapes, readable serial text.

Suggested insets: `24 30 24 30`; align linework so seams meet cleanly after stretching.

## Local demo expectations

The helper can create deterministic, API-free demos for each family:

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

Expected checks:

- source SVG contains `data-demo-theme="high-fantasy"` or the selected theme key;
- manifest contains `"demoTheme": "high-fantasy"` and `styleFamily`;
- CSS/HTML/source/manifest artifacts exist;
- no forbidden logos, copied layouts, readable text, or trademarked terms appear in generated assets;
- browser screenshot passes seam, corner, contrast, and family-fit review.
