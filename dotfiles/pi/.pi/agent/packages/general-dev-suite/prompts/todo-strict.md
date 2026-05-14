---
description: Strict TODO processing through Pi subagents with minimal skips
argument-hint: "[TODO file or item filter]"
---
Strictly process TODO items through the local task graph. Scope: $ARGUMENTS

Use `task_graph_create` with `mode: "todo-strict"` and `input: $ARGUMENTS`. Then drive the graph with `task_graph_next`, subagent/chain execution, and `task_graph_update`.

Strict mode means: do not skip verification gates merely because a previous iteration passed; only skip gates that truly do not apply. Record assumptions, every command run, changed files, and artifacts. Complex TODO items may schedule `DECOMPOSE`; if it produces `decomposition.json`, `task_graph_update` should auto-expand it, and `task_graph_expand_decomposition` is available if it did not. TODO items that apply one action across an enumerated list of things should split into per-item subtask chains. Launch subagents with the returned `context`, normally `fresh`; use fork only when explicitly justified. Do not mutate `TODO.org`/`DONE.org`, commit, or push unless explicitly approved with `task_graph_approve`.
