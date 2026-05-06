# Coalton Example Project Map

Use this file when the user wants practical example routing, or when the skill should incorporate the example projects called out in the README's **What's Here?** section.

Primary local examples root:
- `~/external_docs/coalton/examples/`
- mirrored from `~/external_src/coalton/examples/`

The README's **What's Here?** section explicitly calls out these example families:
- `small-coalton-programs`
- `thih`
- `quil-coalton`
- `fractal`

This file maps them to use cases.

---

## 1. `small-coalton-programs`

Paths:
- `~/external_docs/coalton/examples/small-coalton-programs/`
- `~/external_docs/coalton/examples/small-coalton-programs/src/brainfold.ct`
- `~/external_docs/coalton/examples/small-coalton-programs/src/diff.ct`
- `~/external_docs/coalton/examples/small-coalton-programs/src/freecalc.ct`
- `~/external_docs/coalton/examples/small-coalton-programs/src/monads-bank.lisp`
- `~/external_docs/coalton/examples/small-coalton-programs/src/primes.lisp`

Use when:
- the user wants small pedagogical examples
- you need compact examples of Coalton syntax and patterns
- the task is educational, not architecture-heavy

Typical value:
- quick pattern lookup
- small self-contained modules
- beginner/intermediate example routing

---

## 2. `thih`

Paths:
- `~/external_docs/coalton/examples/thih/README.md`
- `~/external_docs/coalton/examples/thih/src/thih.lisp`
- `~/external_docs/coalton/examples/thih/thih-coalton.asd`

What it is:
- a Coalton implementation of *Typing Haskell in Haskell*

Use when:
- the user wants a large type-system-heavy example
- the task involves inference/typechecker-style code
- you want a serious example of larger-scale functional design in Coalton

Typical value:
- advanced type-level design reference
- nontrivial project structure
- evidence that Coalton can handle sophisticated compiler/type-system code

---

## 3. `quil-coalton`

Paths:
- `~/external_docs/coalton/examples/quil-coalton/README.md`
- `~/external_docs/coalton/examples/quil-coalton/src/combinators.lisp`
- `~/external_docs/coalton/examples/quil-coalton/src/parser.lisp`
- `~/external_docs/coalton/examples/quil-coalton/src/string-view.lisp`
- `~/external_docs/coalton/examples/quil-coalton/src/value-parsers.lisp`

What it is:
- a parser-combinator library and a parser for a subset of Quil

Use when:
- the user wants parser combinator examples
- the task involves monads/type classes/functional composition
- the task involves `repr :native` interop patterns (`string-view.lisp` is especially useful)

Typical value:
- real-world parser architecture
- concrete `Functor` / `Applicative` / `Monad` / `Alternative` instance examples
- interop example via a native string wrapper

---

## 4. `fractal`

Paths:
- `~/external_docs/coalton/examples/fractal/README.md`
- `~/external_docs/coalton/examples/fractal/fractal.lisp`
- `~/external_docs/coalton/examples/fractal/fractal.asd`

What it is:
- a Mandelbrot viewer using Coalton, Common Lisp, and SDL2

Use when:
- the user wants a graphical or numerics-heavy example
- the task involves `Big-Float`, `Num`, or host-library interop
- the user asks whether Coalton can drive a real application beyond CLI/library code

Typical value:
- numerics/performance flavor
- Coalton + Common Lisp + external library integration
- proof that Coalton can sit inside a real app stack

---

## 5. `coalton-testing-example-project`

Paths:
- `~/external_docs/coalton/examples/coalton-testing-example-project/coalton-testing-example-project.asd`
- `~/external_docs/coalton/examples/coalton-testing-example-project/main.ct`
- `~/external_docs/coalton/examples/coalton-testing-example-project/test/test.ct`

What it is:
- a compact example of the testing workflow described in the docs

Use when:
- the user wants to add tests to a Coalton project
- the task needs a concrete ASDF + `coalton/testing` pattern

Typical value:
- operational reference for test subsystem wiring

---

## Routing policy

### For language-learning or quick syntax examples
Start with:
- `small-coalton-programs`

### For parser combinators or advanced FP structure
Start with:
- `quil-coalton`

### For type-system-heavy serious architecture
Start with:
- `thih`

### For graphical/numerical/interop-heavy application work
Start with:
- `fractal`

### For test setup
Start with:
- `coalton-testing-example-project`

## Required minimum policy

When the user says to use the examples from the README's **What's Here?** section, do **not** stop at a generic “there are examples” answer.
You should explicitly remember and be able to route to:
- `small-coalton-programs`
- `thih`
- `quil-coalton`
- `fractal`

And in practice, it is also worth remembering:
- `coalton-testing-example-project`
