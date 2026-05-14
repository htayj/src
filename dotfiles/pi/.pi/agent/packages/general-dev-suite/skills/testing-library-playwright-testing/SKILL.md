---
name: testing-library-playwright-testing
description: Use when writing or reviewing React Testing Library tests, DOM/user-event tests, Vitest component tests, Playwright E2E tests, accessibility-oriented selectors, browser flows, fixtures, mocks, or test strategy for TS/React apps.
---
# Testing Library and Playwright Testing

Use this skill for behavior-focused tests. It complements `vite-vitest-tooling` for config and `react-stateless-components` for testable UI design.

## Local references

```bash
rg '<term>' ~/reference/external_docs/testing-library ~/reference/external_docs/playwright ~/reference/external_src/github.com/testing-library ~/reference/external_src/github.com/microsoft/playwright
```

## Rules

- Test behavior, not implementation details.
- Prefer accessible queries: role, label, text, placeholder, alt text.
- Use React Testing Library for component behavior.
- Use Vitest for pure/domain/Effect service tests.
- Use Playwright for full browser journeys, routing, auth, browser APIs, and critical integrations.
- Keep E2E tests few, high-value, and stable.
- Do not mock what the test is meant to verify.
- Use `userEvent`-style interactions over firing implementation events by hand.
- Assert visible user outcomes and accessible state.
- Avoid testing hook internals unless the hook is itself the public unit.

## Test pyramid

1. Typecheck everything.
2. Unit-test pure TypeScript/domain functions.
3. Test Effect services with test Layers.
4. Component-test user-observable React behavior.
5. E2E-test critical flows only.

## Playwright rules

- Prefer locators by role/name/test-visible semantics.
- Avoid sleeps; wait for user-observable state.
- Keep fixtures explicit and deterministic.
- Capture traces/screenshots for failures when useful.
