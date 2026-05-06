# Croatoan API Quick Index

Use this file when the user asks “which Croatoan API should I use for X?” or when you need the fastest route through the exported surface.

Primary source for this index:
- `~/external_src/croatoan/src/package.lisp`

## Fast routing by task

### Start and own the terminal
Use:
- `with-screen`
- `with-window`
- `with-windows`
- `screen`
- `end-screen`

When:
- bootstrapping any Croatoan app
- owning terminal lifecycle correctly

### Run an event-driven app
Use:
- `bind`
- `unbind`
- `event-case`
- `run-event-loop`
- `exit-event-loop`
- `define-keymap`
- `find-keymap`
- hooks like `before-event-hook`, `after-event-hook`

When:
- wiring keyboard/mouse/idle interactions
- building anything larger than a static screen

### Read keyboard and input events
Use:
- `get-char`, `unget-char`
- `get-wide-char`, `get-wide-event`, `wait-for-event`
- `get-string`
- `get-event`
- `key-*` helpers such as `key-name`, `key-code`, `key-supported-p`

When:
- handling plain input directly
- decoding key/function-key behavior

### Work with mouse events
Use:
- `mouse-event`
- `get-mouse-event`
- `set-mouse-event`
- `event-key`, `event-code`, `event-modifiers`, `event-position`

When:
- the TUI needs pointer-like interaction

### Build regioned UIs with windows and pads
Use:
- `window`, `sub-window`
- `panel`
- `pad`, `sub-pad`
- `move-window`, `resize`, `scroll`
- panel stack helpers: `stack-push`, `stack-pop`, `stack-move`

When:
- splitting the screen into regions
- layering/overlapping views
- handling large scrollable content

### Draw and print to the terminal
Use:
- `add`, `add-char`, `add-string`
- `put`, `put-char`, `put-string`
- `echo`, `echo-char`
- `new-line`

When:
- printing ordinary or styled text
- building output-heavy screens

### Style output
Use:
- `attributes`
- `color-pair`, `default-color-pair`
- `fgcolor`, `bgcolor`
- `add-attributes`, `remove-attributes`, `change-attributes`
- `complex-char`, `complex-string`, `complex-string-format`

When:
- making the terminal UI visually legible and expressive

### Draw boxes and shapes
Use:
- `draw-border`, `draw-wide-border`
- `draw-rectangle`, `draw-hline`, `draw-vline`
- `draw-shape`, `draw-line`
- geometry builders: `line`, `polygon`, `triangle`, `rectangle`, `circle`

When:
- creating structured terminal visuals
- adding borders, separators, geometric shapes

### Force redraw and refresh correctly
Use:
- `refresh`
- `refresh-marked`
- `mark-for-refresh`
- `mark-for-redraw`
- `touch`
- `clear`, `fill-rectangle`, `clear-rectangle`

When:
- fixing invisible updates
- making redraw strategy explicit

### Build forms and widgets
Use:
- `form`, `form-window`
- `field`, `button`, `checkbox`, `textarea`, `dropdown`
- `accept`, `cancel`, `edit`
- `find-element`, `return-element-value`, `return-form-values`, `reset`, `reset-form`

When:
- building data-entry UIs and structured controls

### Build menus and checklists
Use:
- `menu`, `checklist`, `menu-window`, `menu-item`
- `draw-menu`, `update-menu`, `select`
- `accept-selection`, `toggle-item-checkbox`, `return-from-menu`, `exit-menu-event-loop`

When:
- building list-driven selection UIs

### Build layouts and grids
Use:
- `grid`
- `layout`, `row-layout`, `column-layout`
- `calculate-layout`, `initialize-leaves`, `flatten-items`
- navigation helpers: `move-up`, `move-down`, `move-left`, `move-right`

When:
- structuring multi-row/multi-column terminal layouts

### Queue work onto the terminal thread
Use:
- `submit`
- `process`
- `queue`, `simple-queue`
- `enqueue`, `dequeue`
- `job-error`

When:
- running from SLIME/swank
- crossing threads safely

### Use dialog helpers
Use separate package:
- `dialog` / nickname `dlg`
- `msgbox`, `menubox`, `checklist`, `inputbox`

When:
- building simple dialog windows quickly

### Use soft labels
Use separate package:
- `soft-labels` / nickname `slk`
- `initialize`, `label`, `refresh`, `clear`, `restore`

When:
- terminal soft function-key labels matter

### Drop lower only when necessary
Use:
- high-level package: `croatoan` / `crt`
- low-level package: `croatoan-ncurses` / `ncurses`
- ANSI package: `ansi-escape` / `esc`

When:
- the high-level API is insufficient

## Decision table

| Need | Start with |
|---|---|
| Small keyboard TUI | `with-screen`, `bind`, `run-event-loop` |
| Multi-pane terminal app | `window` / `panel` / `pad` |
| Form entry | `form`, `field`, `button`, `textarea` |
| Menu/list UI | `menu`, `checklist`, `menu-window` |
| Structured layout | `grid`, `row-layout`, `column-layout` |
| Fancy terminal visuals | styling + border/shape API |
| Mouse-aware interaction | mouse event API |
| Safe SLIME interaction | `submit`, `process`, queue API |
