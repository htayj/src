# Implementation Plan

## Goal
Add validated, project-local task graph settings that can inject agent instructions, define custom graph templates, and tune task routing/scheduling behavior for the general-dev-suite task-graph extension.

## Tasks
1. **Define the project settings model and loader**: Add a dedicated settings module that discovers project-local config files, parses JSON, validates shape, and returns normalized defaults.
   - File: `pi/.pi/agent/packages/general-dev-suite/extensions/task-graph/settings.ts`
   - Changes: Create types and functions such as `TaskGraphProjectSettings`, `loadProjectSettings(cwd)`, `validateProjectSettings(value)`, and `settingsPath(cwd)`. Prefer `.pi/dev-suite/task-graph/settings.json` as the primary project-local file, optionally also checking `.pi/task-graph.json` only if backward-compatible discovery is desired.
   - Acceptance: Invalid JSON, unknown enum values, bad types, duplicate custom graph names, dependency cycles, and unsafe path types produce clear errors before run creation.

2. **Extend schema types for settings-driven routing**: Add typed fields for persisted settings decisions and routing overrides.
   - File: `pi/.pi/agent/packages/general-dev-suite/extensions/task-graph/schema.ts`
   - Changes: Extend `TaskGraphOptions` with optional settings controls if needed, e.g. `settingsPath?: string` and `ignoreProjectSettings?: boolean`. Extend `SchedulerConfig` with settings-derived routing knobs such as `defaultSubagentContext?: "fresh" | "fork"`, `agentInstructions?: Record<string, string>`, `routing?: { maxCodeIterations?: number; maxEnvironmentalRetries?: number; failureRoutes?: Partial<Record<TaskKind, RouteMetadata["onFailure"]>> }`. Add optional `settings?: { path?: string; loaded?: boolean; customGraphName?: string }` metadata to `TaskGraphRun` if persistence is useful.
   - Acceptance: Existing saved run JSON remains loadable because all new fields are optional or defaulted at creation time.

3. **Apply settings during run creation**: Load settings in `task_graph_create` and pass them into formula construction.
   - File: `pi/.pi/agent/packages/general-dev-suite/extensions/task-graph/index.ts`
   - Changes: Import `loadProjectSettings`; include project settings in the `task_graph_create` execution path before `createRun`; pass settings into `createRun`; append a `settings_loaded` event with the config path and enabled sections. Add tool parameter docs for `options.ignoreProjectSettings` and optional `options.customGraph` if custom graph selection is exposed through `task_graph_create`.
   - Acceptance: Creating a run with no settings preserves current behavior; creating a run with valid settings persists the effective routing/scheduling config and reports the loaded settings path in tool details.

4. **Thread settings through formula helpers**: Modify formula creation so settings can alter generated tasks without ad hoc global state.
   - File: `pi/.pi/agent/packages/general-dev-suite/extensions/task-graph/formulas.ts`
   - Changes: Add an optional `projectSettings` argument to `createRun`, `appendStageChain`, `appendAutoImproveChain`, `appendExecutionChains`, `planTask`, `decomposeTask`, and related helpers where needed. Centralize application in helpers such as `applySettingsToTask(task, settings)` and `configuredRoute(kind, settings)`.
   - Acceptance: Unit-level inspection or manual run JSON inspection shows configured route limits, route targets, subagent context, prompt additions, skills, and write policies are applied consistently to tasks created by all modes.

5. **Support agent instruction injection**: Allow settings to append project-local instructions to generated task prompts by agent/task kind.
   - File: `pi/.pi/agent/packages/general-dev-suite/extensions/task-graph/scheduler.ts`
   - Changes: Update `buildTaskPrompt(run, task)` to append instruction blocks from persisted run settings or task metadata. Support at least `all`, task kind keys such as `IMPLEMENT`, and subagent type keys such as `implementer`. Keep instructions text-only and loaded from project settings, not from arbitrary shell execution.
   - Acceptance: `task_graph_next` output includes the configured instruction block only for matching ready tasks, and no instructions are added when settings are absent.

6. **Support custom graph templates**: Let project settings define named graphs that create task chains with explicit stages and dependencies.
   - File: `pi/.pi/agent/packages/general-dev-suite/extensions/task-graph/settings.ts`
   - File: `pi/.pi/agent/packages/general-dev-suite/extensions/task-graph/formulas.ts`
   - File: `pi/.pi/agent/packages/general-dev-suite/extensions/task-graph/index.ts`
   - Changes: Define a conservative custom graph schema, e.g. `customGraphs: { [name]: { description?: string; stages: Array<{ id: string; kind: TaskKind; title?: string; runner?: RunnerKind; subagentType?: string; skills?: string[]; dependsOn?: string[]; sideEffects?: SideEffects; expectedWritePaths?: string[]; promptInstructions?: string }> } }`. Validate stage ids, kinds, dependencies, cycles, and runner/side-effect enums. Add a `customGraph` option for `mode: "custom"` or any mode if product intent requires, and instantiate the template with `makeTask`/dependency edges.
   - Acceptance: A valid `mode: "custom"` run with `options.customGraph` creates exactly the configured stages and dependencies; missing graph names and invalid templates fail with actionable errors.

7. **Make settings influence scheduler routing and lock selection**: Respect configured routing and scheduling knobs at ready-task and failure-routing time.
   - File: `pi/.pi/agent/packages/general-dev-suite/extensions/task-graph/scheduler.ts`
   - File: `pi/.pi/agent/packages/general-dev-suite/extensions/task-graph/formulas.ts`
   - Changes: Use settings-derived `maxParallel` defaults if `task_graph_create.options.maxParallel` is absent. Apply custom `RouteMetadata` defaults in `makeTask`/route helper. Use configured write conflict groups or expected write paths in `taskLockKeys` only after validation.
   - Acceptance: Failure routing uses configured max code/environment iterations and on-failure behavior; ready-task selection respects configured max parallel and lock groups.

8. **Expose diagnostics for effective settings**: Add a read-only tool or status detail to inspect settings without creating a run.
   - File: `pi/.pi/agent/packages/general-dev-suite/extensions/task-graph/index.ts`
   - Changes: Register `task_graph_settings` with optional `path`/`expanded` parameters, returning discovered settings path, normalized settings, validation warnings, and example custom graph names. Alternatively include this information in `task_graph_status` if adding a tool is not desired.
   - Acceptance: Users can verify project-local config and validation errors without manually reading JSON.

9. **Document the project-local settings file**: Add usage examples and safety notes.
   - File: `pi/.pi/agent/packages/general-dev-suite/README.md`
   - Changes: Document `.pi/dev-suite/task-graph/settings.json`, supported top-level keys, an agent-instructions example, a routing example, and a custom graph example. State that settings must not contain secrets and cannot approve commit/push gates.
   - Acceptance: README includes enough information for a project to author a minimal settings file and run `task_graph_settings`/`task_graph_create` to validate it.

10. **Add focused tests or a lightweight validation harness**: Cover the new parser and core behavior even if the package has no existing test runner.
   - File: `pi/.pi/agent/packages/general-dev-suite/extensions/task-graph/settings.test.ts` or `pi/.pi/agent/packages/general-dev-suite/extensions/task-graph/settings.validation.ts`
   - Changes: If a TS test runner exists in the Pi environment, add tests for valid settings, invalid enums, duplicate graph stage ids, dependency cycles, instruction matching, and custom graph instantiation. If no runner exists, add a small script/harness that can be run with the local TS runtime used by Pi.
   - Acceptance: The focused validation command passes and fails on intentionally bad fixtures when run locally.

11. **Run build/typecheck and focused validation**: Verify that TypeScript and settings behavior are sound.
   - File: N/A
   - Changes: No code change; execute project-appropriate commands discovered from the local Pi/dotfiles setup.
   - Acceptance: At minimum run one of the following, depending on available tooling: `npm --prefix pi/.pi/agent/packages/general-dev-suite exec tsc -- --noEmit`, `pnpm --dir pi/.pi/agent/packages/general-dev-suite exec tsc --noEmit`, `bunx tsc --noEmit` from the package, or the Pi package build command if documented. Also run the focused settings tests/harness from Task 10.

## Files to Modify
- `pi/.pi/agent/packages/general-dev-suite/extensions/task-graph/index.ts` - load settings, expose tool options/diagnostics, pass effective settings into run creation, report settings events.
- `pi/.pi/agent/packages/general-dev-suite/extensions/task-graph/schema.ts` - add optional persisted settings/routing/custom graph metadata types.
- `pi/.pi/agent/packages/general-dev-suite/extensions/task-graph/formulas.ts` - apply settings during task/run creation and instantiate custom graphs.
- `pi/.pi/agent/packages/general-dev-suite/extensions/task-graph/scheduler.ts` - inject matching agent instructions into prompts and respect settings-driven routing/locks.
- `pi/.pi/agent/packages/general-dev-suite/extensions/task-graph/display.ts` - optionally show loaded settings/custom graph names in status output.
- `pi/.pi/agent/packages/general-dev-suite/README.md` - document settings schema, examples, validation, and no-secrets rule.

## New Files
- `pi/.pi/agent/packages/general-dev-suite/extensions/task-graph/settings.ts` - project-local settings discovery, normalization, validation, and helpers.
- `pi/.pi/agent/packages/general-dev-suite/extensions/task-graph/settings.test.ts` or `pi/.pi/agent/packages/general-dev-suite/extensions/task-graph/settings.validation.ts` - focused tests/harness for settings validation and normalization.

## Dependencies
- Task 2 depends on Task 1's proposed settings shape.
- Tasks 3 and 4 depend on Tasks 1-2.
- Task 5 depends on settings being persisted or copied into task metadata by Tasks 2-4.
- Task 6 depends on the validated custom graph schema from Task 1 and task-construction helpers from Task 4.
- Task 7 depends on routing fields from Task 2 and route helper changes from Task 4.
- Task 8 depends on Task 1 and can be completed before custom graph instantiation if it only reports validation.
- Task 9 should be finalized after Tasks 1, 6, and 8 settle names and examples.
- Task 10 depends on Tasks 1, 5, 6, and 7 for meaningful coverage.
- Task 11 depends on all implementation tasks.

## Risks
- The exact settings schema is a product/API decision; the plan assumes `.pi/dev-suite/task-graph/settings.json` and conservative JSON-only templates. If a different path or format is required, decide before implementation.
- There is no visible package-local `tsconfig.json` or test runner in `general-dev-suite`; validation may require discovering the Pi runtime's TypeScript build command or adding a lightweight harness.
- Persisted run schema is currently version `1`; adding optional fields should avoid migration, but changing required fields would need schema-version handling.
- Custom graphs can accidentally bypass safety gates; validation must reject commit/push approval defaults and preserve existing explicit approval requirements.
- Agent instruction injection can bloat prompts or leak secrets if users put secrets in settings; documentation and optional length limits should warn that settings are non-secret project files.
- Routing overrides can create infinite retry loops if unbounded; enforce numeric caps and safe defaults.
