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

Keep the parent session as orchestrator and synthesize the final result. Do not mutate TODO.org/DONE.org, commit, or push unless explicitly approved through the graph.
