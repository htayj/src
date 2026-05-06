# Build Systems Reference

Every Guix package specifies a build system that defines how to configure, build, test, and install it. Build systems also provide implicit inputs (compilers, core utilities, etc.).

## gnu-build-system

**Module:** `(guix build-system gnu)`

The default for autotools and similar `./configure && make && make install` workflows.

**Implicit inputs:** GCC, Coreutils, Bash, Make, Diffutils, grep, sed, gawk, tar, gzip, bzip2, xz, patch, etc.

**Key arguments:**
- `#:configure-flags` — list of strings passed to `./configure`
- `#:make-flags` — list of strings passed to `make`
- `#:tests?` — boolean, default `#t`
- `#:test-target` — string, default `"check"`
- `#:parallel-build?` — boolean, default `#t`
- `#:parallel-tests?` — boolean, default `#t`
- `#:phases` — alist of build phases (use `modify-phases`)
- `#:out-of-source?` — boolean, default `#f`
- `#:validate-runpath?` — boolean, default `#t`
- `#:allowed-references` / `#:disallowed-references` — reference checking

**Standard phases:** `unpack`, `bootstrap`, `patch-usr-bin-file`, `patch-source-shebangs`, `configure`, `build`, `check`, `install`, `patch-shebangs`, `strip`, `validate-runpath`, `compress-documentation`, etc.

## cmake-build-system

**Module:** `(guix build-system cmake)`

For CMake projects. Inherits from `gnu-build-system`.

**Additional implicit inputs:** `cmake`

**Key arguments:**
- `#:configure-flags` — list of strings (passed as `-D` flags)
- `#:build-type` — string, default `"RelWithDebInfo"`
- `#:tests?` — boolean, default `#t`
- `#:test-target` — string, default `"test"`

**Note:** Configure flags are CMake variables: `(list "-DBUILD_SHARED_LIBS=ON")`

## meson-build-system

**Module:** `(guix build-system meson)`

For Meson projects.

**Additional implicit inputs:** `meson`, `ninja`

**Key arguments:**
- `#:configure-flags` — list of strings
- `#:build-type` — string, default `"debugoptimized"`
- `#:tests?` — boolean, default `#t`

## pyproject-build-system

**Module:** `(guix build-system pyproject)`

For modern Python packages with `pyproject.toml`. Preferred over `python-build-system` for new packages.

**Additional implicit inputs:** `python`, build backends

**Key arguments:**
- `#:tests?` — boolean, default `#t`
- `#:test-backend` — symbol: `'pytest`, `'unittest`, `'nose`
- `#:test-flags` — list of strings passed to the test runner
- `#:build-backend` — symbol or `#f` (auto-detected from pyproject.toml)

**Convention:** Package name should be prefixed with `python-`.

## python-build-system (legacy)

**Module:** `(guix build-system python)`

For `setup.py`-based Python packages. Use `pyproject-build-system` for new packages.

## cargo-build-system

**Module:** `(guix build-system cargo)`

For Rust/Cargo projects.

**Additional implicit inputs:** `rust`, `rust:cargo`

**Key arguments:**
- `#:cargo-inputs` — DEPRECATED (use `inputs` instead)
- `#:cargo-development-inputs` — DEPRECATED (use `native-inputs`)
- `#:install-source?` — boolean, default `#t`
- `#:tests?` — boolean, default `#t`

**Convention:** Package name should be prefixed with `rust-`.

## go-build-system

**Module:** `(guix build-system go)`

For Go modules.

**Key arguments:**
- `#:import-path` — string, the Go import path (REQUIRED)
- `#:unpack-path` — string (if different from import-path)
- `#:build-flags` — list of strings
- `#:tests?` — boolean, default `#t`
- `#:install-source?` — boolean, default `#t`

**Convention:** Package name should be prefixed with `go-`. Dots and slashes in import path become hyphens.

## node-build-system

**Module:** `(guix build-system node)`

For Node.js/npm packages.

**Additional implicit inputs:** `node`

**Convention:** Package name should be prefixed with `node-`.

## asdf-build-system/sbcl (and /ecl, /source)

**Module:** `(guix build-system asdf)`

For Common Lisp packages using ASDF.

**Key arguments:**
- `#:asd-files` — list of `.asd` filenames
- `#:asd-systems` — list of system names
- `#:test-asd-file` — test system file

**Convention:** Binary package name prefixed with `sbcl-` (or `ecl-`), source package with `cl-`.

## copy-build-system

**Module:** `(guix build-system copy)`

For prebuilt binaries or simple file installations. No compilation.

**Key arguments:**
- `#:install-plan` — list of `(source target [filters])` tuples

**Example:**
```scheme
(arguments
 (list #:install-plan
       #~'(("bin/mytool" "bin/mytool")
           ("share/" "share/"))))
```

## trivial-build-system

**Module:** `(guix build-system trivial)`

For fully custom builds. No implicit inputs, no standard phases.

**Key arguments:**
- `#:builder` — G-expression for the entire build
- `#:modules` — list of Guile modules available in the builder

**Example:**
```scheme
(arguments
 (list #:builder
       #~(begin
           (use-modules (guix build utils))
           (let ((out (assoc-ref %outputs "out"))
                 (bin (string-append out "/bin")))
             (mkdir-p bin)
             ;; build logic here
             ))))
```

## Other build systems (less common)

| Build system | Module | Use for |
|---|---|---|
| `ant-build-system` | `(guix build-system ant)` | Java/Ant |
| `maven-build-system` | `(guix build-system maven)` | Java/Maven |
| `scons-build-system` | `(guix build-system scons)` | SCons |
| `waf-build-system` | `(guix build-system waf)` | Waf |
| `haskell-build-system` | `(guix build-system haskell)` | Cabal/Haskell |
| `dune-build-system` | `(guix build-system dune)` | OCaml/Dune |
| `ruby-build-system` | `(guix build-system ruby)` | Ruby gems |
| `perl-build-system` | `(guix build-system perl)` | Perl (Makefile.PL/Build.PL) |
| `r-build-system` | `(guix build-system r)` | R/CRAN |
| `texlive-build-system` | `(guix build-system texlive)` | TeX Live |
| `emacs-build-system` | `(guix build-system emacs)` | Emacs packages |
| `font-build-system` | `(guix build-system font)` | Font files |
| `channel-build-system` | — | Internal Guix use |
