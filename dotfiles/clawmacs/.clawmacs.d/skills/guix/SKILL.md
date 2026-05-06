---
name: guix
description: Use when users want to define, build, lint, or debug GNU Guix packages; create or maintain Guix channels; write system/service configurations; work with G-expressions; use `guix import`, `guix refresh`, `guix lint`, or other packaging CLI tools; or broadly understand the Guix packaging model (origins, build systems, phases, channels, manifests, profiles).
---

# Package and Configure Software with GNU Guix

## Goal

After applying this skill, the Clawmacs agent should reliably write **correct, lint-clean GNU Guix package definitions**, channel modules, and system configurations instead of giving vague "functional package manager" hand-waving or writing half-baked Scheme that ignores Guix's actual API, build-system conventions, G-expression syntax, and channel structure.

Use this skill for:
- writing new package definitions from scratch
- converting packages from other ecosystems (AUR, Nix, Debian, Homebrew, etc.)
- creating and maintaining Guix channels
- build-system selection and phase customization
- origins (download methods, hashes, patches, snippets)
- G-expression authoring and debugging
- `guix import`, `guix lint`, `guix build`, `guix refresh` workflows
- system and service configuration (when relevant to packaging)
- manifests and profiles

## Triggers

Use this skill when the user wants to:
- write or debug a Guix package definition
- create a Guix channel or add packages to an existing channel
- choose the right build system for a package
- customize build phases
- write G-expressions or understand gexp semantics
- run `guix lint`, `guix build -L.`, `guix import`, or `guix refresh`
- convert a package from AUR/Nix/Homebrew/pip/npm/cargo to Guix
- understand origins, hashes, mirrors, or download methods
- write system services or home services
- create or modify manifests and profiles

Do **not** use this skill for:
- generic Guile Scheme questions with no Guix angle
- Nix/NixOS questions where the user explicitly does not want Guix
- system administration tasks that don't involve Guix packaging or configuration

## Core stance

Guix packages are **Guile Scheme code** — they are data structures (records) composed with a functional build model.

That means:
- every field of `package`, `origin`, build-system arguments, and phases must be correct Scheme
- G-expressions (`#~`, `#$`, `#+`, `ungexp`, `ungexp-splicing`) are the staging mechanism — do not confuse them with quasiquote
- build phases run in the **build stratum** (a separate Guile process in the store) — code there cannot reference host-side bindings
- the hash must be correct or the build will fail; always provide instructions for obtaining it
- `guix lint` is the quality gate; all definitions should pass it

Prefer idiomatic Guix patterns. Consult the sidecars for real examples.

## Local resources

### Sidecar references (bundled with this skill)
- `references/package-anatomy.md` — full field-by-field reference for `package` and `origin` records
- `references/build-systems.md` — complete build-system catalog with arguments and examples
- `references/gexp-guide.md` — G-expression syntax, semantics, and common patterns
- `references/channel-setup.md` — creating channels, module layout, testing, and publishing
- `references/packaging-workflow.md` — end-to-end workflow: import → define → lint → build → publish
- `references/phase-cookbook.md` — common build-phase customization recipes
- `examples/gnu-hello.scm` — canonical minimal package (gnu-build-system)
- `examples/python-package.scm` — pyproject-build-system example
- `examples/binary-package.scm` — copy-build-system for prebuilt binaries
- `examples/channel-module.scm` — channel package module boilerplate
- `scripts/validate-skill.sh` — skill self-test

### Guix manual online (use sparingly, prefer sidecars)
- Reference manual: `https://guix.gnu.org/manual/en/`
- Cookbook: `https://guix.gnu.org/cookbook/en/`

### Optional local channel example
- If you keep a local Guix channel checkout, use it as a real-world example for module layout, package namespaces, and `.guix-channel` structure.
- Example location: `~/projects/gaurix/`
- Example package modules: `~/projects/gaurix/guix/gaurix/packages/`
- Example channel metadata: `~/projects/gaurix/.guix-channel`

## Quick workflow

```
1. IDENTIFY what to package (upstream source, language, build tool)
2. READ the relevant sidecar (build-systems.md for build-system choice, package-anatomy.md for fields)
3. CHECK if `guix import` can bootstrap a definition:
   guix import pypi <name>    # Python
   guix import cran <name>    # R
   guix import gem <name>     # Ruby
   guix import crate <name>   # Rust
   guix import hackage <name> # Haskell
   guix import json <file>    # Generic JSON
4. WRITE the package definition in the correct module path
5. LINT: guix lint -L. <package-name>
6. BUILD: guix build -L. <package-name>
7. FIX any issues, iterate
8. COMMIT when clean
```

## Mandatory read order

When this skill is invoked, read these sidecars in order based on the task:

### For writing a new package:
1. `references/package-anatomy.md`
2. `references/build-systems.md` (the section for the relevant build system)
3. `references/packaging-workflow.md`
4. An appropriate example from `examples/`

### For channel work:
1. `references/channel-setup.md`
2. `examples/channel-module.scm`

### For phase customization:
1. `references/phase-cookbook.md`
2. `references/gexp-guide.md`

### For G-expression questions:
1. `references/gexp-guide.md`

## Package definition template

Every package definition must follow this structure:

```scheme
(define-module (namespace packages package-name)
  #:use-module (guix packages)
  #:use-module (guix download)          ; or git-download, etc.
  #:use-module (guix build-system gnu)  ; or appropriate build system
  #:use-module ((guix licenses) #:prefix license:)
  ;; additional modules as needed
  )

(define-public package-name
  (package
    (name "package-name")
    (version "X.Y.Z")
    (source (origin
              (method url-fetch)        ; or git-fetch, etc.
              (uri (string-append "https://example.com/package-" version ".tar.gz"))
              (sha256
               (base32 "0000000000000000000000000000000000000000000000000000"))))
    (build-system gnu-build-system)     ; or appropriate build system
    (native-inputs (list pkg-config))   ; build-time only
    (inputs (list libfoo))              ; runtime deps
    (propagated-inputs (list libbar))   ; deps visible to dependents
    (arguments
     (list #:tests? #t
           #:phases
           #~(modify-phases %standard-phases
               ;; phase modifications here
               )))
    (synopsis "One-line summary (≤80 chars, no period)")
    (description "Multi-sentence description.
Can span multiple lines.  Two spaces after periods per GNU convention.")
    (home-page "https://example.com/package")
    (license license:gpl3+)))
```

## Critical rules

### Hashes
- **Never invent hashes.** Always tell the user how to obtain them:
  - `guix download <url>` (prints hash)
  - `guix hash -x --serializer=nar <directory>` (for git checkouts)
- Use `(base32 "...")` format exclusively
- A placeholder hash like `(base32 "0000...")` is acceptable in a draft but must be flagged

### Inputs
- `inputs` — runtime dependencies (linked, in PATH at runtime)
- `native-inputs` — build-time only (compilers, pkg-config, test frameworks)
- `propagated-inputs` — runtime deps that must be visible to dependents (e.g., Python libraries for importers)
- Use `(list pkg1 pkg2)` syntax (not the deprecated `(list (list "name" pkg))`)

### G-expressions
- `#~(...)` — G-expression (staged code for build stratum)
- `#$var` — ungexp (inject a store reference)
- `#+var` — ungexp for native builds in cross-compilation
- `#$output` — the default output directory
- `#$output:lib` — a named output
- Do **not** use quasiquote (`` ` ``) where gexp is expected

### Build phases
- Always use `modify-phases` to customize, not wholesale replacement
- Common pattern: `(modify-phases %standard-phases (delete 'check))` to skip tests
- Phase procedures receive keyword args: `#:inputs`, `#:outputs`, `#:phases`, etc.
- Use `(assoc-ref inputs "name")` sparingly; prefer `(search-input-file inputs "bin/foo")`

### Lint compliance
- Synopsis: lowercase first word (unless proper noun), no period, ≤80 chars
- Description: full sentences, two spaces after periods, no marketing language
- Home-page: must be a valid URL
- License: must use `(guix licenses)` symbols

### Module naming for channels
- Use a unique namespace: `(my-channel packages foo)`, not `(gnu packages foo)`
- The module path must match the filesystem path relative to the channel root (or the configured subdirectory)

## Common build systems

| Build system | Module | Use for |
|---|---|---|
| `gnu-build-system` | `(guix build-system gnu)` | autotools, configure/make |
| `cmake-build-system` | `(guix build-system cmake)` | CMake projects |
| `meson-build-system` | `(guix build-system meson)` | Meson projects |
| `python-build-system` | `(guix build-system python)` | setup.py (legacy) |
| `pyproject-build-system` | `(guix build-system pyproject)` | pyproject.toml |
| `cargo-build-system` | `(guix build-system cargo)` | Rust/Cargo |
| `go-build-system` | `(guix build-system go)` | Go modules |
| `asdf-build-system/sbcl` | `(guix build-system asdf)` | Common Lisp (SBCL) |
| `node-build-system` | `(guix build-system node)` | Node.js/npm |
| `copy-build-system` | `(guix build-system copy)` | Prebuilt binaries |
| `trivial-build-system` | `(guix build-system trivial)` | Custom/minimal |

See `references/build-systems.md` for the full catalog with arguments.

## Download methods

| Method | Module | Use for |
|---|---|---|
| `url-fetch` | `(guix download)` | Tarballs, single-file downloads |
| `git-fetch` | `(guix git-download)` | Git repositories |
| `svn-fetch` | `(guix svn-download)` | Subversion repos |
| `hg-fetch` | `(guix hg-download)` | Mercurial repos |

### git-fetch example
```scheme
(source (origin
          (method git-fetch)
          (uri (git-reference
                (url "https://github.com/user/repo")
                (commit (string-append "v" version))))
          (file-name (git-file-name name version))
          (sha256
           (base32 "..."))))
```

## Validation checklist

Before declaring a package definition complete:

- [ ] Hash is real (obtained via `guix download` or `guix hash`)
- [ ] `guix lint -L. <name>` passes clean
- [ ] `guix build -L. <name>` succeeds
- [ ] Synopsis is lowercase-start, no period, ≤80 chars
- [ ] Description is full sentences with proper punctuation
- [ ] License symbol matches upstream license
- [ ] Inputs are categorized correctly (native vs runtime vs propagated)
- [ ] Module path matches filesystem path
- [ ] No deprecated API patterns (old-style inputs lists, quasiquote where gexp expected)

## Error recovery

### "hash mismatch"
The specified hash doesn't match the downloaded file. Re-download and re-hash:
```bash
guix download <url>
# Use the printed hash
```

### "unbound variable"
Missing `#:use-module`. Check which module exports the symbol.

### "build phase failed"
Read the build log. Common fixes:
- Missing native-input (add the tool)
- Wrong configure flags (check upstream build docs)
- Tests need network (add `(delete 'check)` or set `#:tests? #f`)

### "module not found" in channel
- Check `.guix-channel` has the correct `directory` field
- Verify module path matches filesystem: `(foo packages bar)` → `foo/packages/bar.scm`
