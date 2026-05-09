---
name: general-dev-plan
description: "General planning pipeline: scout code context then produce an implementation plan."
---

## scout
output: context.md
outputMode: file-only
skills: build-test-procedures

Gather local codebase context for:

{task}

Find relevant files, existing patterns, tests, build commands, constraints, and risks. Do not edit files.

## planner
output: plan.md
outputMode: inline
reads: context.md
skills: build-test-procedures, tdd

Create an implementation-ready plan for:

{task}

Use the scout output from {previous}. Include scope, non-goals, steps, files, tests, validation, assumptions, and questions needing user input.
