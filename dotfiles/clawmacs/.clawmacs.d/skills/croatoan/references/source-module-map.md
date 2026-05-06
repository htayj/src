# Croatoan Source Module Map

Use this file when Croatoan's sparse prose docs are not enough and you need to route through the source tree.

Primary source root:
- `~/external_src/croatoan/src/`

## Key source modules

### `package.lisp`
Use for:
- exported API surface
- package boundaries
- `croatoan` / `crt`, `slk`, and `dlg` entry points

### `croatoan.lisp`
Use for:
- top-level macros and event-loop entry points
- `with-screen`, `with-window`, `with-windows`
- event-hook and lifecycle framing

### `classes.lisp`
Use for:
- core class hierarchy
- `window`, `screen`, `sub-window`, `panel`, `pad`, `sub-pad`
- widget/component hierarchy
- element/form/menu classes
- most accessors and core generics

This is the structural heart of the library.

### `form.lisp`
Use for:
- form drawing and behavior
- menu/checklist drawing logic
- cursor positioning inside widgets
- form editing/resetting/selection behavior

### `textarea.lisp`
Use for:
- text-area behavior
- cursor motion inside multi-line editing widgets
- deletion and editing semantics

### `grid.lisp`
Use for:
- `grid`
- `layout`, `row-layout`, `column-layout`
- layout calculation and movement

### `clear.lisp`
Use for:
- clear/redraw helper behavior

### `slk.lisp`
Use for:
- soft-label package behavior
- bottom-line function-key labels

### `dropdown.lisp`
Use for:
- dropdown widget behavior
- selection/list UI internals tied to dropdowns

## How to route through the source

### If the question is about screen/window/pad/panel structure
Start with:
1. `package.lisp`
2. `classes.lisp`
3. relevant refresh/move/resize helpers

### If the question is about forms, menus, widgets, or text entry
Start with:
1. `package.lisp`
2. `classes.lisp`
3. `form.lisp`
4. `textarea.lisp` or `dropdown.lisp` if relevant

### If the question is about layouts or keyboard navigation in grids
Start with:
1. `grid.lisp`
2. `classes.lisp`

### If the question is about terminal-thread safety and SLIME
Start with:
1. `doc/slime.md`
2. queue/process/submit exports in `package.lisp`
3. event-loop entry points in `croatoan.lisp`

### If the question is about package/layer boundaries
Start with:
1. `package.lisp`
2. `README.org`
3. `SUMMARY.md`

## Practical policy

Croatoan's prose docs are lighter than Coalton's.
So for deeper questions, do not hesitate to rely on:
- `package.lisp` for surface area
- `classes.lisp` for object model
- module-specific source files for behavior

If the answer is source-inferred rather than explicitly documented, say so.
