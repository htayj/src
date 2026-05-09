---
name: general-dev-verify
description: "General verification pipeline: discover changed scope, run build/typecheck/tests, and report actionable errors."
---

## scout
output: verify-context.md
outputMode: file-only
skills: build-test-procedures

Determine the verification scope for:

{task}

Inspect git changed files, project instructions, manifests, and CI/build scripts. Identify the smallest reliable build/typecheck/test/lint commands. Do not edit files.

## delegate
output: verify-report.md
outputMode: inline
reads: verify-context.md
skills: build-test-procedures, compile-verifier, unit-tester

Run the verification plan for:

{task}

Use the discovered commands from {previous}. Run safe focused checks first, then broader checks only when needed. If failures occur, parse them into actionable file:line issues and suggest fixes. Do not make non-trivial edits.
