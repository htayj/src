---
name: coalton
description: "Use when users want to build, extend, or debug Common Lisp projects with Coalton: project setup, `.ct` files, `coalton-toplevel`, types, structs, aliases, type classes, pattern matching, interop with Lisp, configuration modes, testing, debugging, or optimization."
---

# Build Statically Typed Common Lisp with Coalton

## Goal

After applying this skill, the Clawmacs agent should reliably build working **Coalton** code and projects instead of giving vague “typed FP in Lisp” advice or writing generic Common Lisp that ignores Coalton's real workflow, tooling, language boundaries, documentation corpus, and example projects.

Use Coalton as a real language embedded in Lisp:
- project/package/ASDF setup
- `coalton-toplevel` for definitions
- `coalton` for expression evaluation
- data modeling with algebraic types, structs, aliases, and type classes
- explicit Lisp interop and representation choices
- configuration, debugging, testing, and optimization workflows
- the broader docs corpus and canonical example projects when questions are wide

## Triggers

Use this skill when the user wants to:
- write or refactor Common Lisp code into Coalton
- build a new Coalton project or module
- choose between `.lisp` and `.ct` files
- model types, type classes, or instances
- use Coalton with Common Lisp libraries
- configure development vs release mode
- test, debug, inspect, or optimize Coalton code
- broadly understand what Coalton covers and how to use it well
- navigate Coalton docs or example projects to guide implementation

Do **not** use this skill for:
- generic Common Lisp with no Coalton angle
- Haskell/OCaml advice that is not grounded in Coalton's actual semantics
- raw Lisp-only code when the user explicitly does not want Coalton

## Core stance

Coalton is not “Haskell pasted into Lisp.”
It is a statically typed functional language embedded in Common Lisp, with its own:
- package and file conventions
- compilation entry points
- interop guarantees and representation controls
- compiler modes
- debugging and testing workflows
- broader documentation and example project corpus

Prefer idiomatic Coalton first.
Only drop to raw Lisp when interop or representation control actually requires it.

## Optional local resources

### Source checkout
- `~/external_src/coalton`

### Docs snapshot
- `~/external_docs/coalton`

Required docs read for this skill:
- `~/external_docs/coalton/manual/whirlwind-tour.md`
- `~/external_docs/coalton/manual/_index.md`

High-value companion docs:
- `~/external_docs/coalton/manual/configuring-coalton.md`
- `~/external_docs/coalton/manual/lisp-interop.md`
- `~/external_docs/coalton/manual/debugging.md`
- `~/external_docs/coalton/intro-to-coalton-testing.md`
- `~/external_docs/coalton/SUMMARY.md`
- `~/external_docs/coalton/examples/README.md`
- `~/external_docs/coalton/docs/README.md`
- `~/external_docs/coalton/docs/glossary.md`
- `~/external_docs/coalton/docs/style-guide.md`
- `~/external_docs/coalton/docs/using-coalton-doc.md`
- `~/external_docs/coalton/docs/coalton-documentation-guide.md`
- `~/external_docs/coalton/docs/iterator-protocol.md`
- `~/external_docs/coalton/docs/internals/internals.md`
- `~/external_docs/coalton/docs/internals/how-typeclasses-are-compiled.md`

Important source/example paths:
- `~/external_src/coalton/src/package.lisp`
- `~/external_src/coalton/examples/coalton-testing-example-project/`
- `~/external_src/coalton/examples/quil-coalton/`
- `~/external_src/coalton/examples/small-coalton-programs/`
- `~/external_src/coalton/examples/thih/`
- `~/external_src/coalton/examples/fractal/`

Sidecars:
- `references/building-with-coalton.md`
- `references/full-feature-map.md`
- `references/docs-corpus-map.md`
- `references/example-project-map.md`
- `references/operator-quick-index.md`
- `references/project-workflow-translation.md`
- `references/eval-plan.md`
- `examples/minimal-project.asd`
- `examples/minimal-module.lisp`
- `examples/native-interop.lisp`

## Quick workflow

1. Classify the Coalton task.
2. Check the full Coalton feature map so the answer covers the actual language/workflow surface.
3. Check the full docs corpus map when the question ranges beyond the whirlwind tour/manual core.
4. Check the example-project map when a real project/example analog exists.
5. Use the operator quick index when the task is really about one form/operator.
6. Use the project-workflow translation when the manual needs to be turned into a practical build plan.
7. Set up the package/file/ASDF boundary correctly.
8. Choose Coalton vs Lisp responsibilities deliberately.
9. Model types and interfaces first.
10. Implement with idiomatic Coalton constructs.
11. Use interop and `repr` choices explicitly when crossing the Lisp boundary.
12. Add tests and use Coalton's debugging/introspection tools.
13. Tune compiler mode, inlining, and specialization only after semantics are stable.

## Procedure

### 1) Classify the task

Put the request into one or more buckets:
- **new Coalton project/module** — project setup, files, packages, ASDF
- **pure typed core logic** — functions, types, aliases, pattern matching, type classes
- **Lisp interop boundary** — `lisp`, `repr`, native/wrapped values, calling conventions
- **performance/representation work** — compiler mode, inlining, specialization, release behavior
- **debug/test workflow** — type inspection, codegen inspection, Fiasco-based testing
- **broad language survey** — what Coalton includes and when to use which subsystem
- **docs/example routing** — which documentation family or example project best matches the task

If the request spans multiple buckets, choose the primary development goal first, then layer the rest in.

### 2) Check minimum language coverage

Before narrowing to a common implementation path, consult:
- `references/full-feature-map.md`

Use it whenever the user asks broad questions like:
- what Coalton supports
- whether Coalton has a feature
- which Coalton subsystem applies
- how much of the language/workflow surface needs to be considered

At minimum, this skill should be able to range across:
- systems/packages/`.ct` files/readtables
- `coalton-toplevel` and `coalton`
- definitions, declarations, data types, structs, aliases
- pattern matching, local bindings, loops, builders, `do`, control flow
- type classes, instances, deriving, functional dependencies
- inline Lisp and Lisp interop promises
- `repr` modes
- configuration and compiler modes
- debugging/introspection tools
- testing workflows
- specialization and inlining
- known differences from Common Lisp and incomplete features
- the broader `docs/` corpus: glossary, style guide, doc-generation docs, iterator protocol docs, internals, and manual source layout
- the canonical example projects named in the README's `What's Here?` section
- the operator-level reference surface under `docs/manual/site/operators/`
- practical translation from manual/operator docs into real project workflow decisions

### 3) Check the broader docs corpus when needed

When the question is broader than ordinary language usage, consult:
- `references/docs-corpus-map.md`

Use it for:
- style/naming questions
- documentation/docstring generation questions
- iterator-specific questions
- compiler internals questions
- Nix/environment questions
- manual/operator-page routing questions

The Coalton skill should not behave as if the only real docs are the whirlwind tour and the manual landing page.

### 4) Check example projects when a real analog exists

Consult:
- `references/example-project-map.md`

Use it whenever a canonical example project matches the request.
This includes, at minimum, the README's `What's Here?` examples:
- `small-coalton-programs`
- `thih`
- `quil-coalton`
- `fractal`

And in practice also:
- `coalton-testing-example-project`

### 5) Use the operator quick index for narrow questions

Consult:
- `references/operator-quick-index.md`

Use it when:
- the user is really asking about one form/operator
- you need the fastest route through the operator docs
- a compact “which operator should I use for X?” answer is enough

### 6) Use the project-workflow translation for real implementation planning

Consult:
- `references/project-workflow-translation.md`

Use it when:
- the manual/operator docs are correct but too low-level for the task at hand
- you need to turn doc knowledge into project structure, interop boundaries, testing strategy, or optimization timing

### 7) Set up the project boundary correctly

Coalton lives inside Common Lisp project structure.
Start with the right scaffolding:
- ASDF system
- `#:coalton` in `:depends-on`
- optionally `#:coalton-asdf` in `:defsystem-depends-on`
- package definitions that `:use` `#:coalton` and usually `#:coalton-prelude`
- `named-readtables:in-readtable coalton:coalton` in ordinary `.lisp` files
- or `.ct` files when Coalton-heavy source should default to the Coalton readtable

Critical rule from the docs:
- do **not** `:use` `#:cl` / `#:common-lisp` in Coalton packages
- qualify Common Lisp names with `cl:` when needed

### 8) Choose `.lisp` vs `.ct` deliberately

Use `.ct` files when:
- the file is primarily Coalton code
- you want Coalton's readtable by default
- you want cleaner source ergonomics in Coalton-heavy modules

Use ordinary `.lisp` files when:
- the file is mixed Lisp/Coalton
- the Lisp side is substantial
- you want conventional Lisp source structure with explicit readtable switching

Do not treat `.ct` as a separate language.
The docs are explicit: it is still Lisp source, just read under Coalton's readtable.

### 9) Model types and interfaces first

For new code, decide these early:
- plain values/functions via `define`
- public intent via `declare`
- algebraic data via `define-type`
- record-ish structures via `define-struct`
- naming simplification via `define-type-alias`
- behavior abstraction via `define-class` / `define-instance`

If the module is meant to be a typed core, push most domain semantics into Coalton rather than smearing them across ad hoc Lisp code.

### 10) Use idiomatic Coalton constructs

Reach for the language constructs Coalton is designed around:
- `define`, `declare`
- `match`
- `let`, `let*`
- `rec` for tail-recursive loops
- `for`, `for*` for conventional looping
- collection/association builders
- `do` notation when the abstraction warrants it
- `when`, `unless`, `cond`, `if`
- `values`, `return`, `progn`

Important semantic note from the whirlwind tour:
- Coalton functions are fixed-arity
- currying/partial application must be made explicit with `fn`

Do not accidentally write Haskell-shaped code that assumes auto-currying.

### 11) Keep the Lisp boundary explicit

Use Coalton/Lisp interop on purpose, not as leakage.

For interop work, consult:
- `~/external_docs/coalton/manual/lisp-interop.md`

Key decisions include:
- using `lisp` blocks for host interop
- calling Coalton safely from Lisp with `coalton`
- using generated Lisp functions/values when interop promises allow it
- representation choices with `repr`

Common `repr` choices:
- `:lisp` for stable Lisp-visible structure/class behavior
- `:enum` for nullary constructor enums
- `:transparent` for erased wrappers
- `:native <cl-type>` for Lisp-native underlying representations

If you cross into Lisp, say exactly why and what guarantees you rely on.

### 12) Choose compiler mode and optimization timing deliberately

Coalton has meaningful development/release differences.
Consult:
- `~/external_docs/coalton/manual/configuring-coalton.md`
- `~/external_docs/coalton/manual/lisp-interop.md`

Default workflow:
- build and iterate in development mode
- optimize only once semantics are stable
- be careful that all Coalton code in a build is compiled in the same mode

Optimization/config knobs to consider only when justified:
- `:compiler-mode`
- `:perform-specialization`
- `:perform-inlining`
- `:emit-type-annotations`
- `:print-types`
- `:print-rewrites`
- `:auto-continue-redefinition`
- directives like `inline`, `noinline`, `specialize`, `monomorphize`

### 13) Use the built-in debugging/introspection workflow

Coalton debugging is still Lisp debugging, plus Coalton-specific inspection tools.
Consult:
- `~/external_docs/coalton/manual/debugging.md`

Useful tools include:
- `type-of`
- `describe-type-of`
- `describe-type-alias`
- `kind-of`
- `coalton-codegen`
- `coalton-codegen-ast`
- `coalton-codegen-types`
- `pprint-coalton-codegen`
- `print-specializations`

If behavior is surprising, inspect generated code and type information instead of guessing.

### 14) Add tests as part of normal project structure

For nontrivial code, use Coalton's testing workflow.
Consult:
- `~/external_docs/coalton/intro-to-coalton-testing.md`

The docs' standard path is:
- add a `/test` ASDF subsystem
- depend on `coalton/testing` and `fiasco`
- create a Coalton-oriented test package
- use `define-test`, `is`, and `matches`
- run with `asdf:test-system`

Do not stop at “it typechecks.”
Type safety is not a substitute for behavioral tests.

### 15) Do not forget the wider docs and examples surface

The Coalton repository includes more than the whirlwind tour and a few example snippets.
Do not forget to range across:
- `docs/README.md`
- glossary and style guide
- `coalton/doc` documentation-generation guidance
- iterator protocol docs
- internals and design-doc files
- manual source layout and operator pages
- the example projects from the README's `What's Here?` section

If the user's question is broad, include those resources instead of silently narrowing the skill back down to the most common syntax topics.

### 16) Do not forget the wider language surface

A lot of Coalton usage fixates on just:
- `coalton-toplevel`
- `define-type`
- a few functions

Do not forget that the actual language/workflow surface also includes:
- package and readtable discipline
- keyword-bearing functions
- collection and association builders
- immutable sequences/maps
- dynamic variables
- exceptions and resumptions
- functional dependencies
- inline type annotations
- nullary-function quirks
- instance defaulting
- specialization
- Common Lisp differences and incomplete features

If the user's question is broad, range across the real surface instead of pretending Coalton is a tiny ML subset.

## Output contract

When using this skill successfully, return:
1. the Coalton task type or architecture chosen
2. the package/file/ASDF structure you recommend or implemented
3. the Coalton constructs being used
4. the Coalton docs/source files consulted
5. the broader docs/example/operator/workflow areas consulted when the request is broad
6. the explicit Lisp interop or `repr` choices when relevant
7. code or edits oriented toward a working Coalton project/module
8. testing/debugging/optimization guidance when relevant

## Quality checks

- [ ] the answer is about **building with Coalton**, not generic typed-FP folklore
- [ ] the skill can range across the **full Coalton feature surface** when the request is broad
- [ ] the skill can range across the broader `docs/` corpus and canonical example projects when the request is broad
- [ ] the skill can route quickly at the operator level and translate docs into project workflow when needed
- [ ] project/package/readtable setup is handled coherently
- [ ] fixed-arity Coalton semantics are respected
- [ ] higher-level Coalton constructs are preferred over gratuitous raw Lisp leakage
- [ ] interop/`repr` choices are explicit when crossing the Lisp boundary
- [ ] config/debug/test workflows are not omitted for nontrivial work
- [ ] development vs release mode concerns are not confused

## Failure handling

### Missing local references
- check `~/external_src/coalton`
- check `~/external_docs/coalton`
- if missing, say so explicitly instead of improvising Coalton-specific claims

### Broad “what does Coalton cover?” question
- consult `references/full-feature-map.md`
- consult `references/docs-corpus-map.md`
- consult `references/example-project-map.md`
- consult `references/operator-quick-index.md`
- answer across the language, docs, operator, and example-project surface, not just syntax basics

### Haskell-shaped assumptions leaking in
- correct for Coalton specifics such as fixed arity, Lisp embedding, and explicit interop/representation controls

### Interop confusion
- use `~/external_docs/coalton/manual/lisp-interop.md`
- say which promises are relied on, and whether the code is staying in safe `coalton` usage or lower-level/raw Lisp interop

### Redefinition/optimization confusion
- separate development-mode ergonomics from release-mode performance work
- do not recommend inlining/specialization as a first move

### Testing omitted because “the types already prove it”
- point back to the testing doc and add a real test path
