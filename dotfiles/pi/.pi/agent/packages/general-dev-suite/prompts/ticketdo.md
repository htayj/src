---
description: Fetch or infer an issue/ticket and run it through Pi subagents
argument-hint: "[ticket key or issue URL]"
---
Run a ticket/issue through the local task graph planning-first workflow: $ARGUMENTS

Use `task_graph_create` with `mode: "ticketdo"` and `input: $ARGUMENTS`. If no ticket is provided, infer from branch name or ask. If project issue tools are available, fetch title/body/acceptance criteria/comments and attach them as task artifacts with `task_graph_update`. Treat acceptance criteria as the source of truth. Then drive the graph with `task_graph_next`, subagent/chain execution, clarification questions, and `task_graph_update`.

Do not commit, push, force-push, or mutate external tickets unless explicitly approved.
