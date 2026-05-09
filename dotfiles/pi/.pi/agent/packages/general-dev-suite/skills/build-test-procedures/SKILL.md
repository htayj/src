---
name: build-test-procedures
description: Use when building, compiling, generating code, running tests, starting dev services, or verifying changes in any software repository. Provides a generic procedure for discovering and following project-specific commands.
---
# Build and Test Procedures

Always prefer repository-defined commands over invented ones.

## Discovery order
1. Read project instructions (`AGENTS.md`, `CLAUDE.md`, README, CONTRIBUTING, docs/dev*).
2. Inspect task runners and manifests: `package.json`, `pnpm-workspace.yaml`, `turbo.json`, `Makefile`, `justfile`, `pyproject.toml`, `Cargo.toml`, `go.mod`, CI config.
3. Identify package/workspace boundaries and changed files.
4. Choose the smallest reliable command for generation, typecheck/build, tests, lint, and formatting.

## Required verification before handoff
- Build/typecheck/codegen for touched code.
- Targeted tests for behavior changes.
- Lint/format if the repo has a standard gate.
- Note any skipped gate and why it truly does not apply.

## Running services
Use documented dev scripts. Prefer existing health checks and API clients over ad-hoc curls. Do not kill processes unless you have identified the owner and a stale process is blocking work.
