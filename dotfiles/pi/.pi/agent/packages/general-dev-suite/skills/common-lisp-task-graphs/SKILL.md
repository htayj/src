---
name: common-lisp-task-graphs
description: Use when planning or running Pi task graphs for Common Lisp work, especially ASDF systems, packages, SBCL load/compile/test validation, FiveAM tests, CLIM/McCLIM, or terminal UI visible-behavior changes.
---
# Common Lisp Task Graphs

Use the packaged task graph presets before inventing an ad-hoc workflow for Common Lisp projects.

## ASDF/library/API work

Create an ASDF-focused custom graph when the request involves systems, packages, exports, public API behavior, library internals, SBCL compilation/loading, or test-system/FiveAM validation:

```ts
task_graph_create({
  mode: "custom",
  input: "<Common Lisp ASDF task>",
  options: { customGraph: "common-lisp-asdf" },
});
```

The graph stages are: discover project shape, define package/API contract, implement, compile/load, test, and review.

Guidance:
- Prefer discovered project commands from README, CI, Makefile, scripts, `.asd` files, or existing docs.
- Fall back to SBCL/ASDF examples only when no project command is discoverable.
- Keep ASDF components, package definitions, exported symbols, docs, and tests synchronized.
- Treat `asdf:test-system` and FiveAM failures as validation evidence, not optional cleanup.

## CLIM/McCLIM/TUI visible behavior work

Create the CLIM/TUI preset when the request involves CLIM, McCLIM, terminal UI, curses-like UI, panes, commands, presentations, redisplay, render loops, or user-visible terminal/screen behavior:

```ts
task_graph_create({
  mode: "custom",
  input: "<Common Lisp UI task>",
  options: { customGraph: "common-lisp-clim-tui" },
});
```

The graph stages are: discover UI entrypoints, state the visible behavior invariant, implement, compile/load, test, validate visible behavior, and review.

Guidance:
- Identify the launch path and framework before editing.
- For CLIM/McCLIM, prefer frame, pane, command, presentation, accept, and redisplay mechanisms over private render loops.
- For terminal UIs, preserve state/update/render boundaries where they exist.
- Use existing UI tests first; otherwise capture the safest available visible evidence such as screenshots, logs, tmux/script/pty output, or documented smoke results.

## Settings and safety

- `/task-graphs` and `task_graph_settings` list packaged presets with source and create hints without dumping hidden prompt instructions.
- Project/global custom graphs can override packaged preset names.
- Disable a packaged preset with `disabledGraphs: ["custom:<name>"]` or remove only the packaged copy with `disabledPackagedGraphs`.
- Do not put secrets, local credentials, private keys, cookies, `.env` values, or production data in task graph settings or artifacts.
