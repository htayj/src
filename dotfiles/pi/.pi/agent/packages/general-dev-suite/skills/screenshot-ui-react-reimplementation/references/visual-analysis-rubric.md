# Visual Analysis Rubric

Use this rubric to turn a screenshot recreation task into objective-enough validation.

## Required artifacts

- `target.png` or source screenshot path/URL
- `component-breakdown.md`
- `design-tokens.json`
- candidate rendered screenshot when browser/dependencies are available; otherwise a documented static/manual fallback report
- comparison report or fallback validation report

## Scoring

| Category | Weight | Pass threshold | What to inspect |
| --- | ---: | ---: | --- |
| Layout similarity | 35% | 0.75 | viewport, region positions, size ratios, alignment, spacing rhythm |
| Visual style similarity | 25% | 0.70 | palette, contrast, typography scale, shadows, borders, radii, textures |
| Content/semantic coverage | 20% | 0.70 | legible text, controls, icons, lists, images, hierarchy |
| Component decomposition | 10% | 0.75 | semantic reusable components, repeated data, clear boundaries |
| Implementation quality | 10% | 0.80 | builds/renders, maintainable CSS, tokens, accessibility, no screenshot-as-body |

Overall pass: weighted score >= 0.74 and no qualitative blockers.

## Qualitative blockers

- Main layout direction is wrong.
- Primary visible UI region is missing.
- Candidate cannot render.
- Screenshot comparison cannot be generated and no fallback report exists.
- Major visible text is missing unless unreadable in source.
- Colors or spacing are unrelated to the screenshot.
- Implementation is just the screenshot image instead of components.

## Suggested report fields

- source dimensions and candidate dimensions
- commands run
- screenshot artifact paths
- category scores and weighted total
- qualitative blockers
- known mismatches
- next improvements
