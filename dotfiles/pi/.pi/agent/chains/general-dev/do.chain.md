---
name: general-dev-do
description: "General development pipeline: scout context, plan, implement, verify, review, and apply accepted fixes."
---

## scout
output: context.md
outputMode: file-only
skills: build-test-procedures, tdd

Map the codebase context for this task:

{task}

Inspect relevant files, tests, build scripts, project instructions, and existing patterns. Return concise handoff context: likely files to change, test/build commands, risks, and open questions. Do not edit files.

## planner
output: plan.md
outputMode: file-only
reads: context.md
skills: build-test-procedures, tdd

Create an implementation plan for:

{task}

Use the scout context from {previous}. Include ordered steps, files/symbols to modify, tests to add or run, validation commands, assumptions, and decisions that require user approval. Do not edit files.

## implementer
output: implementation.md
outputMode: file-only
reads: context.md, plan.md
skills: build-test-procedures, tdd, implementer

Implement the approved or straightforward plan for:

{task}

Use the context and plan from {previous}. Keep scope tight. Use TDD for behavior changes. Run focused validation that is safe and project-appropriate. If a plan decision is not approved and materially changes scope/architecture, stop and report what needs approval instead of guessing.

## compile-verifier
output: compile-report.md
outputMode: file-only
skills: build-test-procedures, compile-verifier

Verify build/typecheck/compile status for this task after implementation:

{task}

Use project-defined commands and the current changed files. Do not edit files. Report actionable errors if any.

## unit-tester
output: unit-test-report.md
outputMode: file-only
skills: build-test-procedures, unit-tester

Run relevant unit tests for this task after implementation:

{task}

Map changed source files to focused tests. Do not edit files. Report failures and missing tests.

## code-review-enforcer
output: review.md
outputMode: file-only
skills: code-review

Review the current diff produced for this task:

{task}

Inspect changed files and tests directly. Do not edit files. Report only evidence-backed findings, grouped as blockers, fixes worth doing now, optional improvements, and feedback to ignore/defer. Include file/line references when possible.

## implementer
output: fixes.md
outputMode: inline
reads: review.md, compile-report.md, unit-test-report.md
skills: build-test-procedures, tdd, implementer

Apply only clear fixes worth doing now for this task:

{task}

Prior outputs: {previous}

Only apply fixes within the original approved scope. Do not apply optional improvements or product/architecture changes without approval. Run focused validation for any fixes and summarize final files changed.
