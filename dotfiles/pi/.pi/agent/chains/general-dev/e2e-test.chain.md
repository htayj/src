---
name: general-dev-e2e-test
description: "Plan and create/run browser E2E tests for a feature or flow."
---

## scout
output: e2e-context.md
outputMode: file-only
skills: e2e-test, frontend-design, build-test-procedures

Gather E2E context for:

{task}

Find the E2E framework, dev-server command, auth fixtures, selector conventions, page objects, and relevant UI files. Do not edit files.

## e2e-tester
output: e2e-test-report.md
outputMode: inline
reads: e2e-context.md
skills: e2e-test, e2e-tester, frontend-design

Create or run the E2E test coverage for:

{task}

Use the context from {previous}. You may add/update E2E tests and non-logic selectors if needed. Report feature bugs instead of changing product behavior.
