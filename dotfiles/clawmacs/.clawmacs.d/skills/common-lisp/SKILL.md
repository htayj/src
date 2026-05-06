---
name: common-lisp
description: "Use when users want practical Common Lisp implementation help grounded in the Common Lisp Cookbook: strings, dates/times, hash tables, regular expressions, functions, loop, I/O, files, packages, macros, CLOS, sockets, OS/FFI, threads, systems, Emacs IDE workflows, Win32, testing, or miscellaneous recipes."
---

# Build Practical Common Lisp with the Common Lisp Cookbook

## Goal

After applying this skill, the Clawmacs agent should reliably build and debug **practical Common Lisp code** using the Common Lisp Cookbook as a concrete recipe corpus, instead of giving vague Lisp folklore, over-abstract spec talk, or cookbook-free answers that miss the library/tooling examples the user is actually asking for.

Use the cookbook as a practical corpus for:
- everyday Common Lisp recipes
- code patterns and examples
- systems/tooling guidance
- CLOS/tutorial material
- pragmatic development workflows

## Triggers

Use this skill when the user wants to:
- build or debug Common Lisp code with cookbook-style practical guidance
- know how to do a concrete task in Common Lisp
- find which cookbook chapter covers a topic
- extract or adapt cookbook examples into working code
- navigate Common Lisp topics like strings, loop, macros, CLOS, sockets, FFI, threads, systems, Emacs IDE setup, or testing
- broadly understand what the Common Lisp Cookbook covers

Do **not** use this skill for:
- formal Common Lisp specification questions where the HyperSpec is the primary authority
- Scheme/Clojure/Emacs Lisp questions with no Common Lisp angle
- cookbook-unrelated library-specific questions unless the cookbook corpus is still useful as a practical baseline

## Core stance

The Common Lisp Cookbook is a **practical recipe corpus**, not the language spec.

That means:
- use it for concrete patterns and examples,
- use it to route by task area,
- extract examples and adapt them to the user's actual environment,
- mark historical or implementation-specific advice explicitly when the cookbook shows its age.

Do not pretend every cookbook page is timeless or implementation-neutral.

## Optional local resources

### Cookbook mirror
- `~/external_docs/common-lisp-cookbook/cl-cookbook.sourceforge.net/`

Important local files:
- `~/external_docs/common-lisp-cookbook/cl-cookbook.sourceforge.net/index.html`
- `~/external_docs/common-lisp-cookbook/TOC.txt`
- `~/external_docs/common-lisp-cookbook/SUMMARY.md`
- `~/external_docs/common-lisp-cookbook/cl-cookbook.sourceforge.net/license.html`

Attached example files:
- `~/external_docs/common-lisp-cookbook/cl-cookbook.sourceforge.net/clos-tutorial/examples.lisp`
- `~/external_docs/common-lisp-cookbook/cl-cookbook.sourceforge.net/clos-tutorial/present.lisp`
- `~/external_docs/common-lisp-cookbook/cl-cookbook.sourceforge.net/.emacs`
- `~/external_docs/common-lisp-cookbook/cl-cookbook.sourceforge.net/s1.lisp` through `s24.lisp`
- `~/external_docs/common-lisp-cookbook/cl-cookbook.sourceforge.net/s10a.lisp`
- `~/external_docs/common-lisp-cookbook/cl-cookbook.sourceforge.net/s10b.lisp`

Sidecars:
- `references/building-with-common-lisp.md`
- `references/cookbook-corpus-map.md`
- `references/cookbook-example-map.md`
- `references/chapter-quick-index.md`
- `references/modern-tooling-translation.md`
- `references/eval-plan.md`
- `examples/typed-package-and-hash-table.lisp`
- `examples/typed-clos-skeleton.lisp`
- `examples/typed-io-loop-skeleton.lisp`

## Quick workflow

1. Classify the Common Lisp task.
2. Check the cookbook corpus map so the answer ranges across the whole cookbook when needed.
3. Use the chapter quick index when the user mainly needs fast routing.
4. Check the cookbook example map when attached source files are relevant.
5. Read the mirrored cookbook chapter(s) before answering from memory.
6. Extract the recipe, then adapt it to the user's actual implementation/environment.
7. Use the modern-tooling translation sidecar when the cookbook's tooling/runtime guidance is obviously old.
8. Mark historical, implementation-specific, or thin/incomplete cookbook coverage explicitly.
9. Return practical code, caveats, and chapter/example citations.

## Procedure

### 1) Classify the task

Put the request into one or more buckets:
- **text/data basics** — strings, dates/times, hash tables, pattern matching
- **control/composition** — functions, loop, macros/backquote
- **IO/system boundary** — I/O, files, packages, systems
- **object and generic programming** — CLOS
- **OS/network/runtime integration** — sockets, OS interface, FFI, threads
- **tooling/editor/platform** — Emacs IDE, Windows/Mac IDE setup, Win32
- **testing and misc recipes** — testing, miscellaneous techniques
- **broad cookbook survey** — what the cookbook covers overall

If the request spans multiple buckets, choose the main practical goal first, then layer the others in.

### 2) Check minimum cookbook coverage

Before narrowing to one recipe, consult:
- `references/cookbook-corpus-map.md`

Use it whenever the user asks broad questions like:
- what the cookbook covers
- which chapter applies
- whether the cookbook has a recipe for a task
- what areas of Common Lisp are included

At minimum, this skill should be able to range across:
- strings
- dates and times
- hash tables
- pattern matching / regex
- functions
- loop
- input/output
- files and directories
- packages
- macros and backquote
- CLOS tutorial material
- sockets
- OS interfacing
- FFI
- threads
- defining systems
- IDE/tooling pages
- testing
- miscellaneous recipes
- license/changelog/index context

### 3) Use the chapter quick index for fast routing

Consult:
- `references/chapter-quick-index.md`

Use it when the user mainly needs:
- the fastest route to the right chapter
- a compact “which page covers X?” answer
- a quick cookbook navigation layer before deeper reading

### 4) Check attached example files when relevant

Consult:
- `references/cookbook-example-map.md`

Use it whenever the cookbook's separate example files matter.
This especially matters for:
- the CLOS tutorial's example source files
- the Emacs IDE chapter's `s1`–`s24` files and `.emacs`
- the Windows/Emacs setup material that references `.emacs`

If a chapter has no separate attached file, say the examples are inline in the mirrored HTML.

### 5) Read the mirrored chapter before answering from memory

The cookbook is mirrored locally for a reason.
Read the actual chapter file(s) first.

Common chapter entry points include:
- `strings.html`
- `dates_and_times.html`
- `hashes.html`
- `pattern_matching.html`
- `functions.html`
- `loop.html`
- `io.html`
- `files.html`
- `packages.html`
- `macros.html`
- `clos-tutorial/index.html`
- `sockets.html`
- `os.html`
- `ffi.html`
- `process.html`
- `systems.html`
- `windows.html`
- `emacs-ide.html`
- `win32.html`
- `testing.html`
- `misc.html`

### 6) Extract the recipe, then adapt it

The cookbook gives recipes, not one-size-fits-all drop-ins.
Adapt them to:
- the user's implementation
- available libraries
- modern tooling expectations
- the user's requested platform
- the project's coding standards

When you write new Common Lisp code, do not merely paste cookbook snippets blindly.
Explain what was preserved and what was adapted.

### 7) Translate cookbook-era tooling into modern practice when needed

Consult:
- `references/modern-tooling-translation.md`

Use it when the cookbook is right in spirit but old in tooling assumptions.
This especially matters for:
- `systems.html` versus modern ASDF practice
- `windows.html` and `emacs-ide.html` versus modern SLIME/SLY workflows
- `ffi.html`, `os.html`, `process.html`, and `win32.html` when the cookbook is implementation-specific or historically situated
- cookbook testing examples versus current project testing defaults

Do not erase the cookbook. Preserve the recipe, modernize the delivery.

### 8) Mark historical and implementation-specific advice clearly

Some cookbook material is clearly tied to:
- older implementations
- older FFI/tooling ecosystems
- ILISP/ELI/older Emacs workflows
- CMUCL-specific or Windows-specific behavior
- historical Win32 integration guidance

Do not erase those chapters — they are part of the corpus — but do label them correctly.

Use these labels in your reasoning and answer where helpful:
- **General CL recipe**
- **Implementation-specific**
- **Historical/tooling-specific**
- **Thin cookbook coverage**

Important examples:
- `pattern_matching.html` is thin compared with other chapters
- `windows.html`, `emacs-ide.html`, and `win32.html` include older workflow guidance
- `ffi.html`, `process.html`, and `os.html` may hinge on implementation/runtime specifics

### 9) Prefer practical output over abstract sermonizing

The cookbook is strongest when turned into:
- working snippets
- implementation notes
- chapter routing
- concrete examples and caveats

If the user asks “how do I do X?”, answer with a practical path, not a lecture about Lisp philosophy.

### 10) Use the CLOS tutorial as a first-class subsystem

The CLOS section is not just a tiny note — it is effectively a tutorial corpus.
Use it when the task is about:
- `defclass`
- `defmethod`
- generic functions
- inheritance
- slots
- specializers
- method combination

Consult:
- `clos-tutorial/index.html`
- `clos-tutorial/examples.lisp`
- `clos-tutorial/present.lisp`

### 11) Use cookbook examples when they are the cheapest path to clarity

If the cookbook gives a directly relevant example file or in-page snippet, use it.
This is especially valuable for:
- Emacs IDE workflows (`s1`–`s24`, `.emacs`)
- CLOS tutorial code
- Win32 appendix programs

Do not claim to have used cookbook examples if you did not inspect them.

## Output contract

When using this skill successfully, return:
1. the Common Lisp task category chosen
2. the cookbook chapter(s) consulted
3. the cookbook example file(s) consulted, if any
4. the practical recipe or implementation path
5. any implementation-specific, historical, or thin-coverage caveats
6. any modern-tooling translation you applied
7. code or edits oriented toward solving the user's actual task

## Quality checks

- [ ] the answer is grounded in the mirrored cookbook, not generic memory-only Lisp advice
- [ ] the skill can range across the **full cookbook corpus** when the request is broad
- [ ] the chapter quick index supports fast routing
- [ ] attached cookbook example files are consulted when relevant
- [ ] historical or implementation-specific cookbook advice is labeled instead of flattened into false universality
- [ ] the output stays practical and task-oriented
- [ ] CLOS/tutorial material is treated as a real subsystem, not forgotten
- [ ] chapters with thin coverage are acknowledged honestly
- [ ] old tooling guidance is translated into a reasonable modern default when needed

## Failure handling

### Missing local mirror
- check `~/external_docs/common-lisp-cookbook/cl-cookbook.sourceforge.net/`
- check `~/external_docs/common-lisp-cookbook/TOC.txt`
- if missing, say so explicitly instead of pretending you checked the cookbook

### Broad “what does the cookbook cover?” question
- consult `references/cookbook-corpus-map.md`
- consult `references/chapter-quick-index.md`
- consult `references/cookbook-example-map.md`
- answer across the whole mirrored corpus, not just the top few chapters

### Historical chapter confusion
- say clearly that the chapter is historical, implementation-specific, or tooling-specific when appropriate
- use `references/modern-tooling-translation.md` when converting the recipe into current practice
- do not overclaim current portability

### Thin or incomplete cookbook coverage
- say the cookbook's coverage is thin for that topic
- still provide the best cookbook-grounded answer available
- if needed, note that a different reference may be needed for full depth

### Formal language-spec question instead of practical recipe question
- say the cookbook is practical, not normative spec
- if necessary, redirect conceptually toward the HyperSpec or implementation docs while still reporting what the cookbook says
