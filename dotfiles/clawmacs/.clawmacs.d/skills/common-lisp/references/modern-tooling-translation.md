# Common Lisp Cookbook → Modern Tooling Translation

Use this file when the cookbook is right in spirit but clearly old in tooling, runtime assumptions, or ecosystem details.

This file does **not** replace the cookbook.
It translates cookbook guidance into a more current default posture for new Common Lisp work.

## Core translation policy

When adapting cookbook material for fresh code:
- preserve the practical recipe,
- translate old tooling assumptions,
- make implementation constraints explicit,
- do not present historical setup instructions as current best practice.

## 1. Spec vs cookbook vs implementation docs

Use this priority order:
1. **HyperSpec / implementation docs** for normative semantics
2. **Cookbook** for practical recipes and examples
3. **Modern workflow translation** for today-facing tooling choices

So if the cookbook says “here is a practical way,” that is useful.
If the user asks “is this what Common Lisp guarantees?”, do not answer from the cookbook alone.

## 2. Defsystems → modern ASDF

Cookbook chapter:
- `systems.html`

Translation:
- treat cookbook `defsystem` discussion as historical orientation
- for fresh code, default to modern ASDF conventions
- use clean system boundaries, tests, and explicit dependencies

Practical translation:
- “the cookbook explains the older defsystem framing; for new code, implement this as a standard ASDF system”

## 3. Emacs IDE chapter → modern SLIME/SLY posture

Cookbook chapters/files:
- `windows.html`
- `emacs-ide.html`
- `.emacs`
- `s1`–`s24`

Translation:
- ILISP and ELI are historical context, not default 2026 recommendations
- for current Common Lisp in Emacs, default to **SLIME** or **SLY** unless the user requests otherwise
- treat the sample `.emacs` as historical reference/config inspiration, not a drop-in modern config

Practical translation:
- preserve editor workflow ideas (evaluation, navigation, inspection, macroexpansion)
- map the actual commands/workflow into SLIME/SLY-era usage where appropriate

## 4. Old implementation-specific chapters → explicit portability labels

Cookbook chapters:
- `ffi.html`
- `os.html`
- `process.html`
- `win32.html`
- parts of `windows.html`

Translation labels:
- **SBCL-specific**
- **historical implementation-specific**
- **Windows-specific**
- **legacy tooling-specific**

Do not say “Common Lisp does X” when the chapter is really about one runtime or one vendor stack.

## 5. CLOS chapter → still high-value, mostly timeless

Cookbook chapter/files:
- `clos-tutorial/index.html`
- `clos-tutorial/examples.lisp`
- `clos-tutorial/present.lisp`

Translation:
- the tutorial is still high-value conceptually
- preserve the CLOS structure and examples
- modernize surrounding style as needed (project/package layout, tests, declarations)

Practical note for typed or declaration-heavy codebases:
- if the target project expects stronger type declarations or stricter contracts, layer that discipline on top of the CLOS recipe

## 6. Testing chapter → cookbook context, modern library choice

Cookbook chapter:
- `testing.html`

Translation:
- RT is useful historical/testing-context information
- for new projects, it may be more appropriate to use the testing library already standard in the project or implementation ecosystem
- do not erase the RT material; frame it honestly as cookbook-era testing guidance

## 7. FFI and OS integration → modern caution

Cookbook chapters:
- `ffi.html`
- `os.html`
- `win32.html`

Translation:
- keep the examples as reference patterns
- call out that FFI APIs, libraries, and implementation support may differ significantly now
- verify against the target implementation before claiming portability

## 8. Threading chapter → runtime-aware translation

Cookbook chapter:
- `process.html`

Translation:
- thread/mailbox/lock ideas remain useful
- exact APIs and semantics may differ by implementation
- for new code, be explicit about target runtime and libraries

Do not flatten old thread examples into “portable CL threading.”

## 9. Strings/files/io/macros/loop → generally safe recipe core

Cookbook chapters:
- `strings.html`
- `files.html`
- `io.html`
- `macros.html`
- `loop.html`
- `hashes.html`
- `functions.html`

Translation:
- these are often the least problematic chapters to adapt directly
- still modernize style, declarations, and packaging, but the recipe core is usually the main value

## 10. Optional typed overlay for generated Common Lisp code

The cookbook often shows untyped or lightly typed Common Lisp.
For codebases that prefer stronger static discipline, consider overlaying:
- explicit implementation-appropriate type declarations where they materially improve correctness
- a typed sublanguage or stricter contracts for new or critical pure-core modules when the project already uses that approach

So the practical translation is often:
- cookbook recipe for structure/idiom
- project-specific typed discipline for final emitted code

## Example translation patterns

### Example: cookbook systems advice
- Cookbook answer: “see `systems.html` for defsystem basics”
- Modernized answer: “use `systems.html` for conceptual orientation, then implement the project as a standard modern ASDF system”

### Example: cookbook Emacs IDE chapter
- Cookbook answer: “see `emacs-ide.html` and `.emacs`”
- Modernized answer: “the chapter is useful historically; for a current setup, translate the workflow concepts into SLIME/SLY-era Emacs usage”

### Example: cookbook testing chapter
- Cookbook answer: “see `testing.html` and RT”
- Modernized answer: “the chapter gives historical testing context; use it as a baseline, but choose the modern test library that matches the project”

## Required policy

When this sidecar is used:
- do not discard cookbook material just because it is old
- do not present old tooling as the modern default
- preserve the recipe, modernize the delivery
