# Implementation Plan

## Goal
Add a `/task-graphs` slash command that lists project-local custom task graph templates with descriptions, stages, and creation guidance.

## Tasks
1. **Add a reusable custom graph template renderer**: Create an exported pure formatter for project task graph settings output.
   - File: `dotfiles/pi/.pi/agent/packages/general-dev-suite/extensions/task-graph/settings.ts`
   - Changes: Add `renderProjectTaskGraphTemplates(settingsInfo: ProjectTaskGraphSettingsInfo): string` (name can vary, but keep it exported). It should:
     - Return an actionable "No project task graph settings found" message when `settingsInfo.loaded` is false, mentioning `.pi/dev-suite/task-graph/settings.json` and `.pi/task-graph.json`.
     - Return an actionable "No custom task graph templates found" message when settings load but `settings.graphs` is empty.
     - For each graph in `settingsInfo.graphNames ?? Object.keys(settingsInfo.settings?.graphs ?? {})`, show the graph name, graph description or "No description", and all stages.
     - For each stage, show at least stage number, `id`, `kind`, optional `title`, optional `description`, optional `dependsOn`, and runner/subagent hints if configured.
     - Include a per-graph creation hint using a safely quoted graph name, e.g. `task_graph_create({ mode: "custom", input: "<task>", options: { customGraph: "frontend-feature" } })`.
     - Avoid dumping large/free-form `promptInstructions` content in the listing.
   - Acceptance: Calling the formatter with loaded settings containing `graphs.frontend-feature` produces output containing the graph name, description, stage ids/kinds, dependencies, and a `task_graph_create` example.

2. **Register the `/task-graphs` slash command**: Wire the new renderer into the task graph extension command list.
   - File: `dotfiles/pi/.pi/agent/packages/general-dev-suite/extensions/task-graph/index.ts`
   - Changes:
     - Import the renderer from `./settings` alongside `loadProjectSettings`.
     - Add `pi.registerCommand("task-graphs", { ... })` near the existing `/task-status`, `/task-next`, `/task-clear`, and `/task-ui` commands.
     - Command description: "List project-local custom task graph templates".
     - Handler should load settings with `loadProjectSettings(ctx.cwd, ...)` and call `ctx.ui.notify(renderProjectTaskGraphTemplates(settingsInfo), settingsInfo.loaded ? "info" : "warning")`.
     - Optional but useful: treat a non-empty slash-command argument as a project-local settings path (`settingsPath`) for parity with `task_graph_settings.path`; otherwise load the default settings paths.
     - Let `loadProjectSettings` validation errors surface normally or catch them and notify as a warning/error; choose the pattern consistent with existing Pi command error handling.
   - Acceptance: `/task-graphs` appears as a slash command and, in a project with task graph settings, displays the detailed graph template listing without creating a run.

3. **Improve `task_graph_settings` output to reuse the detailed graph listing**: Keep the existing validation/inspection tool consistent with the new slash command.
   - File: `dotfiles/pi/.pi/agent/packages/general-dev-suite/extensions/task-graph/index.ts`
   - Changes:
     - In the `task_graph_settings` tool, replace the current `Graphs: name1, name2` line with the shared detailed renderer output, while preserving useful non-graph summary lines for agent instruction selectors and routing overrides.
     - Keep the tool details payload unchanged (`{ settings: settingsInfo }`).
   - Acceptance: `task_graph_settings` still validates settings and now reports graph descriptions/stages, not only graph names.

4. **Add focused formatter/settings validation coverage**: Extend the standalone validation script to cover graph listing behavior.
   - File: `dotfiles/pi/.pi/agent/packages/general-dev-suite/extensions/task-graph/settings.validation.ts`
   - Changes:
     - Import the new renderer from `./settings`.
     - Add a graph description to the existing valid `smoke` graph and assert it is preserved.
     - Add a `customGraphs` validation case to assert custom graph templates merge into `settings.graphs` and duplicate names still throw.
     - Build a fake loaded `ProjectTaskGraphSettingsInfo` for the valid settings, call the renderer, and assert the output includes:
       - the graph name (`smoke`),
       - the graph description,
       - stage ids and kinds (`impl`, `IMPLEMENT`, `test`, `UNIT_TEST`),
       - dependency information (`test` depends on `impl`),
       - `task_graph_create`, and
       - `customGraph: "smoke"` or the equivalent safely quoted JSON snippet.
     - Add renderer assertions for `loaded: false` and for loaded settings with no graphs.
   - Acceptance: The validation script prints `task graph settings validation passed` after the new assertions.

5. **Update documentation**: Document the slash command and richer settings inspection behavior.
   - File: `dotfiles/pi/.pi/agent/packages/general-dev-suite/README.md`
   - Changes:
     - In "Task graph workflow", add `/task-graphs` to the list of task graph UI/inspection commands.
     - In "Project-local task graph settings", mention that `/task-graphs` lists available custom templates from `graphs`/`customGraphs`, including stages and creation examples.
     - Keep the existing `task_graph_create({ mode: "custom", input, options: { customGraph: "name" } })` guidance, but make it clear `/task-graphs` helps discover valid names.
   - Acceptance: README users can discover the command and know how to create a custom graph run.

6. **Run focused validation**: Execute the lightweight settings validation and, if available, a focused TypeScript syntax/type check.
   - File: package root `dotfiles/pi/.pi/agent/packages/general-dev-suite`
   - Commands:
     - `cd /home/tay/src/dotfiles/pi/.pi/agent/packages/general-dev-suite && npx --yes tsx extensions/task-graph/settings.validation.ts`
     - If TypeScript tooling is available: `cd /home/tay/src/dotfiles/pi/.pi/agent/packages/general-dev-suite && npx --yes -p typescript -p @types/node tsc --noEmit --module commonjs --target ES2022 --moduleResolution node --types node --skipLibCheck extensions/task-graph/settings.validation.ts`
   - Acceptance: Validation exits 0. If `npx`/network/tooling is unavailable, record that as an environment limitation and at least ensure the standalone validation script is updated coherently.

7. **Manual slash-command smoke check**: Verify the command behavior in Pi after implementation.
   - File: any disposable project with `.pi/dev-suite/task-graph/settings.json`
   - Changes: No committed changes required; create or use a temporary settings file with one custom graph.
   - Acceptance: Running `/task-graphs` shows the graph name, description, stages, and `task_graph_create` example; running it in a project without settings shows the no-settings guidance.

## Files to Modify
- `dotfiles/pi/.pi/agent/packages/general-dev-suite/extensions/task-graph/settings.ts` - add the reusable custom graph template renderer.
- `dotfiles/pi/.pi/agent/packages/general-dev-suite/extensions/task-graph/index.ts` - register `/task-graphs` and reuse the renderer in `task_graph_settings`.
- `dotfiles/pi/.pi/agent/packages/general-dev-suite/extensions/task-graph/settings.validation.ts` - add focused assertions for `customGraphs` merging and renderer output.
- `dotfiles/pi/.pi/agent/packages/general-dev-suite/README.md` - document `/task-graphs` and custom graph discovery.

## New Files
- None.

## Dependencies
- Task 2 depends on Task 1 because the command should use the shared renderer.
- Task 3 depends on Task 1 for shared formatting.
- Task 4 depends on Task 1 so the formatter can be tested directly.
- Task 5 can run in parallel with Tasks 1-4 after the expected command/output shape is agreed.
- Tasks 6-7 depend on implementation and docs updates being complete.

## Risks
- The package does not expose an obvious npm test/build script; validation may rely on `npx tsx` or locally available TypeScript tooling.
- Slash command argument parsing is not documented in this package; supporting an optional settings path should stay simple and must still enforce `loadProjectSettings` project-local path checks.
- Very large graph settings could produce a long UI notification; avoid printing `promptInstructions` bodies to reduce noise and accidental sensitive-content exposure.
- `graphs` and `customGraphs` are merged during validation; duplicate-name behavior must remain unchanged.
- If the desired output format for `/task-graphs` must be machine-readable rather than human-readable, that is an open product decision; current plan assumes a human-readable UI notification because existing slash commands use `ctx.ui.notify`.
