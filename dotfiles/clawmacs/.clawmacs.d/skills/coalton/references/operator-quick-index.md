# Coalton Operator Quick Index

Use this file when the user asks “which Coalton operator/form do I use for X?” or when the task is narrow enough that operator-page routing is the cheapest path.

Operator docs root:
- `~/external_docs/coalton/docs/manual/site/operators/`

## Core entry points

### `coalton-toplevel`
Use for:
- top-level definitions in files
- `declare`, `define`, `define-type`, `define-class`, etc.

### `coalton`
Use for:
- expression evaluation from Lisp/REPL
- quick experimentation and inspection

## Definitions and declarations

Use these when defining program structure:
- `declare`
- `define`
- `define-type`
- `define-struct`
- `define-type-alias`
- `define-class`
- `define-instance`
- `derive`

Decision rule:
- new value/function → `define`
- sum type → `define-type`
- named fields → `define-struct`
- behavior abstraction → `define-class` + `define-instance`
- surface-name simplification → `define-type-alias`

## Type syntax and type-level tools

Use these when the type story itself is central:
- `arrow` (`->`)
- `constraint-arrow` (`=>`)
- `forall`
- `the`
- `as`, `try-as`, `unwrap-as`
- `type-of`
- `describe-type-of`
- `describe-type-alias`
- `kind-of`

Decision rule:
- constrain or annotate → `declare` / `the`
- inspect inferred type → `type-of`, `describe-type-of`
- inspect type-level kind info → `kind-of`

## Local bindings and core control flow

Use these when structuring normal code:
- `let`
- `let-star`
- `if`
- `when`
- `unless`
- `cond`
- `progn`
- `values`
- `return`

Decision rule:
- recursive/parallel locals → `let`
- ordered locals → `let-star`
- multi-branch condition → `cond`

## Pattern matching and destructuring

Use:
- `match`
- `pattern-bind`
- `wildcard`

When:
- consuming algebraic data
- destructuring tuples/constructors safely

## Functions, lambdas, and composition

Use:
- `fn`
- `compose-left`
- `compose-right`
- `pipe`
- `nest`
- `and`
- `or`

When:
- explicit lambdas are needed
- composition/pipeline style clarifies the code

Practical rule:
- Coalton is fixed-arity, so use `fn` explicitly rather than assuming Haskell-style auto-currying

## Iteration and imperative loops

Use:
- `rec`
- `for`
- `for-star`
- `break`
- `continue`

Decision rule:
- named recursive loop → `rec`
- imperative loop with parallel step semantics → `for`
- imperative loop with sequential step semantics → `for-star`

## Collections, associations, and do-notation

Use:
- `collection-builder`
- `association-builder`
- `do`
- `do-bind` (`<-`)

When:
- building collections fluently
- sequencing monadic actions

## Dynamic variables and Lisp interop

Use:
- `dynamic-bind`
- `lisp`
- `repr`
- `keyword-tail`

When:
- dynamically rebinding variables
- escaping into raw Lisp
- controlling runtime representation
- dealing with keyword-bearing function interfaces

## Exceptions and resumptions

Use:
- `define-exception`
- `throw`
- `catch`
- `define-resumption`
- `resumable`
- `resume-to`

When:
- nontrivial control/error flow is needed

## Optimization directives and hints

Use:
- `inline`
- `noinline`
- `specialize`
- `monomorphize`
- `likely`
- `unlikely`
- `unsafe`

Practical rule:
- only use these after semantics and tests are stable

## Debugging and codegen inspection

Use:
- `coalton-codegen`
- `coalton-codegen-ast`
- `coalton-codegen-types`
- `pprint-coalton-codegen`
- `pprint-coalton-codegen-ast`
- `pprint-coalton-codegen-types`
- `print-specializations`
- `set-type-printing-mode`

When:
- type inference, code generation, or specialization behavior is confusing

## Fast decision table

| Need | Start with |
|---|---|
| Define top-level code | `coalton-toplevel` |
| Evaluate at REPL | `coalton` |
| New function/value | `define` + `declare` |
| Sum type | `define-type` |
| Named-field product type | `define-struct` |
| Type class | `define-class` / `define-instance` |
| Pattern matching | `match` |
| Local bindings | `let` / `let-star` |
| Recursive loop | `rec` |
| Imperative loop | `for` / `for-star` |
| Monadic sequencing | `do` / `<-` |
| Lisp interop | `lisp` / `repr` |
| Debug inferred type | `type-of`, `describe-type-of` |
| Optimize hot path | `inline`, `specialize` |
| Inspect generated code | codegen operators |
