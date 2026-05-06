# Common Lisp Cookbook Example Map

Use this file when the user asks for cookbook examples, or when the mirrored attached source files are likely to be the cheapest path to clarity.

Example root:
- `~/external_docs/common-lisp-cookbook/cl-cookbook.sourceforge.net/`

## 1. CLOS tutorial example files

### `clos-tutorial/examples.lisp`
Use when:
- the user wants concrete `defclass` / `defmethod` / generic-function examples
- the task is learning or adapting the CLOS tutorial code

### `clos-tutorial/present.lisp`
Use when:
- the user wants the tutorial's presentation/pretty-printing support code
- the example corpus around the CLOS tutorial needs its helper file

Practical rule:
- for CLOS questions, inspect these files before inventing your own “cookbook-based” example from thin air

## 2. Emacs IDE chapter support files

### `.emacs`
Referenced by:
- `windows.html`
- `emacs-ide.html`

Use when:
- the user wants the sample startup/config file
- the question is about the cookbook's recommended editor setup

Practical note:
- treat as historical sample config, not automatically best modern practice

### `s1.lisp` through `s24.lisp`, plus `s10a.lisp` and `s10b.lisp`
Referenced by:
- `emacs-ide.html`

Use when:
- the user wants the exact source file used in the Emacs IDE chapter
- the question is about editing/navigation/refactoring/documentation/inspection examples from the cookbook

These files back specific chapter demonstrations such as:
- evaluating code
- deleting and indenting s-expressions
- parenthesis support
- code completion
- hiding/showing code
- comments
- comparing versions via `ediff` (`s10`, `s10a`, `s10b`)
- source navigation
- argument lists
- documentation
- describe/inspect
- macroexpand
- listener interaction

Practical rule:
- if answering an Emacs IDE cookbook question, inspect the referenced sample file rather than paraphrasing the chapter from memory

## 3. Win32 appendix examples

The Win32 chapter includes appendix programs A–D, but the mirrored examples are embedded in `win32.html` rather than split into standalone local `.lisp` files.

Use when:
- the user wants the cookbook's Win32 sample programs
- the task is historical Win32/Lisp integration reference

Practical rule:
- read the relevant appendix section inside `win32.html`
- do not claim there is a separate local example file unless there really is one

## 4. Inline-only chapter examples

Most cookbook chapters primarily keep examples inline inside the HTML page rather than as separate files.
This includes, for practical purposes, chapters like:
- strings
- dates and times
- hash tables
- functions
- loop
- I/O
- files
- packages
- macros
- sockets
- OS interface
- FFI
- threads
- systems
- testing
- misc

Use when:
- the user wants examples from one of these chapters

Practical rule:
- quote or adapt the inline example from the mirrored HTML page
- say explicitly that the cookbook's example is inline rather than a separate source file

## Routing policy

### For CLOS tasks
Start with:
- `clos-tutorial/index.html`
- `clos-tutorial/examples.lisp`
- `clos-tutorial/present.lisp`

### For Emacs/tooling tasks
Start with:
- `emacs-ide.html`
- `.emacs`
- the relevant `s*.lisp` file(s)
- `windows.html` if setup details matter

### For Win32 tasks
Start with:
- `win32.html`
- treat appendix code as in-page examples unless proven otherwise

### For most other cookbook tasks
Start with:
- the relevant HTML chapter
- then extract inline examples from that page

## Required minimum policy

When the user says to include cookbook examples, do **not** stop at saying “the cookbook has examples.”
You should explicitly know how to route among:
- CLOS tutorial source files
- `.emacs`
- `s1`–`s24` and `s10a`/`s10b`
- inline-only HTML examples
