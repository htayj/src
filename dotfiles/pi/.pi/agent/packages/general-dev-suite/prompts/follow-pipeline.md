---
description: Watch a CI pipeline and drive it to green with bounded retries/fixes
argument-hint: "[MR or pipeline] [--max-iterations N]"
---
Follow this pipeline/MR until it is green or needs human input: $ARGUMENTS

Use `task_graph_create` with `mode: "follow-pipeline"` and `input: $ARGUMENTS`, then drive ready tasks with `task_graph_next` and `task_graph_update`.

Use bounded iterations. Retry clearly transient jobs once or twice. For code/test/lint failures, route failures back through implementation tasks, run local verification, amend only if explicitly allowed, and ask before force-pushing.
