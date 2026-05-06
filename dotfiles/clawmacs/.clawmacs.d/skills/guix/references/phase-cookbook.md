# Phase Cookbook — Common Build Phase Customizations

Build phases are an ordered alist of named procedures. The `modify-phases` macro lets you add, delete, replace, or reorder phases without rewriting the entire list.

## modify-phases syntax

```scheme
(arguments
 (list #:phases
       #~(modify-phases %standard-phases
           (add-before 'build 'my-phase
             (lambda* (#:key inputs outputs #:allow-other-keys)
               ;; phase body
               ))
           (delete 'check)
           (replace 'install
             (lambda* (#:key outputs #:allow-other-keys)
               ;; custom install
               )))))
```

## Operations

| Operation | Syntax | Effect |
|---|---|---|
| `add-before` | `(add-before 'phase 'new-name proc)` | Insert before `phase` |
| `add-after` | `(add-after 'phase 'new-name proc)` | Insert after `phase` |
| `replace` | `(replace 'phase proc)` | Replace `phase` entirely |
| `delete` | `(delete 'phase)` | Remove `phase` |

## Phase procedure signature

```scheme
(lambda* (#:key inputs outputs #:allow-other-keys)
  ;; `inputs` is an alist of (name . path)
  ;; `outputs` is an alist of (name . path), usually just ("out" . "/gnu/store/...")
  ;; Return #t on success (or any truthy value)
  )
```

## Common recipes

### Skip tests
```scheme
(delete 'check)
```
Or use the argument: `#:tests? #f`

### Disable the configure phase (no configure script)
```scheme
(delete 'configure)
```

### Set environment variables before build
```scheme
(add-before 'build 'set-env
  (lambda _
    (setenv "CC" "gcc")
    (setenv "CFLAGS" "-O2")))
```

### Patch hardcoded paths
```scheme
(add-after 'unpack 'fix-paths
  (lambda* (#:key inputs #:allow-other-keys)
    (substitute* "src/config.c"
      (("/usr/bin/bash")
       (search-input-file inputs "bin/bash"))
      (("/usr/share/data")
       (string-append #$some-package "/share/data")))))
```

### Install files manually
```scheme
(replace 'install
  (lambda* (#:key outputs #:allow-other-keys)
    (let* ((out (assoc-ref outputs "out"))
           (bin (string-append out "/bin"))
           (doc (string-append out "/share/doc/my-pkg")))
      (install-file "my-binary" bin)
      (install-file "README.md" doc))))
```

### Create a wrapper script
```scheme
(add-after 'install 'wrap-program
  (lambda* (#:key inputs outputs #:allow-other-keys)
    (let ((out (assoc-ref outputs "out")))
      (wrap-program (string-append out "/bin/my-tool")
        `("PATH" prefix
          ,(list (string-append (assoc-ref inputs "coreutils") "/bin")))
        `("PYTHONPATH" prefix
          ,(list (string-append (assoc-ref inputs "python-lib") "/lib/python3/site-packages")))))))
```

### Run a custom test suite
```scheme
(replace 'check
  (lambda* (#:key tests? #:allow-other-keys)
    (when tests?
      (invoke "python" "-m" "pytest" "tests/" "-v"))))
```

### Add a post-install step
```scheme
(add-after 'install 'install-completions
  (lambda* (#:key outputs #:allow-other-keys)
    (let ((bash-completion (string-append (assoc-ref outputs "out")
                                         "/share/bash-completion/completions")))
      (mkdir-p bash-completion)
      (copy-file "completions/my-tool.bash"
                 (string-append bash-completion "/my-tool")))))
```

### Patch shebangs before build
```scheme
(add-after 'unpack 'fix-shebangs
  (lambda _
    (substitute* "scripts/generate.sh"
      (("#!/bin/bash") (string-append "#!" (which "bash"))))))
```

### Skip specific failing tests
```scheme
(add-before 'check 'disable-flaky-tests
  (lambda _
    (substitute* "tests/Makefile"
      (("test_network") "")
      (("test_dns") ""))))
```

### Set RPATH or fix library paths
```scheme
(add-after 'install 'fix-rpath
  (lambda* (#:key outputs #:allow-other-keys)
    (let ((lib (string-append (assoc-ref outputs "out") "/lib")))
      (for-each
       (lambda (file)
         (invoke "patchelf" "--set-rpath" lib file))
       (find-files lib "\\.so$")))))
```

## Useful build-side utilities

These are available after `(use-modules (guix build utils))` in the build stratum:

| Procedure | Purpose |
|---|---|
| `substitute*` | Regex-based file content replacement |
| `install-file` | Copy a file to a directory (creates dir if needed) |
| `copy-recursively` | Recursive directory copy |
| `mkdir-p` | Create directory with parents |
| `find-files` | Find files matching a pattern |
| `which` | Find executable in PATH |
| `invoke` | Run a program (raises on non-zero exit) |
| `with-directory-excursion` | Execute body in a different directory |
| `wrap-program` | Create a wrapper that sets environment variables |
| `patch-shebang` | Fix a single shebang line |
| `search-input-file` | Find a file in inputs by relative path |
| `delete-file-recursively` | Remove a directory tree |
| `chdir` | Change directory |
