# Implementation Plan

## Goal
Turn the current benchmark detector/runner into a local, generic UI feedback CLI that analyzes arbitrary screenshots with optional specs, reports objective UX/CV issues, and preserves no-leak benchmark validation.

## Tasks
1. **Define the public CLI, report contract, and spec schema before implementation**: Document the intended interface so implementation and validation stay stable.
   - File: `docs/ui-feedback-spec.md`
   - Changes: Add a concise schema/reference covering:
     - CLI shape:
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
     - Spec schema, single-image form:
       ```json
       {
         "version": 1,
         "id": "optional-case-id",
         "components": [
           {"id": "primary", "role": "button", "box": [x1, y1, x2, y2], "label": "optional"},
           {"id": "cards", "selector": {"role": "card", "region": [x1, y1, x2, y2]}}
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
     - Output JSON contract: `schema_version`, `image`, `components`, `checks`, `issues`, `summary`, `artifacts`, and per-check `used_fields`.
     - No-leak rule: generic analyzer ignores/flags `expected_*`, `expected_answer`, benchmark offsets, seam positions, declared colors, and manifest `regions` unless the user explicitly supplies component boxes in an external spec.
   - Acceptance: A future implementer can run the CLI examples and knows every supported check type, field, status, and output key.

2. **Create reusable geometry/image primitives**: Move duplicated box and pixel helpers into a shared module without changing benchmark behavior yet.
   - File: `scripts/ui_feedback_types.py`
   - Changes: Add dataclasses/types for `Box`, `DetectedComponent`, `CheckRequest`, `CheckResult`, `Issue`, and helper functions (`clamp_box`, `expand_box`, `union_box`, `box_wh`, centers, IoU, luminance/contrast ratio).
   - File: `scripts/image_region_detector.py`
   - Changes: Optionally import shared box helpers after tests exist; keep existing detector API `detect_regions(row, img, contract)` unchanged for compatibility.
   - Acceptance: `PYTHONPYCACHEPREFIX=/tmp/ui-feedback-pycache uv run python -m py_compile scripts/ui_feedback_types.py scripts/image_region_detector.py` passes, and current detector benchmark commands still pass before/after any refactor.

3. **Implement a generic screenshot component detector**: Add a detector that does not require benchmark badges and can still use labels/badges as optional hints when present.
   - File: `scripts/ui_feedback_detection.py`
   - Changes:
     - Add image-derived detection using Pillow only: estimate background from borders/large regions, build color/luminance/edge masks, connected-component boxes, merge nearby fragments, classify broad roles (`button`, `card`, `panel`, `icon_or_text`, `unknown`) by size/aspect/fill/border.
     - Support component sources in priority order: explicit spec boxes, selector-resolved detected components, optional visible label/badge hints, then unlabeled auto components.
     - Reuse or adapt `connected_components`, `surface_pixel`, `detect_badges`, and dense-surface refinement from `scripts/image_region_detector.py`, but keep badge/order logic as a hint path, not the default path.
     - Emit diagnostics with `used_fields` limited to `image_pixels`, spec component IDs/boxes/selectors, and generic thresholds.
   - File: `tests/test_ui_feedback_detection.py`
   - Changes: Add `unittest` tests for no-badge buttons/cards, explicit spec boxes, and badge-hint fallback.
   - Acceptance: On a no-badge generated image, detector returns sensible button/card boxes; on current synthetic images, it can resolve A/B/C targets when requested; tests pass with `uv run python -m unittest discover -s tests`.

4. **Implement objective check functions**: Add check implementations shared by the CLI and benchmark adapter.
   - File: `scripts/ui_feedback_checks.py`
   - Changes:
     - `alignment`: compare top/bottom/left/right/center edges across targets; report signed deltas and tolerance.
     - `spacing_consistency`: sort targets along `x`/`y`, compare adjacent gaps, report max gap delta.
     - `size_consistency`: compare width/height deltas across targets.
     - `padding_balance`: find content bbox inside target via inner contrast mask or explicit `content` box; compare left/right/top/bottom padding.
     - `content_centering`: find content/icon bbox or centroid inside target; report x/y offset and magnitude.
     - `texture_continuity`: migrate current periodic-continuity logic from `run_hybrid_cv_inspector.py` and return `needs_review` when no periodic signal is detected.
     - `contrast`: compute WCAG relative luminance ratios from explicit foreground/background boxes when provided, otherwise infer foreground text/icon pixels against local component fill; report `needs_review` if foreground inference is insufficient.
     - Compatibility-only checks needed for existing benchmarks: `visual_consistency`/`state_consistency` for hue/corner-shape comparison and `text_baseline` for text alignment.
   - File: `scripts/run_hybrid_cv_inspector.py`
   - Changes: After the new checks are covered by tests, optionally delegate duplicated measurement helpers (`texture_continuity_score`, centering, padding, size/alignment calculations) to `ui_feedback_checks.py`; preserve existing CLI behavior.
   - File: `tests/test_ui_feedback_checks.py`
   - Changes: Add tests with simple synthetic rectangles for pass/fail thresholds for every public check type.
   - Acceptance: Unit tests cover at least one pass and one fail for alignment, spacing, size, padding, centering, texture, and contrast; existing hybrid detector benchmark scores do not regress.

5. **Implement JSON/Markdown reporting and annotations**: Make analyzer outputs useful in a UI creation feedback loop.
   - File: `scripts/ui_feedback_reports.py`
   - Changes:
     - Write stable JSON reports with per-check metrics, thresholds, status (`pass`, `fail`, `warning`, `needs_review`, `error`), severity, evidence text, and `used_fields`.
     - Write Markdown summary with issue table, component table, detailed measurements, and suggested next actions (e.g. “move B top edge up 8px”, “increase text contrast from 2.9 to ≥4.5”).
     - Draw optional annotations using PIL: component boxes, check target labels, gap/offset arrows, contrast/padding highlights, and texture seam peak location when available.
   - File: `tests/test_ui_feedback_cli.py`
   - Changes: Include smoke tests that generate JSON, Markdown, and annotation PNG for a tiny fixture.
   - Acceptance: Output files are created, JSON is parseable, Markdown includes summary/issues, and annotation image dimensions match the input screenshot.

6. **Build the general CLI entrypoint**: Expose arbitrary screenshot analysis independent of benchmark manifests.
   - File: `scripts/ui_feedback_analyzer.py`
   - Changes:
     - Parse the CLI from Task 1.
     - Load one or more `--image` values; for multiple images require `--out-json` as JSONL or a JSON array and use `--annotations-dir`.
     - Load optional spec, validate it manually with clear errors, and reject/ignore truth-like fields (`expected_*`, `expected_answer`) with input warnings.
     - Run detection, resolve check requests from explicit `checks` plus `auto_checks`, run checks, write reports/annotations, and set exit status according to `--fail-on`.
   - File: `pyproject.toml`
   - Changes: Prefer no new dependencies. If packaging is desired, add a script entry point only after module imports are made package-safe; otherwise keep direct `uv run python scripts/ui_feedback_analyzer.py ...` usage.
   - Acceptance: Running the CLI on `data/comprehensive_images/comp_align_top_bad_12_down.png` without a spec produces a report instead of crashing; running it with a small spec produces targeted check results.

7. **Add a benchmark adapter that validates the new engine without leaking truth fields**: Score the generic analyzer on existing manifests while keeping benchmark-specific logic out of the CLI.
   - File: `scripts/run_ui_feedback_benchmark.py`
   - Changes:
     - Read manifest JSONL rows and image pixels.
     - Convert allowed `measurement.type` and generic tolerance fields into `CheckRequest`s:
       - `top_edge_alignment` → `alignment(edge="top", targets=["A","B"])`
       - `component_size` → `size_consistency(targets=["A","B"])`
       - `horizontal_gap_consistency` → `spacing_consistency(axis="x", targets=["A","B","C"])`
       - `texture_seam` → `texture_continuity(target="C")`
       - `icon_centering` → `content_centering(target="A"/button)`
       - `state_consistency` → `visual_consistency(targets=["A","B"], hue/radius tolerances only)`
       - `text_baseline` → `text_baseline(targets=["A","B"], tolerance only)`
       - `padding_symmetry` → `padding_balance(target="A"/card)`
     - Do not pass manifest `regions`, `expected_answer`, `expected_*`, `target`, `icon`, seam axis/position, offsets, dimensions, declared colors, or declared radii into the analyzer in detector mode.
     - Emit runner-compatible JSONL (`case_id`, `response`, `pred_answer`, `correct`, `hybrid_measurements`/`ui_feedback_measurements`) so `scripts/score_vlm_results.py` can score it.
   - File: `scripts/score_vlm_results.py`
   - Changes: No functional change expected; only add support for displaying `ui_feedback_measurements` if useful in Markdown misses.
   - Acceptance: `uv run python scripts/run_ui_feedback_benchmark.py --manifest data/comprehensive_manifest.jsonl --out results/ui-feedback-comprehensive.jsonl --fail-on-mismatch` and the same command for `data/variant_manifest.jsonl` run successfully.

8. **Add a no-leak checker for the generic path**: Verify poisoned benchmark truth does not affect predictions.
   - File: `scripts/check_ui_feedback_no_leak.py`
   - Changes:
     - Reuse the poisoning strategy from `scripts/check_hybrid_no_leak.py`.
     - Compare predictions and key measurements before/after poisoning.
     - Assert `used_fields` never contains disallowed fields (`regions` in detector validation, `expected_*`, `target`, `icon`, measurement offsets/dimensions/seam/color/radius truth fields).
   - File: `scripts/check_hybrid_no_leak.py`
   - Changes: Optionally share the disallowed-field constants with the new checker to avoid drift.
   - Acceptance: `uv run python scripts/check_ui_feedback_no_leak.py --manifest data/comprehensive_manifest.jsonl --manifest data/variant_manifest.jsonl` passes.

9. **Generate and validate a fresh no-badge local sample**: Prove the tool is not only a synthetic badge benchmark detector.
   - File: `scripts/generate_ui_feedback_sample.py`
   - Changes:
     - Generate `data/local_feedback_sample/feedback_ok.png` and `data/local_feedback_sample/feedback_issues.png` with no A/B/C badges.
     - Include a spec file `data/local_feedback_sample/feedback_spec.json` covering all public checks, with component boxes/selectors but no expected answers/truth offsets.
     - Include both clean and intentionally flawed UI elements: misaligned buttons, inconsistent card spacing, size mismatch, unbalanced padding, off-center icon/content, visible texture seam, and low contrast text.
   - New data output: `data/local_feedback_sample/` generated images/spec.
   - Acceptance: The CLI finds issues on `feedback_issues.png`, reports no/high-priority issues on `feedback_ok.png`, and the detector can produce useful auto components on at least one no-spec run.

10. **Add targeted unit and smoke tests**: Keep behavior reproducible without requiring GPU/VLM models.
    - File: `tests/test_ui_feedback_detection.py`
    - File: `tests/test_ui_feedback_checks.py`
    - File: `tests/test_ui_feedback_cli.py`
    - Changes: Use `unittest`, temporary directories, and Pillow-generated images; avoid pytest unless added explicitly to `pyproject.toml`.
    - Acceptance: `uv run python -m unittest discover -s tests` passes locally.

11. **Run full validation and create result artifacts**: Validate both old benchmark behavior and new general behavior.
    - File: `results/ui-feedback-tool-report.md`
    - Changes: Summarize CLI, no-leak boundary, commands run, benchmark scores, fresh sample findings, and limitations.
    - Validation commands:
      ```bash
      PYTHONPYCACHEPREFIX=/tmp/ui-feedback-pycache uv run python -m py_compile \
        scripts/ui_feedback_types.py \
        scripts/ui_feedback_detection.py \
        scripts/ui_feedback_checks.py \
        scripts/ui_feedback_reports.py \
        scripts/ui_feedback_analyzer.py \
        scripts/run_ui_feedback_benchmark.py \
        scripts/check_ui_feedback_no_leak.py \
        scripts/generate_ui_feedback_sample.py

      uv run python -m unittest discover -s tests
      uv run python scripts/generate_ui_feedback_sample.py
      uv run python scripts/ui_feedback_analyzer.py \
        --image data/local_feedback_sample/feedback_issues.png \
        --spec data/local_feedback_sample/feedback_spec.json \
        --out-json results/local-feedback-issues.json \
        --out-md results/local-feedback-issues.md \
        --annotate results/local-feedback-issues-annotated.png \
        --fail-on never
      uv run python scripts/ui_feedback_analyzer.py \
        --image data/local_feedback_sample/feedback_issues.png \
        --out-json results/local-feedback-auto.json \
        --out-md results/local-feedback-auto.md \
        --annotate results/local-feedback-auto-annotated.png \
        --fail-on never
      uv run python scripts/run_ui_feedback_benchmark.py \
        --manifest data/comprehensive_manifest.jsonl \
        --out results/ui-feedback-comprehensive.jsonl \
        --fail-on-mismatch
      uv run python scripts/run_ui_feedback_benchmark.py \
        --manifest data/variant_manifest.jsonl \
        --out results/ui-feedback-variant.jsonl \
        --fail-on-mismatch
      uv run python scripts/check_ui_feedback_no_leak.py \
        --manifest data/comprehensive_manifest.jsonl \
        --manifest data/variant_manifest.jsonl
      uv run python scripts/score_vlm_results.py \
        --manifest data/comprehensive_manifest.jsonl \
        --inputs results/ui-feedback-comprehensive.jsonl \
        --out-json results/ui-feedback-comprehensive-summary.json \
        --out-md results/ui-feedback-comprehensive-summary.md \
        --fail-on-coverage-errors
      uv run python scripts/score_vlm_results.py \
        --manifest data/variant_manifest.jsonl \
        --inputs results/ui-feedback-variant.jsonl \
        --out-json results/ui-feedback-variant-summary.json \
        --out-md results/ui-feedback-variant-summary.md \
        --fail-on-coverage-errors
      ```
    - Acceptance: All commands pass; reports and annotations exist; current comprehensive and variant synthetic scores remain 36/36 and 16/16 respectively for answer and offset-aware scoring, or any shortfall is documented with concrete detector failures and fixed before handoff.

12. **Iterate only against explicit criteria**: Avoid overfitting while improving failures.
    - File: `results/ui-feedback-tool-report.md`
    - Changes: Add an iteration log if changes are needed after validation.
    - Criteria:
      - Must pass unit tests and py_compile.
      - Must preserve no-leak invariance under poisoned manifests.
      - Must keep existing synthetic benchmark headline scores at 100% in detector validation.
      - Must show at least one successful no-badge/no-spec arbitrary screenshot analysis and one spec-targeted analysis.
      - Must not rely on manifest `regions` or expected/truth fields for detector-mode benchmark predictions.
      - Must keep old `scripts/run_hybrid_cv_inspector.py` CLI usable unless intentionally superseded and documented.
    - Acceptance: Stop when all criteria pass; do not commit or push.

## Files to Modify
- `scripts/image_region_detector.py` - keep existing API, optionally share box/connected-component helpers with the new detector, and ensure badge logic is an optional hint path rather than the only general path.
- `scripts/run_hybrid_cv_inspector.py` - optionally delegate duplicated CV measurement code to shared checks after tests pass; preserve existing benchmark runner behavior.
- `scripts/check_hybrid_no_leak.py` - optionally share poison/disallowed-field constants with the new generic no-leak checker.
- `scripts/score_vlm_results.py` - optional display-only support for `ui_feedback_measurements` in reports.
- `pyproject.toml` - avoid dependency changes unless a script entry point or explicit test dependency is chosen.

## New Files
- `docs/ui-feedback-spec.md` - CLI, spec schema, output schema, and no-leak contract.
- `scripts/ui_feedback_types.py` - shared dataclasses, box utilities, luminance/contrast helpers.
- `scripts/ui_feedback_detection.py` - generic no-badge component detection plus optional spec/badge hint resolution.
- `scripts/ui_feedback_checks.py` - objective UX/CV check implementations.
- `scripts/ui_feedback_reports.py` - JSON/Markdown report and PIL annotation writers.
- `scripts/ui_feedback_analyzer.py` - general-purpose local screenshot analysis CLI.
- `scripts/run_ui_feedback_benchmark.py` - manifest-to-generic-check validation adapter that avoids truth-field leakage.
- `scripts/check_ui_feedback_no_leak.py` - poisoned-manifest invariant checker for the generic analyzer path.
- `scripts/generate_ui_feedback_sample.py` - fresh no-badge generated sample for local feedback-loop validation.
- `tests/test_ui_feedback_detection.py` - detector unit tests.
- `tests/test_ui_feedback_checks.py` - check metric unit tests.
- `tests/test_ui_feedback_cli.py` - CLI/report/annotation smoke tests.
- `results/ui-feedback-tool-report.md` - final validation/report artifact.
- `data/local_feedback_sample/` - generated fresh sample images/spec.

## Dependencies
- Task 1 must precede implementation so the CLI/spec/report contract is stable.
- Task 2 should precede Tasks 3-5 because detection, checks, reports, and annotations share box/math types.
- Task 3 must precede the CLI, benchmark adapter, and most integration tests.
- Task 4 depends on Tasks 2-3 for target resolution and metrics.
- Task 5 depends on Task 4 for check result structures.
- Task 6 depends on Tasks 3-5.
- Task 7 depends on Tasks 3-6 and existing manifest knowledge.
- Task 8 depends on Task 7 to compare generic benchmark predictions.
- Task 9 depends on Tasks 3-6 for meaningful sample validation.
- Task 10 can start after Tasks 2-4 but should expand as Tasks 5-6 land.
- Task 11 depends on all implementation tasks.
- Task 12 is the bounded iteration loop after validation failures.

## Risks
- Generic component detection is heuristic and may miss real-world screenshots with photos, gradients, heavy shadows, overlapping elements, or unusual themes; reports should use `needs_review` instead of false precision when evidence is weak.
- Existing synthetic benchmark success may still need badge/label hints because the questions target A/B/C objects; this is acceptable only if the general CLI also works on no-badge samples and explicit specs.
- Contrast without OCR is approximate; implement median/foreground-mask evidence and allow explicit foreground/background boxes in the spec for reliable results.
- Texture continuity logic is strongest for periodic patterns; non-periodic textures should not be over-classified as seams.
- Refactoring current benchmark code could regress known 36/36 and 16/16 results; keep compatibility tests/commands around every refactor.
- No Oracle consultation is necessary for this plan because the repository already contains the needed detector/check patterns and validation data. If later design review is wanted, ask Oracle: “For a local Pillow-only UI screenshot analyzer, what robust heuristic component-detection and objective UX-check strategies avoid benchmark leakage while supporting optional user-supplied boxes?”
