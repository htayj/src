# Building with Croatoan

This file is the practical companion to the main skill.
Use it when the question is not merely "what is Croatoan?" but "how should I actually structure the TUI?"

For full minimum coverage of the library surface, pair this file with:
- `references/full-feature-map.md`

## What Croatoan gives you in practice

### 1. Screen lifecycle and main entry point

Croatoan's main entry point is not a bag of random functions; it starts with screen ownership.

Core forms:
- `with-screen`
- `end-screen`
- `clear`

Use when:
- starting any real Croatoan app
- setting screen-wide input/echo/color/newline options
- ensuring ncurses exits cleanly on failure

Practical rule:
- begin with `with-screen`
- do not start by scattering raw terminal calls throughout top-level code

### 2. Event loops and direct key bindings

Croatoan supports both direct key binding and explicit event-loop style.

Core forms/functions:
- `bind`
- `unbind`
- `event-case`
- `run-event-loop`
- `exit-event-loop`
- `define-keymap`

Use when:
- the application is keyboard-driven
- you want specific reactions to keys, resize events, mouse events, or idle time

Practical rule:
- for small apps, direct `bind` can be enough
- for bigger apps, explicit event handling or keymaps becomes easier to reason about

### 3. Windows, subwindows, panels, and pads

Croatoan exposes multiple terminal-region abstractions.

Core objects:
- `window`
- `sub-window`
- `panel`
- `pad`
- `sub-pad`

Related helpers:
- `refresh`
- `mark-for-refresh`
- `mark-for-redraw`
- `touch`
- `move-window`
- `resize`
- stack helpers for panel ordering

Use when:
- the app has multiple regions
- views overlap or need stacking
- the content is larger than the visible area and needs pad-based scrolling

Practical rule:
- use plain windows for most region-based UIs
- use panels for overlapping/stacked screens
- use pads for scroll-heavy views or big buffers

### 4. Forms and terminal widgets

Croatoan is stronger than plain ncurses on structured input.

Core objects/forms:
- `form`
- `form-window`
- `field`
- `button`
- `checkbox`
- `textarea`
- `dropdown`

Related helpers:
- `accept`
- `cancel`
- `edit`
- `return-form-values`
- `reset-form`
- `find-element`

Use when:
- the UI is data-entry heavy
- you need labeled controls instead of raw coordinate-driven input

Practical rule:
- if the app looks like a terminal form, use Croatoan's form objects rather than hand-rolling all cursor logic yourself

### 5. Menus, checklists, and selection UIs

Core objects:
- `menu`
- `checklist`
- `menu-window`
- `menu-item`

Related helpers:
- `draw-menu`
- `update-menu`
- `select`
- `toggle-item-checkbox`
- `accept-selection`

Use when:
- the app is choice-driven
- list navigation and selection are central

Practical rule:
- use menu/checklist abstractions for selectable lists instead of modeling everything as bare key handling

### 6. Layouts and grid-based arrangement

Core objects/functions:
- `grid`
- `layout`
- `row-layout`
- `column-layout`
- `calculate-layout`
- `initialize-leaves`
- `flatten-items`

Use when:
- a form or menu has a structured multi-row/multi-column arrangement
- you want terminal layout logic to be explicit instead of ad hoc arithmetic

Practical rule:
- when your UI has rows/columns or nested regions, use layout objects instead of scattering width/height math everywhere

### 7. Styled output and drawing

Croatoan supports richer terminal output than plain strings.

Core functions/features:
- `add-string`, `put-string`, `add-char`
- `draw-border`, `draw-wide-border`, `draw-rectangle`, `draw-hline`, `draw-vline`
- `draw-shape`, `draw-line`, `circle`, `rectangle`, `polygon`
- `complex-char`, `complex-string`, `complex-string-format`
- attribute and color-pair helpers

Use when:
- the UI needs emphasis, structure, borders, colors, line drawing, or terminal geometry

Practical rule:
- use Croatoan's styling and drawing helpers before inventing brittle manual formatting hacks

### 8. Input, mouse, resize, and idle handling

Core functions/types:
- `get-event`, `get-wide-event`, `wait-for-event`
- `event`, `mouse-event`
- `event-key`, `event-code`, `event-position`, `event-modifiers`
- `get-mouse-event`
- resize handling through events/bindings

Use when:
- the app responds to more than plain keyboard characters
- pointer support or resize support matters
- idle processing matters in non-blocking mode

Practical rule:
- decide early whether the program is blocking or non-blocking, because idle behavior and queue processing depend on that

### 9. Thread handoff and SLIME/swank workflow

Croatoan has a specific answer to the "SLIME runs in another thread" problem.

Core functions:
- `submit`
- `process`
- queue helpers

Docs:
- `~/external_docs/croatoan/slime.md`

Use when:
- interacting with the TUI from SLIME/swank
- routing UI work back to the terminal-owning thread

Practical rule:
- never tell people to do arbitrary ncurses UI IO from the wrong thread
- use `submit`

### 10. Soft labels and related terminal affordances

Croatoan also exposes soft label support in the separate package:
- `soft-labels` / nickname `slk`

Use when:
- F-key label lines or terminal bottom-line affordances matter

### 11. Escape hatches: low-level ncurses and ANSI escape

Croatoan includes related systems/packages:
- high-level: `croatoan` / `crt`
- low-level: `croatoan-ncurses` / `ncurses`
- ANSI escape: `ansi-escape` / `esc`

Use when:
- you truly need lower-level control
- the higher-level API is missing a capability

Practical rule:
- prefer the high-level package first
- explicitly mark when advice drops to `ncurses` or `esc`

## Design decision table

| If you need... | Start with... | Then add... |
|---|---|---|
| A simple keyboard-driven app | `with-screen` + `bind` | `run-event-loop`, styled output |
| A multi-region TUI | screen + windows | panels/subwindows, refresh strategy |
| A data-entry interface | `form` / `form-window` | fields, buttons, checkboxes, textarea |
| A choice/list interface | `menu` or `checklist` | selection callbacks, menus in windows |
| A structured terminal layout | `row-layout` / `column-layout` | grids, initialized leaves, forms |
| A scroll-heavy view | windows or pads | explicit scroll + refresh logic |
| Interactive development from SLIME | `with-screen` + `run-event-loop` | `submit`, queue/process, nonblocking input |
| Fancy terminal visuals | styled strings + borders | shapes, wide borders, color pairs |

## Common anti-patterns

### Anti-pattern: write raw ncurses-shaped code everywhere
Better:
- start from Croatoan's screen/window/widget abstractions

### Anti-pattern: ignore refresh/redraw strategy
Better:
- make redraw, mark-for-refresh, touch, and resize behavior explicit

### Anti-pattern: hand-roll forms with cursor arithmetic
Better:
- use Croatoan forms, fields, buttons, textareas, checkboxes, dropdowns

### Anti-pattern: ignore the thread model under SLIME
Better:
- use `submit` and respect the terminal thread

### Anti-pattern: use high-level and low-level APIs without saying which is which
Better:
- state clearly whether the code is using `croatoan`, `ncurses`, or `ansi-escape`
