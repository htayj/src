# general-dev-suite

A generalized Pi package converted from `~/claude-plugin-marketplace.work`.

It keeps the useful development workflows and removes repo-specific assumptions:

- slash-command prompt templates for implementation, verification, tests, E2E, branch readiness, review-request/pipeline work, TODO pipelines, and TypeScript references
- Agent Skill style skills for TDD, generic build/test procedures, REST endpoint work, frontend design, Git workflows, device simulators, and Pi skill authoring
- Pi extension helpers for safe bash nudges, changed-file tracking, notes tools, generic HTTP API calls, and a durable dependency-aware task graph replacing the external todo pipeline plugin
- Pi subagent definitions in `~/.pi/agent/agents/general-dev/` for implementation, verification, unit/API/E2E/perf testing, code review, and UX review
- Pi subagent chains in `~/.pi/agent/chains/general-dev/` such as `general-dev-do`, `general-dev-plan`, `general-dev-verify`, and test/review chains

Loaded globally from `~/.pi/agent/settings.json` as a local Pi package. Subagent agents/chains are installed in Pi's user-level subagents directories because `pi-subagents` discovers those separately from Pi packages.

## Task graph workflow

The local task graph extension provides:

- `task_graph_create` for `do`, `pdo`/`fulcrum`, `todo`, `todo-strict`, `ticketdo`, and CI follow/fixup runs. Complex inputs are annotated with planning complexity and can schedule `ORACLE_CONSULT` and `DECOMPOSE` gates before implementation.
- `task_graph_next` for dependency-ready, parallel-safe work with subagent/chain runner prompts.
- `task_graph_update` for recording status, artifacts, changed files, failure routing, and dependency edits.
- `task_graph_expand_decomposition` for turning a completed `DECOMPOSE` task's `decomposition.json` artifact into multiple dependent implementation/check chains; `task_graph_update` also auto-expands when a succeeded `DECOMPOSE` task includes that artifact.
- `task_graph_approve` for explicit commit, push, TODO.org mutation, and other safety gates.
- `todo` compatibility backed by the same durable graph store.

State is stored under `.pi/dev-suite/task-graph/` in the active project. Commit/push and TODO.org/DONE.org mutations are disabled unless approved. Oracle consult tasks are manual/read-only gates: the parent agent should call `oracle_consult` in browser mode with GPT-5.5 Pro Extended, attach ample non-secret context, then record the result as an artifact before continuing.
