---
description: Iterate toward a testable goal while writing a reusable skill
argument-hint: "<goal, objective test, expected output, skill target>"
---

Run this testable goal through the local autoimprove task graph: $ARGUMENTS

Use `task_graph_create` with `mode: "autoimprove"` and `input: $ARGUMENTS` for a new goal. If `$ARGUMENTS` asks to continue an existing completed autoimprove loop, prefer `task_graph_continue_autoimprove` (start with `dryRun: true`) so the next run is linked to the prior run and forced through Oracle before implementation. Then drive the active graph with `task_graph_next`, subagent/chain execution, and `task_graph_update`.

Autoimprove is for work where success can be tested objectively and the deliverables are BOTH:

1. the goal result/output, and
2. a reusable Pi skill capturing the method, commands, tests, edge cases, and lessons learned while reaching the goal.

Before iterating, confirm the contract: objective test, expected goal output artifact/path, validation evidence, transcript/log evidence when relevant, and skill name/path. If the request lacks a concrete objective test, or the approach is unclear, the autoimprove graph should consult Oracle MCP first to propose an autoimprovement plan/test/skill target, then briefly grill the user to sanity-check that proposed contract before implementation. Each iteration should implement/improve both deliverables, run the objective goal test, and evaluate the result plus skill. Mark `GOAL_TEST` or `EVALUATE` failed when the test, required artifact paths, validation output, transcript/child-run evidence, or skill is insufficient so the graph routes another bounded implementation iteration. Stop when the goal test passes and the skill is reusable, or when blocked by missing test criteria/human input.

For multi-iteration loops, `task_graph_continue_autoimprove` creates exactly one successor run, records optional `metadata.autoimproveLoop` lineage, writes a bounded `continuation-context.md` artifact, disables commit/push, and requires an `ORACLE_CONSULT` task before implementation. Always preview with `dryRun: true` first. For legacy/pre-tool runs with no loop metadata, pass `lineageAdoption: { rootRunId, previousRunIteration, loopId?, reason? }`; the preview/status should show `lineageSource` and any warnings. If a previous run already has `nextRunId`, omit `forceNew` to return the existing successor; use `dryRun: true, forceNew: true` only to preview an intentional alternate successor, and avoid create mode unless the duplicate branch is approved. Pass only non-secret evidence paths; avoid raw transcripts or environment dumps. Do not use the tool as an infinite loop controller: after creating or previewing the successor, call `task_graph_next` and drive the graph normally.

When the objective requires external or tmux-puppeted Pi workers, use `task_graph_worker_bundle` / `task_graph_spawn_tmux_worker` when available, or manually launch tmux with `pipe-pane` logging and `load-buffer`/`paste-buffer` prompt injection. The parent/orchestrator should not write target project code directly; require child Pi `task_graph_create`, `task_graph_next`, and `task_graph_update` evidence plus transcript paths and child run IDs before PASS.

Launch subagents with the returned `context`, normally `fresh`; use fork only when explicitly justified. Do not commit or push unless explicitly approved with `task_graph_approve`.
