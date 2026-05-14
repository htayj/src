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

The default chain is: plan → optional Oracle/decomposition gates for complex requests → implement → compile/typecheck verification → unit tests → performance check → code review → restart/API/E2E/UX checks where relevant → spec/lint. Commit/push stages stay skipped unless explicitly approved with `task_graph_approve`.

For complex or uncertain requests, expect the graph to schedule `ORACLE_CONSULT` and/or `DECOMPOSE` tasks before implementation. If `ORACLE_CONSULT` appears, call the Oracle MCP/tool in browser mode with GPT-5.5 Pro Extended, provide ample non-secret context, and record the result with `task_graph_update`. If `DECOMPOSE` produces `decomposition.json`, `task_graph_update` should auto-expand it; call `task_graph_expand_decomposition` before implementation if it did not. If the request applies one action to an enumerated list of things, expect separate per-item subtask chains. Launch subagents with the returned `context`, normally `fresh`; use fork only when the task explicitly justifies it.

Keep the parent session as orchestrator: synthesize outputs, ask me about unapproved product/architecture decisions, and do not mutate TODO.org/DONE.org, commit, or push unless explicitly approved through the graph.
