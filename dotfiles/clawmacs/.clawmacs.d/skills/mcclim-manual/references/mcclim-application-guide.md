# McCLIM Application Guide

Use this guide when the task is to design, write, extend, or debug a McCLIM application. It is intentionally opinionated: start with the canonical CLIM/McCLIM architecture, then deviate only when the problem requires a lower-level hook, a vendor-specific comparison, or a performance escape hatch.

## Contents

- [Mental Model](#mental-model)
- [Default Build Workflow](#default-build-workflow)
- [Canonical Concepts](#canonical-concepts)
- [Presentation-Based Interface Design](#presentation-based-interface-design)
- [When To Deviate](#when-to-deviate)
- [Quality Checklist](#quality-checklist)
- [Reference Anchors](#reference-anchors)

## Mental Model

McCLIM is a CLIM implementation. Treat CLIM as the semantic model and McCLIM as the concrete implementation, extension set, examples, backends, and bundled applications.

The usual McCLIM application loop is:

1. Acquire a command through a command table, menu, keystroke, typed command, gadget action, or presentation gesture.
2. Acquire command arguments with `accept`, completion, typed input, or by selecting visible presentations.
3. Mutate application state, usually held in slots of the application frame or domain objects reachable from it.
4. Redisplay panes from that state, usually through display functions that write CLIM output records.

This is different from a widget/callback-first toolkit. In CLIM, commands and presentations let application logic remain independent from whether the user typed, clicked, chose a menu item, or selected a visible object.

## Default Build Workflow

1. Define a package using `:clim` and `:clim-lisp` or the project-local package style.
2. Define domain classes and state before UI details.
3. Define an application frame with `define-application-frame`.
4. Store application-specific state in frame slots instead of globals unless the surrounding project has a clear reason.
5. Add `:panes` and `:layouts`; start with `:application` panes for semantic output and `:interactor` panes for command input.
6. Define commands with the frame-specific command macro, keeping command bodies as state changes plus explicit redisplay requests when needed.
7. Use presentations for domain objects that appear on screen and can become command arguments or gesture targets.
8. Use formatted output before manual layout for tables, item lists, and graphs.
9. Use gadgets for conventional controls and forms; use `accepting-values` for transient structured input.
10. Add incremental redisplay only after the display function and object identities are clear.
11. Check a nearby McCLIM example before inventing architecture.
12. Cross-check semantics in the CLIM spec or bundled McCLIM docs before asserting subtle protocol behavior.

Minimal skeleton:

```lisp
(defpackage #:my-app
  (:use #:clim #:clim-lisp)
  (:export #:run-my-app))

(in-package #:my-app)

(define-application-frame my-app ()
  ((items :initform nil :accessor app-items))
  (:pointer-documentation t)
  (:panes
   (main :application
         :display-function 'display-main
         :display-time :command-loop)
   (int :interactor))
  (:layouts
   (default (vertically () main int))))

(defun run-my-app ()
  (run-frame-top-level (make-application-frame 'my-app)))
```

## Canonical Concepts

### Application Frames

Use an application frame as the application object: it owns frame state, pane layout, command tables, and the standard CLIM streams. Prefer `define-application-frame`, `make-application-frame`, and `run-frame-top-level` over ad hoc top-level windows.

Keep long-lived UI/application state in frame slots. Commands should read and update that state, then rely on the command loop or explicit redisplay to update views.

### Panes, Layouts, And Gadgets

Use panes to divide the UI into functional regions. Common choices:

- `:application` for display-function-driven output, custom drawing, presentations, tables, graphs, and dashboards.
- `:interactor` for typed command interaction.
- layout panes such as `vertically`, `horizontally`, and table-like composition for structure.
- gadgets for buttons, sliders, text fields, option panes, and conventional controls.

In McCLIM, add scroll bars in the `:layouts` section when possible. The manual treats `:scroll-bars` to `make-pane` for stream panes as obsolete, while frame pane specifications still use McCLIM's stream-pane construction.

### Sheets, Mediums, Ports, Grafts, And Mirrors

Use panes first. Reach for sheets when writing custom panes, handling lower-level events, manipulating sheet geometry, or understanding backend behavior.

- A sheet is the lower-level window-like object in the CLIM hierarchy.
- A pane is a higher-level sheet used in application layouts.
- A medium carries drawing state and translates user coordinates into sheet/native/device coordinates.
- A port represents the connection to a display server or backend.
- A graft is the root sheet for a display.
- A mirror is the native windowing object backing a sheet, directly or through an ancestor.

Application code usually draws to streams/panes and lets McCLIM handle the sheet/medium/port machinery. Backend work, custom pane classes, repaint protocol work, and event protocol work need the lower layers.

### Output, Output Records, And Redisplay

CLIM panes do not just paint pixels; stream panes can record the operations that produced output. Those output records support repainting, hit testing, presentations, and incremental redisplay.

Use a display function when the view reflects application state. A simple dynamic display can recompute the whole output each command loop. When the view is large or changes in small pieces, wrap stable subtrees with `updating-output` and give them identities so CLIM can reuse records.

Use direct output-record manipulation only when `updating-output` is too slow or the app already needs explicit record ownership.

### Presentations

Use presentations whenever visible text or graphics represent domain objects users should act on. The core forms are:

- `define-presentation-type`
- `present`
- `with-output-as-presentation`
- `accept`
- presentation translators such as presentation-to-command translators

Presentation types are UI-semantic types, not just Common Lisp types. Every non-built-in Common Lisp class is automatically usable as a presentation type, but define explicit presentation types when UI type relationships, parameters, parsing, printing, or translators matter.

Prefer presentations over raw pointer hit testing for semantic objects. A table row, graph node, cell value, file, buffer, inspector object, or drawn shape can be output as a presentation while still being drawn as text or graphics.

### Commands And Command Tables

Use commands for application actions. Do not hide domain mutation only in gadget callbacks or display code.

Command arguments should have presentation types when they are domain objects. That lets the same command be invoked through typed input, completion, menu selection, keyboard gestures, or object selection.

Use command tables for menus, inherited command sets, keystrokes, and mode-like command availability. ESA and Drei use command tables heavily for Emacs-style interaction.

### Formatted Output

Use CLIM formatting before manual coordinate placement for structured output:

- `formatting-table`, `formatting-row`, `formatting-cell` for reports, grids, and spreadsheets.
- `format-graph-from-roots` for trees and graph-like browser views.
- bordered and text formatting utilities for grouping, indentation, filled text, and list-like output.

Wrap semantic cells, rows, nodes, or labels in presentations when users should act on them.

### Drawing, Ink, Designs, And Text Styles

Use drawing functions for graphics-heavy views, but keep domain semantics separate from pixels by wrapping drawn objects in presentations when appropriate.

Ink answers "what design/color/pattern is used to mark the drawing surface?" It is drawing state on a medium. `medium-ink`, `:ink`, foreground/background, colors, opacity, patterns, flipping ink, and designs control graphical rendering.

Text style answers "what family, face, and size should text use?" `:text-face`, `with-text-face`, `with-text-style`, and text-style mappings control typography.

CLIM does not have a single built-in object exactly like an Emacs face that combines foreground/background/weight/slant/size. For face-like styling, define an application style object or style function that chooses both ink/design options and text-style options, then apply those choices at the output boundary. Keep the semantic type of the object separate from this visual style.

### Input Editing And Completion

Use `accept` and presentation types for typed arguments. Use completion and presentation parsers/printers when the user should be able to type values as well as select visible ones.

Use `accepting-values` for short structured input sessions. Prefer it over hand-made gadget dialogs until there is a concrete layout, validation, or live-control reason to custom-build the form.

### ESA

ESA is the Emacs-Style Application library in McCLIM. Use it when the application should feel like an Emacs-style editor or browser with buffers, windows, an info pane, minibuffer, multi-keystroke command invocation, keyboard macros, and `M-x` command entry.

Use ESA mixins and command tables for applications whose central model is buffers/windows plus keyboard-driven commands. Do not use ESA for ordinary control panels or simple command tools unless the Emacs-style command model is actually wanted.

### Drei

Drei is McCLIM's editor substrate, activated by default in the documented McCLIM corpus. It is designed to support multiple editor variants: input editor, text editor gadget, and simple pane.

Use Drei when working on text editing behavior, editor commands, buffers, marks, views, kill rings, undo, syntax modules, incremental parsing, or editor redisplay. Treat Drei as an editor subsystem, not as the default way to build every McCLIM UI.

### Clouseau, Listener, Debugger, And Graphic Forms

Use Clouseau docs for inspector behavior and custom inspection methods. Use Listener docs for McCLIM Listener command behavior and command-output destinations. Use Debugger docs for McCLIM debugger integration and user operations.

Graphic Forms appears in the retained historical material as `clim-graphic-forms`, an experimental native-widgets backend on Windows. The current retained manual corpus has no detailed API guide for it. If a task depends on Graphic Forms, inspect the local McCLIM source or historical docs before making API claims.

### Backends And Extensions

Use McCLIM extensions deliberately and label them as McCLIM-specific. Examples include frame redefinition semantics, frame/sheet icons and names, tab layout, extended blank area presentations, fonts and extended text styles, raster images, drawing backends, gesture extensions, and backend protocols.

For portable CLIM behavior, prefer the CLIM spec. For behavior in McCLIM, prefer the McCLIM manual and source modules. Use Franz and LispWorks guides as clarification and vendor comparison, not as proof that McCLIM behaves identically.

## Presentation-Based Interface Design

Design presentation-oriented McCLIM applications around semantic objects, not callbacks.

Ask:

- What domain objects should users act on directly?
- What presentation types describe those objects in UI terms?
- What output will create presentation records linking object, type, and visible representation?
- What commands or workflows establish each input context?
- Which visible presentations should satisfy each input context?
- Which translators convert a selected object into another value or command?
- Which presentations are nested, such as row/cell, graph/node/label, or file/icon/pathname?
- Which visual choices are style only, and which represent semantic distinctions?

In McCLIM terms, the presentation-based model maps naturally to `present`, `with-output-as-presentation`, `accept`, presentation type inheritance, nested presentations, presentation translators, command presentation types, and output records.

Do not confuse a presentation with a gadget. A gadget is a control surface. A presentation is a recorded semantic relationship between an application object, a UI type, and visible output.

## When To Deviate

Deviate from the canonical path only with a concrete reason:

- Use gadgets instead of presentations when the interaction is a conventional control or form field, not acting on already-displayed domain objects.
- Use raw drawing without presentations when the pixels are decorative or purely visual and have no domain action.
- Use low-level sheets, ports, grafts, mirrors, or event protocols when implementing panes, backends, unusual repaint behavior, or custom event routing.
- Manage output records manually when `updating-output` is too expensive or does not express the view update pattern.
- Use vendor-guide behavior only for comparison unless verified against McCLIM docs or source.
- Use McCLIM extensions when they solve the problem, but mark the code as McCLIM-specific.
- Follow existing project style when modifying an existing app, even if a fresh app would be structured differently.

## Quality Checklist

- The app has an application frame, explicit panes, and a coherent layout.
- Application state lives in frame/domain objects, not scattered globals.
- Commands express domain actions and are independent from invocation style.
- Semantic output uses presentations rather than raw click regions.
- Tables, graphs, and reports use formatted output when appropriate.
- Dynamic views use output records and incremental redisplay deliberately.
- Drawing code separates ink/design choices from text-style choices and from presentation semantics.
- Gadgets are used for controls, not as a substitute for the semantic object model.
- ESA/Drei are used for editor-like applications and text editing, not as generic UI cargo cult.
- Portable CLIM, McCLIM-specific behavior, and vendor-specific clarification are kept distinct.

## Reference Anchors

Start with `references/merged-source-map.md`, then use the lookup scripts. Useful sections:

- McCLIM manual: "The first application", "Using presentation types", "Using incremental redisplay", "Panes", "Output Protocol", "Command Processing", "Fonts and Extended Text Styles", "Raster Images".
- Source modules: Drei "Drei Concepts", ESA "Basic use of ESA", Guided Tour "Building Applications", Notes "Presentation Types" and "Sheet Geometry".
- CLIM spec mirror: command processing, application frames, panes, gadgets, presentation types, output recording, drawing options, text styles, color/designs, sheets/ports/grafts/mirrors.
- Presentation influences: `presentation-interface-model.md` for the semantic object-to-display model; Dynamic Windows paper for typed presentations, input contexts, translators, commands, and nested presentations.
