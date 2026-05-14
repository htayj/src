---
description: Inspect failed CI pipelines and retry obvious infrastructure failures
argument-hint: "[--dry-run] [repo/scope]"
---
Inspect failed pipelines for my open review requests and fix up obvious retryable failures. Args: $ARGUMENTS

Use `task_graph_create` with `mode: "fixup-pipelines"` and `input: $ARGUMENTS`, then drive ready tasks with `task_graph_next` and `task_graph_update`.

Use the project's configured CI/forge tooling. Classify failures as retryable infrastructure/artifact, code/test/lint, operator/config, or unknown. In dry-run mode, only report planned retries. Never hide code failures by retrying indefinitely; route code failures back through bounded implementation tasks.
