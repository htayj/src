---
name: biome-code-quality
description: Use when configuring or running Biome formatting, linting, import organization, safe/unsafe fixes, style enforcement, CI code-quality checks, or agent guardrails for TypeScript/JavaScript/JSON/CSS projects.
---
# Biome Code Quality

Use this skill for formatting and linting in the functional TypeScript stack. It is subordinate to correctness and architecture, but it should make style consistent and automatic.

## Local references

```bash
rg '<term>' ~/reference/external_docs/biome ~/reference/external_src/github.com/biomejs/biome ~/reference/external_src/github.com/biomejs/website
```

## Rules

- Biome is the default formatter/linter when present or when starting this stack from scratch.
- Do not bikeshed formatter output; accept it unless it breaks code.
- Run format/lint before handoff when project scripts exist.
- Prefer safe autofixes; review unsafe fixes manually.
- Lint suppressions require a reason and should be as narrow as possible.
- Keep rules aligned with strict TypeScript and functional architecture.
- Do not use formatting changes to hide functional changes; separate large reformatting from behavior changes when possible.
- CI should fail on formatting/lint/typecheck/test separately.

## Agent workflow

1. Discover project scripts/config.
2. Run the narrowest relevant format/lint command.
3. Apply safe fixes.
4. Re-run typecheck/tests if fixes touched code.
5. Report any intentionally ignored lint warnings.
