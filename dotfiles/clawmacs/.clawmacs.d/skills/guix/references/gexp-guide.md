# G-Expressions (Gexps) — Syntax and Semantics

G-expressions are Guix's mechanism for **staging code** that runs in the build stratum (the daemon's isolated build environment). They solve the problem of writing code on the host side that references store items and will be serialized into derivation builders.

## Syntax summary

| Syntax | Name | Meaning |
|---|---|---|
| `#~(expr ...)` | gexp | Staged expression — runs in build stratum |
| `#$var` | ungexp | Inject `var` (a package, origin, or derivation) as its store path |
| `#$output` | ungexp output | The default output directory (`"out"`) |
| `#$output:name` | ungexp named output | A specific output (e.g., `#$output:lib`) |
| `#+var` | ungexp-native | Like `#$` but for the native system in cross-compilation |
| `#$@lst` | ungexp-splicing | Splice a list of store items |
| `#~+` | gexp (native) | Staged expression for native system (rare) |

## Key rules

### 1. Gexps are NOT quasiquote
- `#~(...)` is NOT `` `(...) ``
- `#$` is NOT `,`
- They look similar but have completely different semantics
- Gexps track **dependencies** — every `#$pkg` becomes a build input automatically

### 2. Code inside `#~(...)` runs in isolation
- No access to host-side variables (except via `#$`)
- Limited to modules explicitly available in the build stratum
- `(guix build utils)` must be imported with `(use-modules ...)` inside the gexp

### 3. Ungexp resolves to store paths
```scheme
;; If `coreutils` is a package:
#$coreutils  →  "/gnu/store/...-coreutils-9.1"

;; To get a specific file:
(string-append #$coreutils "/bin/ls")
```

### 4. Nested gexps
Gexps can be nested. The inner gexp is lowered to a derivation that the outer gexp references:
```scheme
#~(system* #$(program-file "helper"
               #~(display "I'm a helper script\n")))
```

## Common patterns

### Using build utilities
```scheme
#~(begin
    (use-modules (guix build utils))
    (mkdir-p (string-append #$output "/bin"))
    (copy-recursively "src" (string-append #$output "/share")))
```

### Referencing inputs in phases
```scheme
(arguments
 (list #:phases
       #~(modify-phases %standard-phases
           (add-after 'unpack 'patch-path
             (lambda _
               (substitute* "src/config.h"
                 (("/usr/bin/foo")
                  (string-append #$some-package "/bin/foo"))))))))
```

### Ungexp-splicing
```scheme
;; Expand a list of configure flags
(let ((flags '("--enable-foo" "--disable-bar")))
  #~(list #$@flags))
;; Expands to: (list "--enable-foo" "--disable-bar")
```

### Program-file (create a script in the store)
```scheme
(program-file "my-wrapper"
  #~(begin
      (use-modules (ice-9 popen))
      (execl (string-append #$some-pkg "/bin/tool") "tool" "--flag")))
```

### Computed-file (arbitrary file derivation)
```scheme
(computed-file "my-config"
  #~(begin
      (use-modules (guix build utils))
      (mkdir #$output)
      (call-with-output-file (string-append #$output "/config.ini")
        (lambda (port)
          (format port "[settings]~%key=~a~%" #$some-value)))))
```

### Plain-file (literal text in store)
```scheme
(plain-file "readme.txt" "This is the content.\n")
```

## Anti-patterns

### ❌ Using quasiquote where gexp is expected
```scheme
;; WRONG — will NOT track dependencies
(arguments
 `(#:phases
   (modify-phases %standard-phases ...)))

;; CORRECT — uses gexp
(arguments
 (list #:phases
       #~(modify-phases %standard-phases ...)))
```

### ❌ Referencing host variables inside gexp
```scheme
;; WRONG — `my-var` is not available in build stratum
(let ((my-var "hello"))
  #~(display my-var))

;; CORRECT — use ungexp to inject the value
(let ((my-var "hello"))
  #~(display #$my-var))
```

### ❌ Forgetting to import modules in build stratum
```scheme
;; WRONG — `mkdir-p` is not available without import
#~(mkdir-p "/some/path")

;; CORRECT
#~(begin
    (use-modules (guix build utils))
    (mkdir-p "/some/path"))
```

## Gexp helpers from `(guix gexp)`

| Helper | Purpose |
|---|---|
| `gexp?` | Predicate: is this a gexp? |
| `with-imported-modules` | Make host-side modules available in build stratum |
| `with-extensions` | Add Guile extensions to the build |
| `file-append` | Append a path component to a file-like object |
| `program-file` | Create an executable Guile script in the store |
| `scheme-file` | Create a Scheme file in the store |
| `computed-file` | Create a derived file from a gexp builder |
| `plain-file` | Create a file with literal content |
| `mixed-text-file` | Create a text file with embedded store references |
| `local-file` | Reference a file from the host filesystem |
| `file-union` | Merge multiple file-likes into one directory |
| `directory-union` | Union of directories (like a profile) |
