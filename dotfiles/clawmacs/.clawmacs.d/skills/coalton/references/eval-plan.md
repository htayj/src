# Coalton Skill Mini A/B Eval Plan

Capability delta under test:

> After applying this skill, the Clawmacs agent should more reliably design and build Coalton code and projects grounded in Coalton's real language/workflow, wider docs corpus, and canonical example projects, instead of drifting into generic typed-functional or generic Common Lisp advice.

## Baseline vs treatment

- **Baseline:** no Coalton-specific skill or only generic typed-FP guidance
- **Treatment:** current Coalton skill with build workflow, full-feature coverage, docs/example routing, operator quick routing, project-workflow translation, and interop/config/test/debug guidance

## Representative prompts

1. Set up a minimal Coalton project with ASDF and one module.
2. Should this file be `.lisp` with a readtable or `.ct`?
3. How should I model this domain with `define-type`, `define-struct`, or aliases?
4. I need to call a Common Lisp library from Coalton; what is the right interop pattern?
5. What does Coalton cover beyond `coalton-toplevel` and `define-type`?
6. How should I debug a confusing Coalton type error or generated code issue?
7. How do I add tests to a Coalton project?
8. When should I use `repr :native` or `repr :lisp`?
9. What is the practical difference between development and release mode?
10. Why is my Haskell-like partial application idea not fitting Coalton?
11. Which docs outside the whirlwind tour should I consult for naming, docs generation, iterators, or internals?
12. Which example project should I read first for parser combinators, type-system work, numerics/interop, or small pedagogical programs?
13. Which operator page should I consult first for `match`, `repr`, `rec`, `do`, `specialize`, or codegen inspection?
14. How do I translate the manual into an actual project workflow instead of just reading operator docs in isolation?

## Scoring rubric

Score each prompt 0–2 on each dimension.

### 1. Build orientation
- 0: abstract or generic advice only
- 1: partly actionable
- 2: clearly oriented toward building working Coalton code/projects

### 2. Coalton specificity
- 0: generic typed-FP or generic Lisp advice
- 1: partial Coalton specificity
- 2: names the right Coalton forms, files, and workflow pieces

### 3. Architecture fit
- 0: wrong model or wrong abstraction choice
- 1: partly reasonable
- 2: appropriate setup and language feature choice

### 4. Full-feature coverage
- 0: collapses Coalton to a tiny subset
- 1: vague mention of broader areas
- 2: can range across the real language/workflow surface

### 5. Docs corpus coverage
- 0: ignores most of `docs/`
- 1: partial mention of extra docs
- 2: routes appropriately across glossary/style/docs-generation/iterator/internals/manual-source docs

### 6. Example-project coverage
- 0: ignores the canonical examples from the README
- 1: vague mention of examples only
- 2: routes appropriately across `small-coalton-programs`, `thih`, `quil-coalton`, `fractal`, and testing examples

### 7. Operator-level routing
- 0: cannot route effectively through the operator docs
- 1: partial operator routing only
- 2: routes cleanly through the relevant operator pages

### 8. Project-workflow translation
- 0: leaves manual/operator knowledge stranded at the doc level
- 1: partial project-level translation
- 2: turns the docs into concrete project structure, interop, testing, and optimization decisions

### 9. Interop/config correctness
- 0: wrong or dangerous advice about interop or modes
- 1: partial caution only
- 2: correct guidance on Lisp interop, `repr`, and development/release concerns

### 10. Testing/debugging discipline
- 0: omits testing/debugging workflow
- 1: partial mention only
- 2: points to proper Coalton debugging/testing tools and structure

Maximum score per prompt: 20

## Keep/discard criterion

Keep the skill only if it improves average score on:
- build orientation
- Coalton specificity
- architecture fit
- full-feature coverage
- docs corpus coverage
- example-project coverage
- operator-level routing
- project-workflow translation
- interop/config correctness
- testing/debugging discipline
