# Full Coalton Feature Map

This file exists so the skill covers the Coalton language and workflow surface as a minimum, not just a few syntax forms.

Use it when the user asks:
- what Coalton supports,
- whether Coalton has a capability,
- which parts of the language/manual matter,
- how broad the workflow is beyond basic examples.

This map is grounded primarily in:
- the whirlwind tour
- the language manual landing page
- companion docs on configuring Coalton, Lisp interop, debugging, and testing

---

## 1. Project and file structure

From the whirlwind tour:
- ASDF systems
- `#:coalton` dependencies
- optional `coalton-asdf`
- `.ct` files
- `:ct-file`
- package-inferred-system caveats

Builder significance:
- Coalton projects still live inside Common Lisp project structure

---

## 2. Packages and REPL workflow

From the whirlwind tour:
- Coalton packages and local nicknames
- `#:coalton-prelude`
- `#:coalton-user`
- explicit avoidance of `:use #:cl`

Builder significance:
- package discipline is part of writing correct Coalton, not boilerplate trivia

---

## 3. Entry points and program structure

Core entry points from the manual and exports:
- `coalton-toplevel`
- `coalton`
- codegen/debug entry points

Builder significance:
- definitions vs expression evaluation are distinct
- the language is embedded in Lisp rather than replacing it

---

## 4. Definitions and top-level declarations

Core forms:
- `define`
- `declare`
- top-level variable and function definitions

Builder significance:
- explicit public intent
- type declarations for readability and maintenance

---

## 5. Data modeling

Core forms/features:
- `define-type`
- `define-struct`
- `define-type-alias`
- tuple usage
- primitive types and standard algebraic types (`List`, `Optional`, etc.)

Builder significance:
- typed domain modeling
- explicit algebraic structure instead of ad hoc plist/object soup

---

## 6. Function semantics and local abstraction

From the whirlwind tour/manual:
- fixed-arity functions
- explicit currying with `fn`
- keyword-bearing functions
- ignoring parameters
- local bindings with `let` / `let*`

Builder significance:
- prevents Haskell-shaped misunderstandings
- matters for API design and higher-order programming

---

## 7. Control flow and iteration

Core forms:
- `if`, `when`, `unless`, `cond`
- `rec`
- `for`, `for*`
- `break`, `continue`
- `return`
- `progn`
- `values`

Builder significance:
- Coalton has its own structured control tools beyond pure recursion-only style

---

## 8. Pattern matching and destructuring

Core forms/features:
- `match`
- pattern binding
- wildcard `_`

Builder significance:
- primary way to consume algebraic data safely and clearly

---

## 9. Collections, builders, and immutable data helpers

From the whirlwind tour/manual:
- collection builders
- association builders
- immutable sequences and maps
- pipeline/convenience operators

Builder significance:
- collection-heavy code and fluent data transformation

---

## 10. Static typing and type-level features

From the whirlwind tour/manual:
- type inference
- explicit `declare`
- `forall`
- `=>`
- inline type annotations with `the`
- type coercion/conversion discussion
- variance discussion
- instance defaulting
- functional dependencies

Builder significance:
- real language-design choices, not just “types exist”

---

## 11. Type classes and deriving

Core forms/features:
- `define-class`
- `define-instance`
- builtin type classes
- deriving support
- builtin derive classes

Builder significance:
- reusable behavior abstractions and standard semantic contracts

---

## 12. Do notation and higher-level control abstraction

Core forms:
- `do`
- `<-`

Builder significance:
- monadic sequencing and effect-like abstractions where appropriate

---

## 13. Dynamic variables and special control features

From the whirlwind tour/manual:
- `dynamic-bind`
- early returns
- `progn`
- nullary-function caveats

Builder significance:
- advanced control and host integration patterns

---

## 14. Exceptions and resumptions

Core forms/features:
- `define-exception`
- `define-resumption`
- `throw`
- `catch`
- `resumable`
- `resume-to`

Builder significance:
- nontrivial control/error workflows
- explicitly noted in the whirlwind tour as part of the language surface

---

## 15. Lisp interop and representation control

Companion manual section plus exports:
- `lisp`
- `lisp-toplevel`
- `call-coalton-function`
- raw Lisp calls to Coalton
- interop promises for values/functions/constructors
- `repr :lisp`
- `repr :enum`
- `repr :transparent`
- `repr :native`

Builder significance:
- essential for real-world Common Lisp integration
- one of Coalton's biggest differentiators from standalone ML-family languages

---

## 16. Compiler modes and configuration

From configuration + interop docs:
- development vs release mode
- `:compiler-mode`
- `:print-unicode`
- `:perform-specialization`
- `:perform-inlining`
- `:emit-type-annotations`
- `:print-types`
- `:print-rewrites`
- `:auto-continue-redefinition`

Builder significance:
- affects performance, redefinition behavior, and runtime representation assumptions

---

## 17. Debugging and inspection tools

From the debugging doc/manual:
- `coalton-codegen`
- `coalton-codegen-ast`
- `coalton-codegen-types`
- `pprint-coalton-codegen`
- `pprint-coalton-codegen-ast`
- `pprint-coalton-codegen-types`
- `describe-type-of`
- `describe-type-alias`
- `kind-of`
- `type-of`
- `set-type-printing-mode`
- `print-specializations`

Builder significance:
- understanding type errors, generated code, and optimization behavior

---

## 18. Optimization directives

From the manual/exports:
- `inline`
- `noinline`
- `specialize`
- `monomorphize`
- `likely`
- `unlikely`
- `unsafe`

Builder significance:
- release/performance tuning once correctness is stable

---

## 19. Testing workflow

From `intro-to-coalton-testing.md`:
- test ASDF subsystem
- `coalton/testing`
- Fiasco integration
- `coalton-fiasco-init`
- `define-test`
- `is`
- `matches`
- `asdf:test-system`

Builder significance:
- the recommended behavioral test workflow for real projects

---

## 20. Example projects and real usage shapes

Examples directory highlights:
- `small-coalton-programs`
- `quil-coalton`
- `thih`
- `fractal`
- `coalton-testing-example-project`

Builder significance:
- practical reference architectures beyond toy snippets

---

## 21. Common Lisp differences and incomplete features

From the whirlwind tour:
- quirks and differences from Common Lisp
- incomplete features

Builder significance:
- prevents bad assumptions when porting Lisp habits directly into Coalton

---

## Required minimum policy for this skill

When the user asks broadly what Coalton has or what it can do, the answer must be able to range across:
- project/package/file setup
- core definitions and type modeling
- control flow and pattern matching
- type classes and deriving
- interop and representation control
- config/debug/test/optimization workflows
- broad manual/operator surface

Do not collapse Coalton into just:
- `coalton-toplevel`
- `define-type`
- a few typed functions

That is only the shallow end of the language.
