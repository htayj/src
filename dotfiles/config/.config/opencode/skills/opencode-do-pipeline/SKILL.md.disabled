---
name: opencode-do-pipeline
description: Run OpenCode /do and /pdo prompt-level coding pipelines with staged planning, implementation, verification, review, and explicit commit/push gates.
compatibility: opencode
metadata:
  workflow: do-pdo
---

# OpenCode /do and /pdo pipeline

This is a prompt-level adaptation of the Claude/Pi `do` pipeline. It is not a
persistent task-graph engine. Keep the main `do-orchestrator` session in control,
use OpenCode `todoread`/`todowrite` only as an in-session checklist, and never
read, write, or mutate `TODO.org` or `DONE.org`.

## Modes

- `/do`: run the requested work through the staged implementation pipeline. If the
  task is empty, ask what to do and stop. If planning finds an open product,
  architecture, security, data-migration, or compatibility decision, ask before
  implementation.
- `/pdo`: plan first, identify every non-obvious open decision, recommend a
  default for each, then settle those decisions with the user before any file
  edits. Ask one decision at a time. If a decision can be answered by inspecting
  the codebase, inspect instead of asking.

## Stage chain

Run stages in order, emitting one concise status line after each non-skipped stage.
Skip only with an explicit reason.

1. **PLAN** — inspect project instructions and relevant code, choose the smallest
   safe approach, identify validation commands, risks, and open decisions.
2. **IMPLEMENT** — delegate scoped edits to `do-implementer`. Use TDD for
   behavior changes: failing focused test, minimal code, green focused test.
3. **COMPILE/typecheck** — delegate to `do-verifier` to run the smallest reliable
   build, compile, codegen, or typecheck gate for touched code.
4. **UNIT_TEST** — delegate focused unit/component tests to `do-verifier`.
5. **PERF_TEST** — run only when performance-sensitive code changed or the user
   requested performance evidence.
6. **CODE_REVIEW** — delegate independent read-only review to `do-reviewer`.
7. **RESTART** — run only when integration/API/E2E testing needs a restarted
   local service. Prefer documented dev scripts and health checks.
8. **API_TEST** — run only when backend/API behavior changed.
9. **E2E_TEST** — run only when frontend/user-flow behavior changed.
10. **UX_REVIEW** — run only when UI, copy, accessibility, responsive layout, or
    screenshot evidence changed; delegate to `do-ux-reviewer`.
11. **SPEC_UPDATE** — update docs/specs/contracts only when behavior or public
    interfaces changed and the repo convention calls for it.
12. **LINT** — run the narrowest repo-standard lint/format/static check.
13. **COMMIT** — only if the user explicitly approved committing in this run.
14. **PUSH** — only if the user explicitly approved pushing in this run.

## Delegation contract

- Use hidden `do-*` agents for child work: `do-implementer`, `do-verifier`,
  `do-reviewer`, and `do-ux-reviewer`.
- Pass each child a bounded stage prompt with task text, relevant plan decisions,
  changed-file scope, expected validation, and safety constraints.
- For `do-reviewer` and `do-ux-reviewer`, include the current diff/stat excerpts
  and artifact paths in the prompt; these read-only reviewers have shell disabled
  and must not discover git diffs by running shell commands.
- Subagents return `PASS`, `FAIL`, `SKIP`, or `NEEDS_INPUT` plus changed files,
  commands/results, artifacts, and blockers.
- The orchestrator decides the next stage; subagents must not commit, push,
  force-push, reset hard, or broaden scope.

## Failure routing

Classify failures as `environment`, `code`, `review`, `test`, `lint`, `operator`,
or `unknown`.

- Environment failures: retry the same stage up to 2 times after the smallest safe
  environment fix or wait. If still failing, stop with `NEEDS_INPUT`.
- Code/review/test/lint failures: route back to IMPLEMENT with the failure context.
  Allow at most 3 implementation iterations total, then stop and report the last
  failing stage and evidence.
- Product/API/security/data migration/compatibility ambiguity: stop and ask; do
  not guess.
- Push failure: never force-push. Report the commit hash if one exists and the push
  error.

## Safety gates

- No secrets in prompts, files, logs, commits, screenshots, or command output.
- No `git commit` or `git push` without explicit user approval for this run.
- No force-push, `git reset --hard`, destructive cleanups, or unrelated refactors.
- Prefer repository-defined commands over invented commands.
- Keep reports concise: final status, changed files, validation evidence, skipped
  gates with reasons, and remaining risks/blockers.
