---
name: general-dev-unit-test
description: "Resolve and run unit tests relevant to a task or current changes."
---

## scout
output: test-context.md
outputMode: file-only
skills: build-test-procedures

Find unit test context for:

{task}

Inspect changed files if the task is vague, detect test framework and scripts, and map source files to likely tests. Do not edit files.

## unit-tester
output: unit-test-report.md
outputMode: inline
reads: test-context.md
skills: build-test-procedures, unit-tester

Run and analyze the relevant unit tests for:

{task}

Use the context from {previous}. Do not edit files.
