---
description: Plan, ask focused clarification questions, then execute via Pi subagents
argument-hint: "<task>"
---
Plan and execute this task after resolving ambiguities: $ARGUMENTS

Use the local task graph as the orchestrator:

1. Call `task_graph_create` with `mode: "pdo"` and `input: $ARGUMENTS`.
2. Call `task_graph_next` to get dependency-ready work. Run executable tasks via the returned subagent/chain runner prompts by default.
3. For each material open decision, ask me one focused question at a time and record the decision with `task_graph_update`.
4. After each subagent/direct task, call `task_graph_update` with status, summary, changed files, artifacts, or failure context.
5. Repeat `task_graph_next` until the graph is complete or blocked.

For complex or uncertain requests, expect the graph to schedule `ORACLE_CONSULT` and/or `DECOMPOSE` tasks before implementation. If `ORACLE_CONSULT` appears, call the Oracle MCP/tool in browser mode with GPT-5.5 Pro Extended, provide ample non-secret context, and record the result with `task_graph_update`. If `DECOMPOSE` produces `decomposition.json`, `task_graph_update` should auto-expand it; call `task_graph_expand_decomposition` before implementation if it did not. If the request applies one action to an enumerated list of things, expect separate per-item subtask chains. Launch subagents with the returned `context`, normally `fresh`; use fork only when the task explicitly justifies it.

Keep the parent session as orchestrator and synthesize the final result. Do not mutate TODO.org/DONE.org, commit, or push unless explicitly approved through the graph.
