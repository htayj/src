# general-dev-suite

A generalized Pi package converted from `~/claude-plugin-marketplace.work`.

It keeps the useful development workflows and removes repo-specific assumptions:

- slash-command prompt templates for implementation, verification, tests, E2E, branch readiness, review-request/pipeline work, TODO pipelines, iterative autoimprove runs, and TypeScript references
- Agent Skill style skills for TDD, generic build/test procedures, REST endpoint work, frontend design, Git workflows, device simulators, and Pi skill authoring
- Pi extension helpers for safe bash nudges, changed-file tracking, notes tools, generic HTTP API calls, ComfyUI/Civitai workflow tooling, and a durable dependency-aware task graph replacing the external todo pipeline plugin
- Pi subagent definitions in `~/.pi/agent/agents/general-dev/` for implementation, verification, unit/API/E2E/perf testing, code review, and UX review
- Pi subagent chains in `~/.pi/agent/chains/general-dev/` such as `general-dev-do`, `general-dev-plan`, `general-dev-verify`, and test/review chains

Loaded globally from `~/.pi/agent/settings.json` as a local Pi package. Subagent agents/chains are installed in Pi's user-level subagents directories because `pi-subagents` discovers those separately from Pi packages.

## Task graph workflow

The local task graph extension provides:

- `task_graph_create` for `do`, `pdo`/`fulcrum`, `todo`, `todo-strict`, `ticketdo`, `autoimprove`, and CI follow/fixup runs. `autoimprove` is for objective-test-driven iterative goals where the final deliverables are both the goal result and a reusable skill capturing the method; if the request lacks a concrete objective test or has an unclear approach, it schedules an `ORACLE_CONSULT` planning gate before a brief user sanity-check, and when the loop exhausts its normal retry budget, it schedules an `ORACLE_CONSULT` recovery gate before the next retry. Complex inputs are annotated with planning complexity and can schedule `ORACLE_CONSULT` and `DECOMPOSE` gates before implementation.
- `task_graph_next` for dependency-ready, parallel-safe work with subagent/chain runner prompts, including runner-specific guidance for manual gates, direct-safe commands, subagents, and chains.
- Read-only extension workflow bridge surfaces (`task_graph_extension_guide`, before-agent advisory, and generated task prompt hints) connect extension-specific work to `task_graph_update` evidence without executing tools, saving runs, or mutating queues/scheduler state.
- `task_graph_dynamic_preview` for bounded, read-only previews of agent-proposed dynamic task seeds. It normalizes public seed fields, validates explicit dependency aliases/cycles, computes deterministic ready batches with conservative write-scope serialization, and annotates advisory worktree eligibility without queuing, persisting, mutating runs/rootWorkQueue/scheduler state, launching work, or creating worktrees.
- `task_graph_continue_autoimprove` for continuing a completed `autoimprove` run as exactly one linked successor run. It adds optional loop metadata, writes a bounded `continuation-context.md` artifact, forces `oracleConsult: true`, disables commit/push on the successor, and supports `dryRun: true` previews that do not save a new run or change `current.json`.
- `task_graph_worker_bundle` and `task_graph_spawn_tmux_worker` for dogfooding with external tmux-puppeted Pi workers. These create prompt/provenance/update-template/transcript bundles and can launch a tmux session running Pi without making the parent agent write target project code directly.
- `task_graph_flowchart` for copyable deterministic ASCII or Mermaid dependency-edge flowcharts of the current or selected run, with sanitized compact labels that omit prompt instruction fields.
- `task_graph_update` for recording status, artifacts, changed files, failure routing, dependency edits, validation evidence, worker provenance, and child task-graph run references.
- `task_graph_expand_decomposition` for turning a completed `DECOMPOSE` task's `decomposition.json` artifact into multiple dependent implementation/check chains; `task_graph_update` also auto-expands when a succeeded `DECOMPOSE` task includes that artifact.
- `task_graph_approve` for explicit commit, push, TODO.org mutation, and other safety gates.
- `todo` compatibility backed by the same durable graph store.
- `/task-ui` or `Ctrl+Alt+G` opens a full-window interactive task graph UI for navigating the complete task list, viewing details/ready prompts, refreshing, toggling flat/outline/flowchart views, and manually marking tasks running/succeeded/failed/skipped/cancelled/deleted.
- `/task-flowchart` shows the current or selected run as deterministic ASCII by default; pass `mermaid` for a copyable Mermaid `flowchart TD`, `--done` to include completed tasks, and `--max-label-length=N` to tune compact labels.
- `/task-graphs` lists built-in task graph pipelines (`do`, `pdo`, `todo`, `todo-strict`, `ticketdo`, `autoimprove`, CI helpers, and `custom`) plus packaged and project-local custom templates, including safe descriptions, sources, stage counts, and creation hints. Pass an optional settings path argument to inspect a non-default settings file. Use `/task-graphs manage` or `/task-graphs-manage` to interactively enable/disable graphs in project or global settings.

Packaged Common Lisp presets are available without a project settings file:

```ts
task_graph_create({
  mode: "custom",
  input: "Add a public helper to the foo ASDF system and test it.",
  options: { customGraph: "common-lisp-asdf" },
});
```

Use `common-lisp-asdf` for ASDF/package/API/library work. Its stages ask agents to discover project commands first, then fall back only when needed to SBCL/ASDF examples such as `asdf:load-system`, `asdf:compile-system`, `asdf:test-system`, or existing FiveAM runners.

```ts
task_graph_create({
  mode: "custom",
  input: "Fix the McCLIM render loop regression and prove the UI still launches.",
  options: { customGraph: "common-lisp-clim-tui" },
});
```

Use `common-lisp-clim-tui` for CLIM/McCLIM/TUI visible-behavior work. Its stages require a visible behavior invariant, framework-native CLIM/McCLIM or deterministic TUI implementation guidance, compile/load checks, tests, and screenshot/log/terminal-capture evidence when available.

State is stored under `.pi/dev-suite/task-graph/` in the active project. Commit/push and TODO.org/DONE.org mutations are disabled unless approved. Oracle consult tasks are manual/read-only gates: the parent agent should call `oracle_consult` in browser mode with GPT-5.5 Pro Extended, attach ample non-secret context, then record the result as an artifact before continuing. Ready subagent tasks default to `context: "fresh"`; use forked context only when a task explicitly says conversation history is required. Requests that apply the same action to an enumerated list of things are split into per-item subtask chains.

Autoimprove runs now carry an extracted objective-evidence contract when the input includes objective/acceptance bullets. Prompts for implement, goal-test, evaluate, and review stages repeat the required checklist, validation hints, expected artifact roots, and dogfooding requirements such as tmux-puppeted child Pi transcripts, child task-graph run files, and reusable skill/playbook output. A stage should not be marked PASS when required artifact paths, validation command output, transcript/log evidence, or child run IDs are missing.

Use `task_graph_continue_autoimprove` to make autoimprove loops durable without creating an uncontrolled recursive agent. Start with `dryRun: true`, pass safe evidence paths (for example final reports and validation summaries, not raw transcripts containing secrets), and only create the successor when the previous run is terminal and the dirty worktree state is intentional. For legacy/pre-tool runs that have no `autoimproveLoop` metadata, pass `lineageAdoption: { rootRunId, previousRunIteration, loopId?, reason? }` so the successor iteration is computed from human-audited lineage instead of title heuristics; use `overrideExistingMetadata: true` only when explicitly acknowledging a conflict. The successor records `metadata.autoimproveLoop` with loop id, iteration, previous/root run ids, Oracle requirement, lineage source/warnings, evidence paths, optional git baseline, and the continuation artifact. The tool refuses non-autoimprove runs, incomplete/non-success runs unless explicitly allowed, already-linked runs unless `forceNew` is set, dirty worktrees unless `allowDirtyWorktree` is set, and max-iteration overrun when configured against the successor iteration. Use `forceNew` cautiously: with an existing `nextRunId`, a dry-run plus `forceNew: true` can preview another successor, but create mode can intentionally make a duplicate branch. Status, widgets, and prompts show lineage source and warning badges when adoption/defaulting occurred. After creation, the next step is still manual orchestration with `task_graph_next`; the tool never calls itself or starts the next run automatically.

`task_graph_continue_autoimprove` can also persist a generalized `metadata.rootWorkQueue` so future root work is not lost when only one successor is created. Queue items are metadata, not scheduler `TaskNode`s: they appear in status/widgets/prompts/UI/flowcharts as synthetic root-work sections and do not affect dependencies, locks, `readyTasks`, or terminal status. Supported kinds are `autoimprove-loop`, `task`, `custom-graph`, `research`, `deep-research`, and `manual`; only `autoimprove-loop` is executable in this slice. Pass `futureWork` (or the `futureLoops` alias for loop-shaped entries) to merge durable seeds. If an explicit `objective` is supplied and `rootWorkSelection` is omitted, the queue is carried forward but not consumed. If no objective is supplied, selection defaults to `{ mode: "first-executable" }` and materializes at most one queued `autoimprove-loop`. `{ mode: "item-key", key }` selects one queued executable item; selecting `research`, `deep-research`, `custom-graph`, `task`, or `manual` returns a clear non-executable result and leaves it queued. Parent runs record selected work as `history: created`; successors carry that work as `state: active`; when the active successor later completes, the next continuation records `history: completed` before selecting another queued item. Queue inputs are sanitized public metadata only: do not store prompt instructions, hidden prompts, secrets, cookies, `.env` data, private keys, or raw Oracle transcripts.

Example pending root-work payload:

```json
[
  {
    "key": "tie-pi-extensions-into-task-graph-loops",
    "kind": "autoimprove-loop",
    "title": "Tie current Pi extensions into existing task graph loops",
    "input": { "kind": "autoimprove-loop", "objective": "Tie current Pi extensions into existing task graph loops.", "oracleRequired": true, "writeScope": ["extensions/"] },
    "requestedBy": "user"
  },
  {
    "key": "dynamic-graph-generation",
    "kind": "autoimprove-loop",
    "title": "Dynamic graph generation for tasks",
    "input": { "kind": "autoimprove-loop", "objective": "Design and implement dynamic graph generation for tasks, similar to Claude Code dynamic workflows.", "oracleRequired": true, "writeScope": ["extensions/task-graph/"] },
    "requestedBy": "user"
  },
  {
    "key": "subagent-management-research",
    "kind": "research",
    "title": "Research subagent management improvements",
    "input": { "kind": "research", "question": "Research subagent management improvements and what others are doing for subagents in Pi/agent workflows online.", "expectedOutput": "A bounded implementation recommendation for task-graph/subagent integration." },
    "requestedBy": "user"
  },
  {
    "key": "deep-research-task-graph-node",
    "kind": "deep-research",
    "title": "Deep-research task-graph node",
    "input": { "kind": "deep-research", "question": "Design a deep-research task-graph node usable in dynamic graphs; inspect the installed Claude built-in workflow and adapt/improve it.", "expectedOutput": "Schema, execution model, privacy constraints, and validation plan." },
    "requestedBy": "user"
  },
  {
    "key": "flowchart-decision-routing",
    "kind": "custom-graph",
    "title": "Flowchart decision routing and cycles",
    "purpose": "Carry forward richer flow-chart/control-flow routing work without changing scheduler semantics in this slice.",
    "input": { "kind": "custom-graph", "presetName": "future-flowchart-control-flow" },
    "requestedBy": "user"
  }
]
```

For tmux dogfooding, keep the parent as orchestrator/reviewer and let the child Pi write target project code. Use `task_graph_spawn_tmux_worker` or the `tmux-task-graph-dogfooding` skill to create a prompt bundle, start logging with `tmux pipe-pane`, inject prompts with `tmux load-buffer`/`paste-buffer`, and require child `task_graph_create`/`task_graph_next`/`task_graph_update` evidence before marking parent work succeeded. Never put secrets in worker prompts, transcripts, or task artifacts.

### Task graph extension workflow bridge

The bridge is a read-only evidence router, not an executor:

- **Surfaces:** `task_graph_extension_guide`, the `before_agent_start` advisory, and generated `task_graph_next` prompt hints render deterministic guidance. Active-run context is sanitized and loaded with `loadRunNoCreate`.
- **Workflows:** `changed-files`, `notes`, `http-api`, `tmux-worker`, `image-ai`, and `comfyui-civitai`. Activation should stay concise and conditional; image/ComfyUI hints require strong artifact/model terms, and unrelated implementation work should not receive extension noise.
- **Evidence:** record paths and summaries through `task_graph_update`: `changedFiles`, validation output, decision artifacts, API status/schema checks, worker provenance/transcripts, child run ids, generated media, workflow JSON/model provenance, and critique artifacts.
- **Guardrails:** the bridge must never execute extension tools, save runs, append events, call `task_graph_continue_autoimprove`, mutate queues or `rootWorkQueue`, change scheduler dependencies/readiness, or auto-continue runs.
- **Privacy:** rendered UI/status/details/flowchart output must stay sanitized; do not leak prompt-like/private fields, hidden instructions, raw prompts, secrets, cookies, tokens, or credentials.

### Dynamic task graph preview guardrails

Use `task_graph_dynamic_preview` only as a planning/safety aid before explicitly creating durable graph work. Inputs are non-secret public seed fields (`key`, `title`, `dependsOn`, `expectedWritePaths`, runner hints, and short descriptions); prompt-like/private/secret-shaped lines are stripped from Markdown output and returned details. Dependency edges are explicit only: the preview resolves `stableKey`/`sourceKey`/`sourceId` aliases, reports unknown or ambiguous dependencies, and does not infer dependencies from natural language.

Preview batches are deterministic and advisory. `maxParallel` is bounded, unknown write scopes serialize conservatively, declared write locks serialize on literal or glob overlap, and `worktreeEligibility` says only whether a seed has declared writes; it does not create worktrees or grant execution permission. Treat the result as a proposal to inspect, then materialize work with `task_graph_create`, `task_graph_add_task`, or `task_graph_update` yourself. The preview tool must never queue tasks, save runs, append events, drain `rootWorkQueue`, change scheduler/readiness semantics, launch subagents, execute shell commands, or create/delete worktrees.

### Task graph settings

Global non-secret settings may live at `~/.pi/dev-suite/task-graph/settings.json` (or `PI_TASK_GRAPH_GLOBAL_SETTINGS`). Projects may add non-secret settings at `.pi/dev-suite/task-graph/settings.json` (preferred) or `.pi/task-graph.json`. `task_graph_create` loads global settings plus project settings automatically unless `options.ignoreProjectSettings` is true; `options.settingsPath` can point at an alternate project-local JSON file. Use `task_graph_settings` to validate and inspect the effective settings without creating a run, or `/task-graphs` to list both built-in pipelines and custom templates from the active project.

Supported top-level keys:

- `agentInstructions`: map of selectors to a string or string array. Selectors can be `all`, a task kind such as `IMPLEMENT`, a runner name, or a subagent type such as `unit-tester`. Matching instructions are appended to `task_graph_next` prompts.
- `routing.maxParallel`: project default parallelism when the tool call does not pass `options.maxParallel`.
- `routing.defaultSubagentContext`: default `fresh`/`fork` context for custom or otherwise unspecified subagent tasks.
- `routing.failureRoutes`: per-task-kind overrides for `onFailure`, `maxCodeIterations`, and `maxEnvironmentalRetries`.
- `routing.lockConflictGroups`: per-task-kind lock group overrides for scheduler conflict control.
- `graphs`: named custom graph templates. Create them with `task_graph_create({ mode: "custom", input, options: { customGraph: "name" } })`. Global/project graph names override packaged presets by name.
- `disabledGraphs`: string or string array that disables built-in modes or custom templates globally/project-locally. Examples: `"do"`, `"todo"`, `"builtin:pdo"`, `"custom"` (all custom graphs), `"custom:frontend-feature"`, `"custom:common-lisp-asdf"`, or `"*"` (all graphs). Global and project values are merged.
- `disabledPackagedGraphs`: optional string or string array that removes packaged custom presets before global/project graph overrides are applied. A project graph with the same name can still replace the packaged preset.

Example:

```json
{
  "agentInstructions": {
    "all": "Use pnpm for package commands. Never put secrets in logs or artifacts.",
    "implementer": ["Follow the repository's functional TypeScript style."],
    "unit-tester": ["Prefer focused Vitest runs before full test suites."]
  },
  "disabledGraphs": ["fixup-pipelines"],
  "routing": {
    "maxParallel": 2,
    "failureRoutes": {
      "UNIT_TEST": { "onFailure": "route_to_implement", "maxCodeIterations": 2 },
      "E2E_TEST": { "onFailure": "stop_for_user" }
    }
  },
  "graphs": {
    "frontend-feature": {
      "description": "React/UI feature workflow",
      "stages": [
        { "id": "plan", "kind": "PLAN", "runnerKind": "chain", "runnerName": "general-dev-plan" },
        { "id": "impl", "kind": "IMPLEMENT", "dependsOn": ["plan"], "subagentType": "implementer" },
        { "id": "typecheck", "kind": "COMPILE", "dependsOn": ["impl"], "subagentType": "compile-verifier" },
        { "id": "unit", "kind": "UNIT_TEST", "dependsOn": ["typecheck"], "subagentType": "unit-tester" },
        { "id": "ux", "kind": "UX_REVIEW", "dependsOn": ["unit"], "subagentType": "ux-review-enforcer" },
        { "id": "review", "kind": "CODE_REVIEW", "dependsOn": ["ux"], "subagentType": "code-review-enforcer" }
      ]
    }
  }
}
```

Settings are project instructions, not an approval mechanism: they cannot approve commit/push/TODO mutation gates. Do not store tokens, credentials, private keys, `.env` values, production data, cookies, or other secrets in these JSON files.

### Deterministic node descriptors

Generated task graph nodes carry optional public `metadata.nodeDescriptor` records with a semantic `stableKey`, one-sentence `purpose`, deterministic `order`, and public lists for inputs, outputs, artifacts, acceptance checks, write scope, and isolation boundaries. Stable keys are descriptive metadata for prompts/status/flowcharts; they are not task IDs, dependency targets, lock names, or scheduler selectors. `TaskNode.id`, `blockedBy`, `blocks`, lock/readiness behavior, and ready ordering remain generated task-ID based.

Custom graph stages can provide descriptor data either as a `descriptor` object or compatible top-level fields such as `stableKey`, `purpose`, `inputs`, `outputs`, `artifacts`, `acceptanceChecks`, `writeScope`, and `isolationBoundary`. Descriptor renderers are whitelist-only and must not include `promptInstructions`, `projectPromptInstructions`, ready/worker/system/hidden prompts, prompt templates, secrets, or generated task IDs. Worker prompts include a fixed `## Deterministic node descriptor` block; status, TUI details, and flowcharts show stable keys/purposes while preserving internal dependency IDs.

Validation entrypoint:

```sh
NODE_PATH=/home/tay/.local/lib/node_modules/@earendil-works/pi-coding-agent/node_modules:/home/tay/.local/lib/node_modules \
  /home/tay/.local/lib/node_modules/pi-intercom/node_modules/.bin/tsx \
  extensions/task-graph/deterministic-nodes.validation.ts
```

## ComfyUI and Civitai tools

The `comfyui.ts` extension targets a local ComfyUI server, defaulting to `http://127.0.0.1:8188` (`PI_COMFYUI_URL`/`COMFYUI_URL` override). It is not limited to image generation: `comfyui_api` can call arbitrary ComfyUI HTTP endpoints for queue/history/settings/jobs/userdata/custom-node APIs, while specialized tools cover status, node schemas, model files, workflow files, workflow queueing, history, image upload/download, and Civitai metadata/downloads.

Local workflow JSON files are stored in `~/.pi/comfyui/workflows` by default (`PI_COMFYUI_WORKFLOW_DIR` override). Civitai downloads use public metadata/download endpoints unless `CIVITAI_API_TOKEN` is already present in the environment; tokens must not be stored in dotfiles or prompts. Download filenames are sanitized and direct download URLs are restricted to `https://*.civitai.com`; image uploads refuse non-local ComfyUI URLs unless explicitly overridden.
