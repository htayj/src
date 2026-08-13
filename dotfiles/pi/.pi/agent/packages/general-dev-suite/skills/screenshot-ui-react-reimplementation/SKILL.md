---
name: screenshot-ui-react-reimplementation
description: Use when asked to analyze a webpage screenshot or screenshot URL, break visible UI into components/design tokens, and reimplement it as React/TypeScript components with validation screenshots or a visual fidelity report.
---

# Screenshot UI → React Reimplementation

Use this skill when the task is to recreate a webpage UI from a screenshot, especially when the output should be maintainable React components rather than a single image clone. The primary goal is reference fidelity: make the result look like the screenshot, not merely better, cleaner, or more attractive.

## Workflow

1. **Capture and freeze the input**
   - Save the screenshot locally.
   - Record source URL/path, native dimensions, canonical viewport, and artifact paths.
   - If the user did not provide a test, define an objective-enough contract and sanity-check it briefly.

2. **Inventory visible UI before coding**
   - Describe page-level layout and regions from top-to-bottom, left-to-right.
   - Record visible text, repeated elements, icons/images, colors, typography, spacing, borders, radii, shadows, and uncertain details.
   - Produce `component-breakdown.md` and `design-tokens.json`.

3. **Derive a component hierarchy**
   - Name semantic components from the visible design: page shell, header, nav, hero, panels, cards, lists, controls, badges, rows, footer, etc.
   - Prefer mapped data arrays for repeated rows/tabs/cards.
   - Document where placeholders are used for non-extractable assets.

4. **Recreate textures and ornate borders when needed**
   - Use CSS-only gradients/borders for simple surfaces.
   - Use cropped texture patches for paper, stone, metal, cloth, noise, or grain.
   - Use 9-slice/9-patch `border-image` crops for ornate scalable frames, panels, buttons, and cards.
   - Record crop source coordinates or sampled regions when practical.
   - Consider ComfyUI segmentation only as an optional mask/isolation aid for irregular ornaments; manual rectangular crops are usually better for 9-slice borders.
   - See `references/texture-and-9slice-workflow.md`.

5. **Implement React**
   - Use stateless React/TypeScript components where possible.
   - Use CSS variables/design tokens.
   - Preserve legible text and major layout geometry.
   - Use semantic HTML and accessible labels for controls.
   - Do not embed the target screenshot as the implementation.
   - Avoid external network assets unless explicitly allowed.

6. **Validate and critique with vision when fidelity matters**
   - Render at the canonical viewport, ideally with Playwright.
   - Save candidate screenshot and comparison artifacts.
   - Attach both reference and candidate images to a vision-capable model or subagent; remote models cannot see local files unless attached/uploaded.
   - Ask targeted comparison questions and request a score plus prioritized CSS/React fixes.
   - Apply the smallest high-impact fixes that make the candidate closer to the reference, rebuild, recapture, and repeat while the critique is actionable.
   - Revert changes that improve generic UX but make the candidate less like the reference.
   - Score layout, visual style, content coverage, component decomposition, and implementation quality.
   - Report known mismatches and whether qualitative blockers remain.

## Default rubric

If the user does not provide a rubric, use:

- 35% layout similarity, minimum 0.75
- 25% visual style similarity, minimum 0.70
- 20% content/semantic coverage, minimum 0.70
- 10% component decomposition quality, minimum 0.75
- 10% implementation quality, minimum 0.80
- Overall pass: >= 0.74 with no qualitative blockers

Default tradeoff: 60% visual fidelity / 40% reusable component architecture.

## References

- `references/visual-analysis-rubric.md`
- `references/react-reimplementation-checklist.md`
- `references/texture-and-9slice-workflow.md`
- `references/vision-critique-loop.md`

## Output checklist

- [ ] Source screenshot archived
- [ ] Contract/rubric documented
- [ ] Component breakdown written
- [ ] Design tokens written
- [ ] React/CSS implementation exists
- [ ] Texture/border strategy documented when ornate/textured UI is present
- [ ] Validation report includes commands, artifacts, scores, blockers, pass/fail
- [ ] If visual fidelity is important, reference and candidate screenshots were compared by a vision-capable reviewer or a documented fallback was used
- [ ] Reusable lessons added back to this skill or references
