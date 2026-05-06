# Coalton Manual → Practical Project Workflow Translation

Use this file when Coalton's manual/operator docs are correct but the user needs them turned into an actual project-building workflow.

This file does not replace the manual.
It translates manual/operator-level knowledge into practical defaults for building a real Coalton project.

## 1. File/project bootstrap

Manual concepts:
- `coalton-toplevel`
- `.ct` files
- package/readtable setup
- `coalton-asdf`

Practical translation:
- create an ASDF system first
- decide early whether modules should be `.ct` or `.lisp`
- keep package structure simple and explicit
- use `.ct` for Coalton-dominant modules, `.lisp` for mixed Lisp/Coalton modules

## 2. Model-first development

Manual concepts:
- `define-type`
- `define-struct`
- `define-type-alias`
- `define-class`
- `define-instance`

Practical translation:
- define domain types before writing large function bodies
- add `declare` forms early
- only introduce type classes when they clarify reusable behavior, not by reflex

## 3. Expression-level development workflow

Manual concepts:
- `coalton`
- `type-of`
- `describe-type-of`
- `kind-of`

Practical translation:
- use `coalton` in the REPL for small experiments
- use the type-inspection operators as normal development tools, not as exotic afterthoughts

## 4. Interop boundaries

Manual concepts:
- `lisp`
- `repr`
- native/transparent/lisp representations

Practical translation:
- keep the Coalton core pure/typed where possible
- isolate host-library interop behind explicit boundary functions
- choose `repr` for a reason, and document that reason
- avoid smearing raw Lisp across the whole codebase

## 5. Control-flow choice

Manual concepts:
- `match`
- `let`, `let*`
- `rec`
- `for`, `for*`
- `do`

Practical translation:
- algebraic data → `match`
- recursive state transition → `rec`
- imperative iteration → `for`/`for*`
- monadic sequencing → `do`

Do not force every problem into one favorite style.

## 6. Fixed-arity correction

Manual concept:
- fixed-arity functions, explicit `fn`

Practical translation:
- if you catch yourself writing Haskell-shaped partial application by reflex, stop and make the function-returning-function structure explicit

## 7. Testing as standard project structure

Manual/docs concepts:
- `coalton/testing`
- Fiasco
- ASDF test subsystem

Practical translation:
- add tests from the beginning for real projects
- use a dedicated test subsystem
- do not treat the typechecker as a substitute for behavioral tests

## 8. Development mode vs release mode

Manual/docs concepts:
- configuration modes
- inlining/specialization controls

Practical translation:
- build and redefine in development mode
- inspect/benchmark/ship in release mode
- do not mix mode assumptions inside one build
- optimize only after correctness and tests are in place

## 9. Debugging workflow

Manual/docs concepts:
- codegen inspection operators
- type and alias inspection
- specialization inspection

Practical translation:
- when confused, inspect types first
- inspect generated code next
- tune optimization hints last

## 10. Example-project routing

Manual/docs + example concepts:
- `small-coalton-programs`
- `quil-coalton`
- `thih`
- `fractal`
- testing example project

Practical translation:
- learning/basic patterns → `small-coalton-programs`
- parser combinators / richer FP structure → `quil-coalton`
- type-system-heavy architecture → `thih`
- numerics/interop-heavy app → `fractal`
- test wiring → testing example project

## Required policy

When this sidecar is used:
- preserve Coalton's actual semantics
- convert operator-level knowledge into project-level decisions
- keep interop, config, testing, and optimization explicit rather than hand-wavy
