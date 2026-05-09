---
description: Add or run focused performance benchmarks through Pi subagents
argument-hint: "[component/module/path]"
---
Run performance checks using the saved Pi subagents chain `general-dev-perf-test`. Scope: $ARGUMENTS

The chain discovers benchmark infrastructure and delegates read-only benchmark execution/analysis to `perf-tester`. Do not invent a new perf harness or relax thresholds unless explicitly requested.
