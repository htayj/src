---
name: vite-vitest-tooling
description: Use when configuring Vite, Vitest, TS path aliases, frontend dev server/build, test environments, coverage, monorepos, library builds, plugin setup, or fast TypeScript project tooling.
---
# Vite/Vitest Tooling

Use this skill for build and fast test tooling in TypeScript projects. It complements `biome-code-quality` for lint/format and `testing-library-playwright-testing` for test design.

## Local references

```bash
rg '<term>' ~/reference/external_docs/vite/docs ~/reference/external_docs/vitest/docs ~/reference/external_src/github.com/vitejs/vite ~/reference/external_src/github.com/vitest-dev/vitest
```

## Rules

- Vite owns frontend dev/build configuration.
- Vitest owns fast unit/integration tests for TS, React, Effect services, and utilities.
- Type-check separately with `tsc --noEmit` or an explicit typecheck command; do not assume transform-time TS equals type safety.
- Keep path aliases consistent across `tsconfig`, Vite, Vitest, editor tooling, and test runners.
- Separate environments: `node` for domain/Effect/backend, browser/jsdom-like for React components.
- Prefer small explicit config files over framework magic.
- Keep CI stages separate: format, lint, typecheck, unit/integration, e2e, build.
- Avoid slow global setup unless necessary; isolate tests and use test Layers/mocks.
- Keep coverage meaningful; do not chase coverage by testing implementation trivia.

## Debug flow

1. Reproduce with the smallest script/test.
2. Check Vite/Vitest docs/source locally.
3. Verify path aliases and environment.
4. Run typecheck separately.
5. Only then adjust plugins/transforms.
