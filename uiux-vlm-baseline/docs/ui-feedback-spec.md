# UI Feedback Analyzer CLI and Spec

This tool analyzes local UI screenshots with deterministic image/CV checks. It is intended for a UI creation feedback loop: generate or edit a UI, save a screenshot, run checks, fix objective visual issues, repeat.

## CLI

```bash
uv run python scripts/ui_feedback_analyzer.py \
  --image path/to/screenshot.png \
  [--spec path/to/spec.json] \
  [--checks all|alignment,spacing,size,padding,centering,texture,contrast] \
  [--out-json results/ui-feedback.json] \
  [--out-md results/ui-feedback.md] \
  [--annotate results/ui-feedback-annotated.png] \
  [--annotations-dir results/annotations] \
  [--fail-on fail|warning|error|never] \
  [--debug-components]
```

Multiple `--image` values are supported. When multiple images are used, `--out-json` stores a JSON array and `--annotations-dir` is preferred over `--annotate`.

## Spec schema

```json
{
  "version": 1,
  "id": "optional-case-id",
  "components": [
    {"id": "primary", "role": "button", "box": [100, 80, 260, 132], "label": "Save"},
    {"id": "cards", "selector": {"role": "card", "region": [40, 200, 900, 520]}}
  ],
  "checks": [
    {"id": "top-align", "type": "alignment", "targets": ["primary", "secondary"], "edge": "top", "tolerance_px": 3},
    {"id": "gap-consistency", "type": "spacing_consistency", "targets": ["card1", "card2", "card3"], "axis": "x", "tolerance_px": 8},
    {"id": "size-match", "type": "size_consistency", "targets": ["primary", "secondary"], "dimensions": ["width", "height"], "tolerance_px": 6},
    {"id": "padding", "type": "padding_balance", "target": "panel", "content": "auto", "tolerance_px": 8},
    {"id": "icon-center", "type": "content_centering", "target": "icon_button", "content": "auto", "tolerance_px": 6},
    {"id": "tiling", "type": "texture_continuity", "target": "hero", "threshold": 8.0},
    {"id": "contrast", "type": "contrast", "target": "primary", "min_ratio": 4.5}
  ],
  "auto_checks": {"enabled": true, "types": ["contrast", "alignment", "spacing"], "tolerance_px": 6}
}
```

### Components

Components can be explicit boxes or selectors resolved against detected components.

- `id`: stable component id used by checks.
- `role`: optional semantic hint (`button`, `card`, `panel`, `text`, `icon`, `unknown`).
- `box`: `[x1, y1, x2, y2]` in screenshot pixels.
- `selector`: currently supports `role` and optional `region`; the first matching detected component is used unless a selector id expands into multiple auto ids.

### Checks

Supported check types:

- `alignment`: compare `top`, `bottom`, `left`, `right`, `center_x`, or `center_y` across targets.
- `spacing_consistency`: compare adjacent horizontal/vertical gaps after sorting targets.
- `size_consistency`: compare width and/or height across targets.
- `padding_balance`: compare left/right/top/bottom padding between a target and content bbox.
- `content_centering`: compare target center and detected/explicit content center.
- `texture_continuity`: detect periodic texture seams without a generator template.
- `contrast`: estimate WCAG contrast from foreground pixels vs local background.
- Compatibility checks used by benchmark adapter: `visual_consistency`, `text_baseline`.

## Output JSON contract

```json
{
  "schema_version": 1,
  "image": "path/to/screenshot.png",
  "spec_id": "optional-case-id",
  "components": [{"id": "primary", "role": "button", "box": [100, 80, 260, 132], "source": "spec"}],
  "checks": [{"id": "top-align", "type": "alignment", "status": "pass", "metrics": {}, "used_fields": []}],
  "issues": [{"check_id": "top-align", "severity": "fail", "message": "...", "suggestion": "..."}],
  "summary": {"pass": 4, "fail": 1, "warning": 0, "needs_review": 1, "error": 0},
  "artifacts": {"markdown": "...", "annotation": "..."}
}
```

Statuses are `pass`, `fail`, `warning`, `needs_review`, or `error`.

## No-leak rule

The generic analyzer ignores or warns on truth-like fields such as `expected_answer`, `expected_*`, benchmark offsets, seam positions, declared colors, and manifest `regions`. User-supplied component boxes in an external spec are allowed because they are localization inputs, not answer labels.
