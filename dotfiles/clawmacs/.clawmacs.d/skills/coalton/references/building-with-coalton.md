# Building with Coalton

This file is the practical companion to the main skill.
Use it when the question is not merely “what is Coalton?” but “how should I actually structure the code and project?”

For full minimum coverage of the language/workflow surface, pair this file with:
- `references/full-feature-map.md`
- `references/docs-corpus-map.md`
- `references/example-project-map.md`
- `references/operator-quick-index.md`
- `references/project-workflow-translation.md`

## What Coalton gives you in practice

### 1. A typed language embedded in Common Lisp

Coalton is embedded in Lisp and compiles to Lisp.
That means project structure still matters:
- ASDF systems
- Common Lisp packages
- readtables
- interop boundaries

Core entry points:
- `coalton-toplevel`
- `coalton`

Practical rule:
- definitions live in `coalton-toplevel`
- expression evaluation from Lisp/REPL uses `coalton`

### 2. Project structure and file conventions

Use:
- `#:coalton` in `:depends-on`
- optionally `#:coalton-asdf` and `:ct-file` for Coalton-heavy files
- `named-readtables:in-readtable coalton:coalton` in ordinary `.lisp` files

Practical rule:
- if the file is mostly Coalton, `.ct` is often cleaner
- if the file is mixed or Lisp-heavy, plain `.lisp` is fine

### 3. Package discipline

The docs explicitly recommend:
- `:use #:coalton`
- usually `:use #:coalton-prelude`
- local nicknames for standard-library packages
- **do not** `:use #:cl` / `#:common-lisp` in Coalton packages

Practical rule:
- qualify Common Lisp symbols with `cl:` when needed
- keep package setup explicit and tidy

### 4. Types, structs, aliases, and declarations

Core forms:
- `define`
- `declare`
- `define-type`
- `define-struct`
- `define-type-alias`

Use when:
- modeling domain concepts
- making interfaces explicit
- documenting intent via types

Practical rule:
- model the types first for a new module
- add `declare` forms early so the code communicates intent clearly

### 5. Type classes and instances

Core forms:
- `define-class`
- `define-instance`
- `derive`

Use when:
- the domain has reusable behavior abstractions
- ad hoc polymorphism is the right fit
- deriving standard behavior is available

Practical rule:
- use type classes when they clarify semantics, not just to imitate Haskell for sport

### 6. Pattern matching and control flow

Core forms:
- `match`
- `let`, `let*`
- `if`, `when`, `unless`, `cond`
- `rec`
- `for`, `for*`
- `return`, `values`, `progn`

Use when:
- destructuring algebraic data
- encoding recursive/iterative logic
- writing clear, typed control flow

Practical rule:
- reach for `match` first when the domain model is algebraic
- use `rec` or `for` intentionally instead of forcing everything into one style

### 7. Fixed arity and explicit currying

A major Coalton-specific semantic point from the whirlwind tour:
- functions are fixed-arity
- partial application/currying is not automatic
- if you want currying, return functions explicitly with `fn`

Practical rule:
- do not write Haskell-shaped code that assumes auto-currying

### 8. Builders, immutable collections, and notation

Coalton includes:
- collection builders
- association builders
- immutable sequences/maps
- `do` notation
- convenience operators and pipeline helpers

Use when:
- the data flow is naturally collection-oriented or monadic
- the notation clarifies code rather than obscures it

### 9. Lisp interop and representation control

Core tools:
- `lisp`
- `repr`
- `call-coalton-function`
- the `coalton` operator from Lisp

Important representation choices:
- `:lisp`
- `:enum`
- `:transparent`
- `:native`

Use when:
- you need to call into existing Lisp libraries
- you need predictable Lisp-visible runtime representation
- you want a Coalton type over a native Lisp object

Practical rule:
- keep the boundary explicit and documented
- use the interop guarantees from the manual, not wishful thinking

### 10. Development mode vs release mode

Coalton has meaningful mode differences.

Development mode:
- favors redefinition and interactive work
- disables some optimizations

Release mode:
- freezes/optimizes more aggressively
- changes representation details and optimization behavior

Practical rule:
- develop in development mode
- test release mode before promising behavior/performance
- do not mix modes in one compiled build

### 11. Debugging and introspection

Useful tools:
- `type-of`
- `describe-type-of`
- `kind-of`
- `coalton-codegen`
- `coalton-codegen-ast`
- `coalton-codegen-types`
- `pprint-coalton-codegen`
- `print-specializations`

Practical rule:
- if the program or typechecker feels mysterious, inspect the types and generated code

### 12. Testing workflow

The docs recommend:
- ASDF test subsystem
- `coalton/testing`
- Fiasco integration
- `define-test`, `is`, `matches`
- `asdf:test-system`

Practical rule:
- “it compiles” is not the same as “it works”

### 13. Optimization and specialization

Coalton supports:
- `inline`
- `noinline`
- `specialize`
- `monomorphize`
- config knobs for specialization/inlining/type annotations

Practical rule:
- only optimize after the semantics and tests are solid
- keep a clear separation between optimization work and basic correctness work

## Design decision table

| If you need... | Start with... | Then add... |
|---|---|---|
| A new Coalton project | ASDF + package + `coalton-toplevel` | `.ct` files, local nicknames, tests |
| A typed domain model | `define-type` / `define-struct` / `declare` | `match`, aliases, instances |
| Reusable behavior abstraction | `define-class` / `define-instance` | `derive`, functional dependencies if needed |
| Host library interop | `lisp` + manual interop rules | `repr` decisions, native wrappers |
| REPL experimentation | `coalton` in `#:coalton-user` | codegen/type inspection |
| Performance work | config + `inline`/`specialize` | release-mode testing, codegen inspection |
| Testable project workflow | test ASDF subsystem + `coalton/testing` | `is`, `matches`, Fiasco package wiring |

## Common anti-patterns

### Anti-pattern: treat Coalton as just Haskell in different syntax
Better:
- follow Coalton's actual fixed-arity, Lisp-embedded semantics

### Anti-pattern: smear Lisp and Coalton together without a boundary
Better:
- make interop and representation choices explicit

### Anti-pattern: ignore package/readtable setup
Better:
- set up ASDF, packages, and files correctly first

### Anti-pattern: optimize too early
Better:
- stabilize semantics and tests before tuning specialization/inlining

### Anti-pattern: assume types eliminate the need for tests
Better:
- add the documented test subsystem and write real tests
