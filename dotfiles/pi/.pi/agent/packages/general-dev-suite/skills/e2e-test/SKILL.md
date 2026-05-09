---
name: e2e-test
description: Use when creating or running browser/end-to-end tests. Emphasizes stable selectors, page objects/helpers, artifacts, and focused iteration.
---
# E2E Testing

1. Detect framework and dev-server command.
2. Reuse existing fixtures, auth setup, page objects, and selector conventions.
3. Prefer `data-testid` or accessibility roles/names over brittle CSS/XPath.
4. Keep tests focused on user flows and observable outcomes.
5. Run a single spec or test filter while iterating; expand only after it passes.
6. Save screenshots/video/traces for failures or MR descriptions when helpful.
