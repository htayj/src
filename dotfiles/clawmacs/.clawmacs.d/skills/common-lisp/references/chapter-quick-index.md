# Common Lisp Cookbook Chapter Quick Index

Use this as the fastest routing layer when the user asks “which cookbook chapter covers X?”

Cookbook mirror root:
- `~/external_docs/common-lisp-cookbook/cl-cookbook.sourceforge.net/`

## Quick chapter index

### `strings.html`
Use for:
- substrings
- character access
- string mutation/copy patterns
- concatenation
- case conversion
- trimming
- symbol/string conversion
- char/string conversion
- substring search
- string↔number conversion
- string comparison

### `dates_and_times.html`
Use for:
- universal time
- internal time
- weekday computation

### `hashes.html`
Use for:
- creating hash tables
- lookup/insertion/deletion
- membership testing
- traversal
- counting entries
- sizing/performance basics

### `pattern_matching.html`
Use for:
- regex/pattern-matching questions

Caveat:
- thin coverage; do not oversell it

### `functions.html`
Use for:
- higher-order functions
- functions returning functions
- currying-style patterns

### `loop.html`
Use for:
- practical `loop` usage
- loop examples and orientation

### `io.html`
Use for:
- redirected output
- character stream fidelity
- fast bulk I/O

### `files.html`
Use for:
- file existence checks
- opening files
- reading lines/chars
- peeking ahead
- random access
- string streams as file substitutes

### `packages.html`
Use for:
- package symbol enumeration
- package basics where cookbook coverage is enough

### `macros.html`
Use for:
- macro mechanics
- backquote usage
- macro hygiene/practicality
- what macros are for

### `clos-tutorial/index.html`
Use for:
- `defclass`
- slots
- inheritance
- generic functions
- `defmethod`
- specializers
- qualifiers/method combination
- CLOS overview/tutorial questions

Also inspect:
- `clos-tutorial/examples.lisp`
- `clos-tutorial/present.lisp`

### `sockets.html`
Use for:
- socket addresses
- server sockets
- client sockets
- communication/closing
- complete socket example

### `os.html`
Use for:
- environment variables
- command-line arguments
- CMUCL-specific forking note

### `ffi.html`
Use for:
- foreign interface examples
- old implementation-specific FFI examples

Caveat:
- strongly historical and implementation-specific

### `process.html`
Use for:
- threads
- waiting
- mailboxes
- interrupts
- locks
- timers
- multithreading init

Caveat:
- implementation/runtime assumptions matter

### `systems.html`
Use for:
- defining systems
- beginner defsystem examples
- cross-platform defsystem discussion

Caveat:
- translate to modern ASDF practice when writing fresh code

### `windows.html`
Use for:
- historical Emacs+CL setup on Windows/Mac OS X
- sample `.emacs`
- setup/testing walkthroughs

Caveat:
- historical/tooling-specific

### `emacs-ide.html`
Use for:
- Emacs as Lisp IDE
- inferior Lisp mode / ILISP / ELI
- editing/evaluating/searching/documentation workflows
- attached source examples

Also inspect:
- `.emacs`
- `s1.lisp` … `s24.lisp`
- `s10a.lisp`, `s10b.lisp`

Caveat:
- historical/tooling-specific; translate to SLIME/SLY/current Emacs usage when needed

### `win32.html`
Use for:
- Win32 API integration from Lisp
- FLI/header translation
- callbacks
- CAPI integration
- COM/RAII/GC notes
- appendix programs A–D

Caveat:
- highly platform-specific and historically situated

### `testing.html`
Use for:
- RT installation/use
- writing/running tests
- test-framework survey

Caveat:
- historically useful; map to current testing libraries if user is building fresh code

### `misc.html`
Use for:
- reusing complex data structures
- `adjust-array` versus allocation-heavy `subseq` patterns

## Fast decision table

| User need | First chapter |
|---|---|
| strings/text munging | `strings.html` |
| time/date basics | `dates_and_times.html` |
| lookup table tasks | `hashes.html` |
| regex/pattern matching | `pattern_matching.html` |
| closures/currying | `functions.html` |
| `loop` syntax/practice | `loop.html` |
| streams/output/input | `io.html` |
| files/path access | `files.html` |
| packages | `packages.html` |
| macros/backquote | `macros.html` |
| objects/generic methods | `clos-tutorial/index.html` |
| sockets | `sockets.html` |
| OS hooks | `os.html` |
| foreign calls | `ffi.html` |
| threads | `process.html` |
| systems/defsystems | `systems.html` |
| Emacs setup | `windows.html` |
| Emacs IDE workflows | `emacs-ide.html` |
| Win32 | `win32.html` |
| testing | `testing.html` |
| odd recipes / perf-ish trivia | `misc.html` |
