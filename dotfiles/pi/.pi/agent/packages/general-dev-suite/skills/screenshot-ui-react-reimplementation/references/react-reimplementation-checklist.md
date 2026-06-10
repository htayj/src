# React Reimplementation Checklist

## Before coding

- [ ] Save the screenshot locally.
- [ ] Record native dimensions and canonical viewport.
- [ ] Inventory all major regions and visible text.
- [ ] Create component hierarchy.
- [ ] Extract colors, typography, spacing, radii, shadows, and layout tokens.
- [ ] Mark uncertain details instead of hallucinating.

## Component design

- [ ] Use named semantic components (`Page`, `Header`, `Nav`, `Card`, `List`, `Row`, `Badge`, etc.).
- [ ] Use arrays/maps for repeated rows, tabs, badges, cards, or list items.
- [ ] Keep decorative layers separate from information-bearing components.
- [ ] Prefer CSS variables for tokens.
- [ ] Preserve visible text where legible.
- [ ] Provide `aria-label` or readable text for icon-only controls.

## Visual implementation

- [ ] Match viewport and major proportions first.
- [ ] Match background, main surfaces, and accent colors.
- [ ] Approximate complex images/icons with CSS/vector placeholders if extraction is not allowed.
- [ ] For textured/ornate components, choose CSS-only, texture patch, or 9-slice border-image and document why.
- [ ] Use cropped local assets for scalable frames/panels/buttons when CSS gradients are not enough.
- [ ] Separate background texture from content-derived structure: table row lines, list dividers, column separators, and icon slots should be drawn by CSS/DOM to match the content, not baked into a pane texture.
- [ ] Ensure 9-slice corners do not distort when the component scales.
- [ ] Avoid one giant absolute-position layout unless recreating a static poster is explicitly requested.
- [ ] Do not use the target screenshot as the page content.

## Validation

- [ ] Build/typecheck or document why dependency install was skipped.
- [ ] Render at canonical viewport.
- [ ] Save candidate screenshot.
- [ ] Score against the rubric.
- [ ] Document known mismatches and next steps.
