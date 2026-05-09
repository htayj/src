---
name: general-dev-perf-test
description: "Resolve and run existing performance benchmarks for changed code or requested scope."
---

## scout
output: perf-context.md
outputMode: file-only
skills: perf-tester, build-test-procedures

Gather performance test context for:

{task}

Find perf/benchmark infrastructure, relevant changed files, likely benchmark files, baseline conventions, and commands. Do not edit files.

## perf-tester
output: perf-test-report.md
outputMode: inline
reads: perf-context.md
skills: perf-tester, build-test-procedures

Run and analyze relevant performance benchmarks for:

{task}

Use the context from {previous}. Do not edit source code or relax thresholds.
