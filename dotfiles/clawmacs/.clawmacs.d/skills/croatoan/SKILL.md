---
name: croatoan
description: "Use when users want to build, extend, or debug Common Lisp terminal applications with Croatoan: screens, windows, event loops, key bindings, forms, menus, dialogs, layouts, colors, mouse/resize handling, or SLIME-safe terminal workflows."
---

# Build Terminal Applications with Croatoan

## Goal

After applying this skill, the Clawmacs agent should reliably build working terminal UIs with **Croatoan** instead of treating it as just a thin ncurses wrapper or producing generic TUI advice that ignores Croatoan's actual CLOS/event-loop model.

Use Croatoan's own architecture as the primary guide:
- `with-screen` and window lifecycle
- event loops and bindings
- forms / menus / dialogs / layouts
- terminal-thread safety
- Croatoan's higher-level CLOS API over ncurses

## Triggers

Use this skill when the user wants to:
- build a Common Lisp TUI with Croatoan
- understand what Croatoan supports
- choose between windows, panels, pads, forms, menus, dialogs, or layouts
- wire key bindings, event loops, mouse handling, resize handling, or refresh logic
- integrate Croatoan with SLIME/swank safely
- use Croatoan rather than raw ncurses bindings

Do **not** use this skill for:
- unrelated terminal libraries with no Croatoan angle
- generic Common Lisp questions with no TUI/terminal UI angle
- raw ncurses/C FFI work unless the user explicitly wants to drop below Croatoan's higher-level API

## Core stance

Croatoan is not just "ncurses from Lisp".
It gives you a more Lisp/CLOS-centric terminal UI model with:
- objects for screens/windows/widgets
- event-driven interaction
- higher-level forms/menus/dialogs/layout helpers
- queue-based thread handoff for SLIME/swank work

Prefer Croatoan's higher-level abstractions first.
Only drop lower when the task truly requires it.

## Optional local resources

### Source checkout
- `~/external_src/croatoan`

### Docs snapshot
- `~/external_docs/croatoan`

High-value docs:
- `~/external_docs/croatoan/README.org`
- `~/external_docs/croatoan/slime.md`
- `~/external_docs/croatoan/SUMMARY.md`
- `~/external_docs/croatoan/CHANGELOG.org`

Important source files:
- `~/external_src/croatoan/src/croatoan.lisp`
- `~/external_src/croatoan/src/package.lisp`
- `~/external_src/croatoan/src/form.lisp`
- `~/external_src/croatoan/src/grid.lisp`
- `~/external_src/croatoan/src/dropdown.lisp`
- `~/external_src/croatoan/src/slk.lisp`

Sidecars:
- `references/building-with-croatoan.md`
- `references/full-feature-map.md`
- `references/api-quick-index.md`
- `references/source-module-map.md`
- `references/eval-plan.md`
- `examples/minimal-screen.lisp`
- `examples/form-menu-app.lisp`
- `examples/slime-safe-loop.lisp`

## Quick workflow

1. Classify the TUI you are building.
2. Check the full Croatoan feature map so the answer covers the actual library surface.
3. Use the API quick index when the user mainly needs fast API routing.
4. Use the source-module map when sparse prose docs are not enough.
5. Choose the main interaction model.
6. Start from Croatoan's real entry points: `with-screen`, windows, bindings, event loop.
7. Build the screen/window structure before adding behavior.
8. Use forms/menus/dialogs/layout helpers when the app is structured, not ad hoc.
9. Handle refresh, resize, mouse, and scrolling deliberately.
10. Respect Croatoan's terminal-thread rule, especially under SLIME/swank.
11. Keep Croatoan-high-level guidance separate from raw ncurses escape hatches.

## Procedure

### 1) Classify the terminal app

Put the task into one or more buckets:
- **single-screen tool** — one screen, direct keybindings, basic drawing/output
- **windowed TUI** — multiple windows/subwindows/panels
- **form/data-entry app** — fields, buttons, checkboxes, textareas, dropdowns
- **menu/list/grid app** — menus, checklists, grid/layout navigation
- **drawing/visual terminal app** — borders, shapes, styled strings, colors
- **scrolling/log viewer** — pads, scrolling, refresh control
- **interactive REPL/dev workflow** — SLIME/swank-safe terminal thread handoff

If the request spans multiple buckets, choose the primary interaction model first, then layer the others in.

### 2) Check minimum library coverage

Before narrowing to a common workflow, consult:
- `references/full-feature-map.md`

Use it whenever the user asks broad questions like:
- what Croatoan can do
- whether Croatoan has a feature
- which Croatoan subsystems matter for a design
- whether the right level is Croatoan high-level API, low-level ncurses bindings, or ANSI escape

At minimum, this skill should be able to range across:
- screen/window lifecycle
- event loops, bindings, keymaps
- windows, panels, pads, stacks, movement, resize, refresh
- forms, fields, buttons, checkboxes, menus, dropdowns, dialogs
- layouts and grids
- colors, styles, borders, shapes, text utilities
- keyboard, mouse, resize, idle handling
- soft labels
- queues/thread handoff/SLIME-safe interaction
- low-level `ncurses` and `ansi-escape` escape hatches
- fast API routing by exported symbol family
- source-module routing for deeper questions where prose docs are sparse

### 3) Use the API quick index for fast routing

Consult:
- `references/api-quick-index.md`

Use it when the user mainly needs:
- the fastest route to the right Croatoan API
- a compact “what API should I use for X?” answer
- a quick exported-surface routing layer before deeper source reading

### 4) Use the source-module map for deeper questions

Consult:
- `references/source-module-map.md`

Use it when:
- the prose docs are too thin
- the question is really about object model, module boundaries, or implementation behavior
- you need to know whether to read `classes.lisp`, `form.lisp`, `grid.lisp`, `textarea.lisp`, `dropdown.lisp`, or `slk.lisp`

### 5) Choose the main interaction model

#### Use `with-screen` + direct bindings when:
- the app is small and keyboard-driven
- one main terminal surface is enough
- the UI is best expressed as direct event handling

Core forms:
- `with-screen`
- `bind`
- `event-case`
- `run-event-loop`
- `exit-event-loop`

#### Use windows/panels when:
- the app has multiple regions or stacked views
- separate refresh or visibility control matters
- you need subwindows, panels, or stack operations

Core objects:
- `window`, `screen`, `sub-window`, `panel`, `pad`, `sub-pad`
- stack helpers such as `stack-push`, `stack-pop`, `stack-move`

#### Use forms/widgets when:
- the app is data-entry heavy
- fields, buttons, checkboxes, textareas, or dropdowns are the natural model

Core objects/forms:
- `form`, `form-window`, `field`, `button`, `checkbox`, `textarea`, `dropdown`
- `accept`, `cancel`, `edit`, `return-form-values`, `reset-form`

#### Use menus/checklists/layouts when:
- the app is list-driven, menu-driven, or grid-driven
- selection/navigation is central

Core objects:
- `menu`, `checklist`, `menu-window`, `menu-item`
- `grid`, `layout`, `row-layout`, `column-layout`
- `select-previous-item`, `select-next-item`, `calculate-layout`

#### Use drawing/styled-output when:
- the app is visually rich within terminal constraints
- borders, styled text, shapes, colors, or custom drawing matter

Core forms/functions:
- `add-string`, `add-char`, `put-string`
- `draw-border`, `draw-wide-border`, `draw-rectangle`, `draw-line`, `draw-shape`
- color/style helpers such as `color-pair`, `add-attributes`, `complex-string-format`

#### Use queue/thread handoff when:
- the app is being driven from SLIME/swank or another non-terminal thread
- you must safely schedule terminal work onto the screen-owning thread

Core forms/functions:
- `submit`
- `process`
- `queue`
- `run-event-loop`

### 6) Start from Croatoan's actual entry points

For most applications, the safe initial skeleton is:
- package definition
- `ql:quickload :croatoan`
- `with-screen`
- a screen-local setup block
- bindings or an event loop
- explicit refresh/clear behavior
- quit path via `exit-event-loop`

Do not begin with raw ncurses assumptions unless the user explicitly asks for low-level work.

### 7) Build the screen/window structure first

Common structure decisions:
- one screen only for simple apps
- screen + multiple windows for segmented UIs
- panels for stacked/overlapping views
- pads for large scrollable regions
- form-window for decorated data-entry experiences

Define the visual regions and lifecycle first, then attach interaction.

### 8) Prefer Croatoan widgets over ad hoc terminal spaghetti

If the user wants:
- forms → use `form`, `field`, `button`, `checkbox`, `textarea`, `dropdown`
- menu-driven selection → use `menu`, `checklist`, `menu-window`
- layout/grid arrangement → use `grid`, `row-layout`, `column-layout`

Do not hand-roll everything with cursor movement and manual string output when Croatoan already has a higher-level construct.

### 9) Handle events deliberately

Croatoan is event-oriented.
Use:
- `bind` for direct key/event hookups
- `define-keymap` / keymaps when the interaction grows
- `event-case` for explicit event loops
- idle handling carefully when `input-blocking` is disabled
- resize and mouse events as first-class concerns when relevant

If the app will idle, animate, poll, or process queued work, think about `input-blocking` and how `process` gets a chance to run.

### 10) Respect redraw/refresh/resize mechanics

For anything nontrivial, think about:
- `refresh`
- `mark-for-refresh`
- `mark-for-redraw`
- `touch`
- `clear`
- `resize`
- scrolling/pads

Do not assume terminal drawing is magically persistent.
Make redraw strategy explicit.

### 11) Use styling and drawing as terminal-native tools

Croatoan supports more than plain text:
- attributes and color pairs
- complex characters / complex strings
- borders and wide borders
- shapes and plotted geometry
- background control
- text helpers like wrapping and ellipsizing

When the UI needs emphasis or structure, use these instead of inventing brittle ASCII hacks.

### 12) Keep thread safety front and center

Croatoan's ncurses interaction must stay on the thread that initialized the screen.
This is especially important under SLIME/swank.

If the user is developing interactively from Emacs, consult:
- `~/external_docs/croatoan/slime.md`

Use `submit` to move terminal work onto the terminal thread.
Do not advise direct ncurses IO from arbitrary threads.

### 13) Know the escape hatches

Croatoan exposes a layered model:
- `croatoan` / `crt` — high-level API
- `croatoan-ncurses` / `ncurses` — low-level bindings
- `ansi-escape` / `esc` — ANSI escape support

Prefer the high-level API unless there is a concrete reason to drop lower.
If you do drop lower, say so explicitly.

## Output contract

When using this skill successfully, return:
1. the Croatoan app style or interaction model chosen
2. the screen/window/panel/form/menu/layout architecture you recommend or implemented
3. the Croatoan mechanisms being used
4. the Croatoan docs and source files consulted
5. the API/source-module areas consulted when the request is broad or implementation-heavy
6. the distinction between high-level Croatoan guidance and lower-level escape hatches
7. code or edits oriented toward a working Croatoan application
8. thread-safety guidance if SLIME/swank or background threads are involved

## Quality checks

- [ ] the answer is about **building with Croatoan**, not generic ncurses folklore
- [ ] the skill can range across the **full Croatoan feature surface** when the request is broad
- [ ] the skill can route quickly via exported API families and source modules when needed
- [ ] `with-screen` / lifecycle setup is handled coherently
- [ ] the chosen interaction model matches the app
- [ ] higher-level Croatoan constructs are preferred over raw terminal micromanagement when appropriate
- [ ] refresh/resize/input behavior is not hand-waved away
- [ ] thread-safety is treated correctly for SLIME/swank or multi-threaded situations
- [ ] low-level `ncurses` / `ansi-escape` usage is kept clearly separate from normal Croatoan guidance

## Failure handling

### Missing local references
- Check `~/external_src/croatoan`
- Check `~/external_docs/croatoan`
- If missing, say so explicitly instead of inventing Croatoan-specific behavior

### User asks broadly what Croatoan supports
- consult `references/full-feature-map.md`
- consult `references/api-quick-index.md`
- consult `references/source-module-map.md`
- answer across the full library surface, not just the basic screen API

### User starts writing raw ncurses-style code in Croatoan
- steer back toward Croatoan's higher-level objects and helpers unless low-level control is explicitly needed

### SLIME/swank confusion
- point out the terminal-thread rule
- use `submit`/queue-based handoff
- reference `~/external_docs/croatoan/slime.md`

### Refresh glitches or invisible updates
- re-check redraw/refresh/touch/clear strategy
- consider whether pads, panels, or stacked windows are the better fit

### Overlap with other terminal libraries
- if the request is actually about another Lisp TUI library, say so and stop pretending it is Croatoan
