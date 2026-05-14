---
description: Work through TODO items with Pi subagents pipelines
argument-hint: "[TODO file or item filter]"
---
Process TODO items through the local task graph. Scope: $ARGUMENTS

Use `task_graph_create` with `mode: "todo"` and `input: $ARGUMENTS` (a path/filter, or empty to use `TODO.org` when present). Then:

1. Call `task_graph_next` to get dependency-ready planning/execution tasks.
2. Run executable tasks via the returned subagent/chain runner prompts by default.
3. Record each result with `task_graph_update`.
4. Repeat until one actionable item is complete or the graph blocks; continue looping only if I explicitly asked for continuous mode.

Do not mutate `TODO.org`/`DONE.org`, commit, or push unless explicitly approved with `task_graph_approve`.
