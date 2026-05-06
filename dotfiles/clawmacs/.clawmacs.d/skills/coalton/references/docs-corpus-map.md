# Coalton Docs Corpus Map

Use this file when the question is broad enough that the skill must range across the **whole `docs/` tree**, not just the whirlwind tour and manual landing page.

Primary local docs root:
- `~/external_docs/coalton/docs/`

This map turns the repository docs tree into a practical routing guide.

---

## 1. Top-level docs index

- `~/external_docs/coalton/docs/README.md`

What it gives you:
- the high-level documentation categories
- the canonical doc entry points beyond the README
- links to tutorials, reference, style, internals, and additional resources

Use when:
- deciding which doc family to consult first
- answering broad “what documentation exists?” questions

---

## 2. Tutorials and user-facing learning docs

### Whirlwind Tour
- `~/external_docs/coalton/docs/manual/site/topics/whirlwind-tour.md`

Use when:
- learning the language workflow
- designing/building normal Coalton modules
- checking day-to-day language constructs and idioms

### Manual landing and topic pages
- `~/external_docs/coalton/docs/manual/site/_index.md`
- `~/external_docs/coalton/docs/manual/site/topics/introduction.md`
- `~/external_docs/coalton/docs/manual/site/topics/configuring-coalton.md`
- `~/external_docs/coalton/docs/manual/site/topics/lisp-interop.md`
- `~/external_docs/coalton/docs/manual/site/topics/debugging.md`

Use when:
- you need the manual's organized operator/topic framing
- you need focused guidance on configuration, interop, or debugging

### Translated intros
- `~/external_docs/coalton/docs/intro-to-coalton.ja.md`
- `~/external_docs/coalton/docs/intro-to-coalton.ru.md`
- `~/external_docs/coalton/docs/intro-to-coalton.ua.md`

Use when:
- translation coverage or non-English documentation context matters

---

## 3. Operator-level reference surface

Manual operator pages live under:
- `~/external_docs/coalton/docs/manual/site/operators/`

These pages give one-page focused guidance for the language operators/forms.

Important operator families include:
- entry points: `coalton`, `coalton-toplevel`
- definitions: `define`, `define-type`, `define-struct`, `define-class`, `define-instance`, etc.
- directives: `declare`, `derive`, `inline`, `specialize`, `repr`, etc.
- type syntax: `->`, `=>`, `forall`, `the`, `&key`
- expressions: `fn`, `lisp`, `match`, `let`, `let*`, `dynamic-bind`, `values`
- control/looping: `for`, `for*`, `rec`, `break`, `continue`, `do`, `return`, `progn`
- exceptions/resumptions: `throw`, `catch`, `resumable`, `resume-to`
- debugging operators: `describe-type-of`, `kind-of`, `print-specializations`, codegen printers

Use when:
- the user asks about one specific operator/form
- you need sharper operator semantics than the whirlwind tour gives

---

## 4. Glossary and naming guidance

### Glossary
- `~/external_docs/coalton/docs/glossary.md`

Use when:
- translating Common Lisp terminology/habits into Coalton terminology
- clarifying naming differences such as `True`/`False`, `None`, predicate naming, `define` vs `defun`, etc.

### Style guide
- `~/external_docs/coalton/docs/style-guide.md`

Use when:
- writing idiomatic Coalton API names
- choosing function/type/type-variable naming
- deciding predicate and side-effect naming style

This is especially relevant when the Clawmacs agent is generating new Coalton libraries or public APIs.

---

## 5. Documentation generation and packaging docs

### Documentation guide
- `~/external_docs/coalton/docs/coalton-documentation-guide.md`

Use when:
- writing docstrings for `define`, `define-type`, `define-class`, `define-struct`, etc.
- improving the quality of generated package/reference docs

### `coalton/doc`
- `~/external_docs/coalton/docs/using-coalton-doc.md`

Use when:
- generating reference docs for Coalton packages
- documenting a Coalton project programmatically

### Package/reference notes
- `~/external_docs/coalton/docs/package.md`

Use when:
- package-level documentation or packaging details are in play

---

## 6. Testing and workflow docs

### Testing
- `~/external_docs/coalton/docs/intro-to-coalton-testing.md`

Use when:
- adding a test subsystem
- wiring `coalton/testing` and Fiasco
- choosing `define-test`, `is`, and `matches`

### Nix docs
- `~/external_docs/coalton/docs/nix.md`
- `~/external_docs/coalton/docs/nix.ja.md`

Use when:
- Coalton environment setup or reproducible dev environments via Nix matter

---

## 7. Iterator-focused reference

- `~/external_docs/coalton/docs/iterator-protocol.md`

Use when:
- the user is working with iterators, traversal, collection pipelines, or lazy forward-only consumption
- `Iterator`, `IntoIterator`, `collect!`, or related iterator semantics matter

This is a more specialized doc than the whirlwind tour and deserves explicit routing.

---

## 8. Internals docs

Root:
- `~/external_docs/coalton/docs/internals/`

Key files:
- `internals.md`
- `how-typeclasses-are-compiled.md`
- `porting-to-other-lisp-environments.md`
- `weak-type-variables.md`

Use when:
- the user wants compiler architecture details
- debugging or extending Coalton internals
- understanding type-class compilation strategy
- porting/supporting Coalton on more Lisps
- understanding type-system corner cases

### Design docs
- `~/external_docs/coalton/docs/internals/design-docs/function-calls.md`
- `~/external_docs/coalton/docs/internals/design-docs/typeclasses.md`

Use when:
- answering implementation-design questions rather than normal user-level coding questions

---

## 9. Manual source structure

- `~/external_docs/coalton/docs/manual/README.md`

Use when:
- understanding how the manual is organized and published
- syncing manual content or contributing docs upstream

This matters if the user wants to modify Coalton docs or mirror their structure.

---

## Routing policy

### For normal project-building questions
Start with:
1. whirlwind tour
2. manual topic page if needed
3. operator page if one form/operator is central
4. testing/config/interop docs as needed

### For style/API questions
Add:
- `glossary.md`
- `style-guide.md`
- `coalton-documentation-guide.md`

### For internals/compiler questions
Jump to:
- `docs/internals/`
- manual debug pages
- source files in `src/`

### For docs-generation questions
Jump to:
- `using-coalton-doc.md`
- `coalton-documentation-guide.md`
- `docs/manual/README.md`

## Required minimum policy

When the user says to use “all of the info in docs,” do **not** stop at:
- `README.md`
- whirlwind tour
- manual landing page

You must also remember the existence of:
- operator pages
- glossary/style/doc-generation docs
- testing docs
- iterator protocol docs
- internals/design-doc docs
- Nix/environment docs
