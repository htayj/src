---
description: Run one concrete task through the Pi subagents development chain
argument-hint: "<task>"
---
Run this concrete task through the local task graph: $ARGUMENTS

Use `task_graph_create` with `mode: "do"`, then drive the graph:

1. Call `task_graph_next` to get dependency-ready work.
2. Run executable tasks via the returned subagent/chain runner prompts by default.
3. After each task, call `task_graph_update` with status, summary, changed files, artifacts, or failure context.
4. Repeat until the graph is complete or blocked.

The default chain is: plan → implement → compile/typecheck verification → unit tests → performance check → code review → restart/API/E2E/UX checks where relevant → spec/lint. Commit/push stages stay skipped unless explicitly approved with `task_graph_approve`.

Keep the parent session as orchestrator: synthesize outputs, ask me about unapproved product/architecture decisions, and do not mutate TODO.org/DONE.org, commit, or push unless explicitly approved through the graph.
