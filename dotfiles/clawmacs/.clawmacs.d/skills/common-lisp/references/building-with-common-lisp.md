# Building with Common Lisp from the Cookbook

This file is the practical companion to the main skill.
Use it when the question is not merely “what does the cookbook say?” but “how should I actually use the cookbook to solve a Common Lisp task?”

For full cookbook coverage, pair this file with:
- `references/cookbook-corpus-map.md`
- `references/cookbook-example-map.md`

## What the cookbook gives you in practice

### 1. Everyday text and data handling

Start with:
- `strings.html`
- `dates_and_times.html`
- `hashes.html`
- `pattern_matching.html`

Use when:
- slicing/manipulating strings
- case conversion and trimming
- symbol/string/number conversion
- universal/internal time questions
- hash table creation/traversal/performance
- simple regex/pattern questions

Practical rule:
- for text/data tasks, the cookbook is often faster than wandering through generic Lisp references
- note that the pattern-matching chapter is comparatively thin

### 2. Functional/control recipes

Start with:
- `functions.html`
- `loop.html`
- `macros.html`

Use when:
- closures and functions returning functions
- currying-like patterns
- practical `loop` usage
- understanding backquote and macro shape
- deciding when macros are appropriate

Practical rule:
- the cookbook is especially good at quick orientation for `loop` and macros
- turn the examples into project-specific code instead of pasting them raw

### 3. I/O and file work

Start with:
- `io.html`
- `files.html`

Use when:
- redirected output
- faithful character-stream output
- bulk I/O
- file existence/opening/reading
- line-oriented or character-oriented file processing
- random file access

Practical rule:
- these chapters are strong for mundane tasks that users actually hit constantly

### 4. Namespace and system structure

Start with:
- `packages.html`
- `systems.html`

Use when:
- enumerating package symbols
- basic system definitions
- getting a beginner or legacy ASDF/defsystem-like view

Practical rule:
- cookbook system chapters are historically useful but may need adaptation to current ASDF conventions

### 5. Object-oriented Common Lisp

Start with:
- `clos-tutorial/index.html`
- `clos-tutorial/examples.lisp`
- `clos-tutorial/present.lisp`

Use when:
- classes/instances/slots
- inheritance
- generic functions and methods
- specializers and method combination
- introducing someone to CLOS practically

Practical rule:
- treat the CLOS tutorial as a separate subsystem within the cookbook
- for CLOS questions, this is one of the highest-value parts of the corpus

### 6. Network, OS, FFI, and threads

Start with:
- `sockets.html`
- `os.html`
- `ffi.html`
- `process.html`

Use when:
- server/client sockets
- environment variables and command-line args
- CL↔C interface examples
- threads, mailboxes, locks, interrupts, waiting

Practical rule:
- these chapters are useful but often implementation-specific
- always label portability and runtime assumptions

### 7. Tooling and editor workflows

Start with:
- `windows.html`
- `emacs-ide.html`
- `win32.html`
- attached `.emacs` and `s1`–`s24` files

Use when:
- Emacs setup and Lisp IDE ergonomics
- Windows/Mac setup guidance
- Win32 API integration
- historical Lisp editor workflow reference

Practical rule:
- these chapters are part of the cookbook and should be covered by the skill
- but they are notably historical and environment-specific

### 8. Testing and odd recipes

Start with:
- `testing.html`
- `misc.html`

Use when:
- RT-based test workflow
- testing-framework survey
- reuse of complex data structures
- `adjust-array` versus `subseq`-driven allocation patterns

Practical rule:
- useful for historical testing context and small performance-minded recipes

## Design decision table

| If you need... | Start with... | Then add... |
|---|---|---|
| String munging | `strings.html` | hashes/files if data storage follows |
| Dates/timing | `dates_and_times.html` | loop/io if processing follows |
| Lookup tables | `hashes.html` | misc/testing if tuning or validation follows |
| Higher-order/control patterns | `functions.html` | `loop.html`, `macros.html` |
| File or stream processing | `io.html`, `files.html` | strings/hash chapters |
| A package/system skeleton | `packages.html`, `systems.html` | macros/testing |
| CLOS design | `clos-tutorial/index.html` | cookbook example files |
| Socket or OS integration | `sockets.html`, `os.html` | `ffi.html`, `process.html` |
| Threading | `process.html` | io/os chapters as needed |
| Emacs IDE help | `emacs-ide.html`, `.emacs`, `s*.lisp` | `windows.html` |
| Win32-specific integration | `win32.html` | `ffi.html`, historical caveats |
| Testing guidance | `testing.html` | relevant domain chapter |

## Common anti-patterns

### Anti-pattern: treat the cookbook like the HyperSpec
Better:
- use it as a practical recipe source, not the normative language spec

### Anti-pattern: flatten implementation-specific advice into “Common Lisp always works like this”
Better:
- label runtime/tooling/implementation constraints explicitly

### Anti-pattern: forget the old tooling chapters exist
Better:
- cover them when the user asks broadly what the cookbook contains
- but mark them as historical where appropriate

### Anti-pattern: ignore attached example files
Better:
- inspect `.emacs`, `s1`–`s24`, and the CLOS tutorial files when those chapters are relevant

### Anti-pattern: answer with philosophy instead of a recipe
Better:
- use the cookbook to produce a concrete path, code shape, or example adaptation
