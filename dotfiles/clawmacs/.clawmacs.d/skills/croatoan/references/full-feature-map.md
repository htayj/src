# Full Croatoan Feature Map

This file exists so the skill covers the Croatoan library as a minimum, not just the most obvious `with-screen` examples.

Use it when the user asks:
- what Croatoan supports,
- whether Croatoan has a capability,
- what parts of the library matter for a design,
- which layer to use: high-level Croatoan, low-level ncurses, or ANSI escape.

---

## 1. Systems and packages

From the project README:

### High-level CLOS API
- system: `croatoan`
- package: `croatoan`
- nickname: `crt`

### Low-level ncurses bindings
- system: `croatoan-ncurses`
- package: `ncurses`

### ANSI X3.64 escape support
- system: `ansi-escape`
- package: `ansi-escape`
- nickname: `esc`

Builder significance:
- prefer `croatoan`/`crt` first
- use `ncurses` or `esc` only when there is a concrete reason

---

## 2. Screen and window lifecycle

Core exported entry points:
- `with-screen`
- `with-window`
- `with-windows`
- `screen`
- `window`
- `sub-window`
- `panel`
- `pad`
- `sub-pad`
- `end-screen`
- `close`

Builder significance:
- every app starts with screen ownership and window structure
- this is the backbone of a Croatoan app

---

## 3. Event loops, keymaps, and bindings

Core exports:
- `event-case`
- `keymap`
- `define-keymap`
- `find-keymap`
- `run-event-loop`
- `exit-event-loop`
- `bind`
- `unbind`
- hooks like `before-event-hook`, `after-event-hook`

Builder significance:
- Croatoan is event-driven, not just a terminal drawing helper
- this is the central interaction surface for keyboard/mouse/idle flows

---

## 4. Keys, keyboard input, and event decoding

Core exports include:
- `key`, `make-key`, `copy-key`
- `key-name`, `key-ctrl`, `key-alt`, `key-shift`
- `get-char`, `unget-char`
- `get-event`, `get-wide-event`, `wait-for-event`
- `get-string`
- key conversion helpers (`key-code-to-name`, `key-name-to-code`, etc.)

Builder significance:
- keyboard-heavy TUIs
- function-key and modifier-aware handling
- wide-char and Unicode input

---

## 5. Mouse and pointer-like input

Core exports:
- `mouse-event`
- `get-mouse-event`
- `set-mouse-event`
- `event-position`
- `event-modifiers`

Builder significance:
- clickable/selectable terminal interfaces
- pointer-aware menus and region interactions

---

## 6. Windows, panels, stacks, and movement

Core exports:
- `move`
- `goto`
- `move-window`
- `resize`
- `scroll`
- panel stack helpers like `stack`, `stack-push`, `stack-pop`, `stack-move`
- visibility/stacking accessors like `stackedp`, `visiblep`

Builder significance:
- multi-region and layered terminal UIs
- popup/overlay style interfaces
- resizing and moving windows explicitly

---

## 7. Refresh and redraw control

Core exports:
- `refresh`
- `refresh-marked`
- `mark-for-refresh`
- `mark-for-redraw`
- `touch`
- `clear`
- `fill-rectangle`
- `clear-rectangle`

Builder significance:
- redraw bugs and flicker control
- partial updates versus full redraws
- making invisible state changes appear on screen

---

## 8. Colors, attributes, backgrounds, and styled text

Core exports/features:
- `attributes`
- `color-pair`
- `fgcolor`, `bgcolor`
- `default-color-pair`
- attribute helpers like `add-attributes`, `remove-attributes`, `change-attributes`
- `complex-char`
- `complex-string`
- `complex-string-format`
- text utility functions

Builder significance:
- rich styling in terminal UIs
- reusable visual language without raw escape spaghetti

---

## 9. Drawing and shape support

Core exports:
- `draw-border`
- `draw-wide-border`
- `draw-rectangle`
- `draw-hline`
- `draw-vline`
- `draw-shape`
- `draw-line`
- `line`, `angle-line`, `polygon`, `triangle`, `quadrilateral`, `rectangle`, `circle`

Builder significance:
- visual terminal apps
- structured geometry, separators, boxes, and plotted shapes

---

## 10. Text output and text manipulation

Core exports:
- `add`, `add-char`, `echo`, `put`, `put-string`, `add-string`
- newline/cursor helpers
- text-width/wrap/slice/ellipsize/padding helpers

Builder significance:
- status panes, log windows, editors, dashboards, line-wrapped reports

---

## 11. Menus, checklists, and selection widgets

Core objects/exports:
- `menu`
- `checklist`
- `menu-window`
- `menu-item`
- `draw-menu`
- `update-menu`
- `select`
- `return-from-menu`
- `accept-selection`
- `toggle-item-checkbox`

Builder significance:
- list selection UIs
- choice-driven terminal apps
- embedded menus inside larger terminal interfaces

---

## 12. Forms, fields, buttons, checkboxes, textareas, dropdowns

Core objects/exports:
- `form`
- `form-window`
- `field`
- `button`
- `checkbox`
- `textarea`
- `dropdown`
- `find-element`
- `accept`, `cancel`
- `edit`
- `return-element-value`, `return-form-values`
- `reset`, `reset-form`

Builder significance:
- structured data entry
- terminal control panels
- settings dialogs and multi-field workflows

---

## 13. Layouts and grids

Core objects/exports:
- `grid`
- `layout`
- `row-layout`
- `column-layout`
- `calculate-layout`
- `initialize-leaves`
- `flatten-items`
- movement helpers like `move-up`, `move-down`, `move-left`, `move-right`

Builder significance:
- multi-row/multi-column terminal arrangements
- compositional terminal layout instead of coordinate chaos

---

## 14. Dialog helpers

Separate package in source:
- `dialog` / nickname `dlg`

Exports:
- `msgbox`
- `menubox`
- `checklist`
- `inputbox`

Builder significance:
- modal/semi-modal prompts
- fast interaction building blocks

---

## 15. Soft labels

Separate package in source:
- `soft-labels` / nickname `slk`

Exports include:
- `initialize`
- `label`
- `refresh`
- `mark-for-refresh`
- `touch`
- `clear`
- `restore`
- attribute and color-pair functions

Builder significance:
- function-key label lines or bottom-line affordances where the terminal/backend supports them

---

## 16. Queue and thread handoff

Core exports:
- `submit`
- `process`
- `queue`
- `simple-queue`
- `enqueue`
- `dequeue`
- `job-error`

Builder significance:
- safely getting terminal work onto the screen-owning thread
- essential for SLIME/swank workflows described in `slime.md`

---

## 17. Utility layer

Core exports include utilities for:
- strings, lines, wrapping
- color-pair conversion
- control-char detection
- plist pairing/unpairing
- width calculations

Builder significance:
- avoid reimplementing terminal text helpers badly

---

## 18. Threading / SLIME caveat

From project docs:
- ncurses is single-threaded
- terminal IO must occur in the thread that initialized the screen
- Croatoan provides queue-based handoff via `submit`

Builder significance:
- this is not optional implementation trivia; it affects how you architect dev workflows and interactive tooling

---

## Required minimum policy for this skill

When the user asks broadly what Croatoan has or what it can do, the answer must be able to range across:
- screen/window lifecycle
- events and bindings
- windows/panels/pads
- forms/menus/dialogs/dropdowns
- layouts/grids
- styling/drawing/colors
- mouse/resize/input handling
- thread-handoff/SLIME constraints
- soft labels
- the lower-level `ncurses` and `ansi-escape` layers

Do not collapse Croatoan into just:
- `with-screen`
- `add-string`
- a few key bindings

That is only the shallow end of the library.
