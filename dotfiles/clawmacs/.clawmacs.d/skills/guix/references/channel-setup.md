# Channel Setup — Creating and Maintaining a Guix Channel

A Guix channel is a Git repository containing package modules that extend the package collection available to `guix` commands.

## Minimal channel structure

```
my-channel/
├── .guix-channel          # Channel metadata (optional but recommended)
├── my-channel/
│   └── packages/
│       └── hello.scm      # (my-channel packages hello)
└── README.md
```

## .guix-channel file

Tells Guix where to find package modules and declares dependencies.

### Minimal
```scheme
(channel
 (version 0))
```

### With subdirectory
```scheme
(channel
 (version 0)
 (directory "guix"))
```
This means modules live under `guix/` in the repo. So `(my-channel packages foo)` maps to `guix/my-channel/packages/foo.scm`.

### With dependencies
```scheme
(channel
 (version 0)
 (dependencies
  (channel
   (name guix)
   (url "https://git.savannah.gnu.org/git/guix.git")
   (introduction
    (channel-introduction
     (version 0)
     (commit "...")
     (signer "..."))))))
```

## Module naming rules

1. **Unique namespace** — Use your channel name, NOT `(gnu packages ...)`:
   ```scheme
   ;; GOOD
   (define-module (my-channel packages foo) ...)

   ;; BAD — conflicts with upstream Guix
   (define-module (gnu packages foo) ...)
   ```

2. **Path must match module** — `(my-channel packages foo)` must live at `my-channel/packages/foo.scm` (relative to the channel root or configured directory).

3. **Each module file** must:
   - Start with `define-module`
   - Use `#:use-module` for all imports
   - Export packages with `define-public`

## Package module boilerplate

```scheme
(define-module (my-channel packages foo)
  #:use-module (guix packages)
  #:use-module (guix download)
  #:use-module (guix build-system gnu)
  #:use-module ((guix licenses) #:prefix license:))

(define-public foo
  (package
    (name "foo")
    (version "1.0")
    (source (origin
              (method url-fetch)
              (uri (string-append "https://example.com/foo-" version ".tar.gz"))
              (sha256
               (base32 "0000000000000000000000000000000000000000000000000000"))))
    (build-system gnu-build-system)
    (synopsis "A foo package")
    (description "This package provides foo.")
    (home-page "https://example.com/foo")
    (license license:gpl3+)))
```

## Testing locally

### Build a package from the channel checkout
```bash
cd /path/to/my-channel
guix build -L. foo
```

If `.guix-channel` specifies `(directory "guix")`:
```bash
guix build -L guix foo
```

### Lint
```bash
guix lint -L. foo
```

### Time-machine test (full channel simulation)
```bash
guix time-machine -C channels.scm -- build foo
```

Where `channels.scm` contains:
```scheme
(list (channel
       (name 'my-channel)
       (url "file:///path/to/my-channel")))
```

## Publishing

### For users to add your channel

Tell them to add to `~/.config/guix/channels.scm`:
```scheme
(cons (channel
       (name 'my-channel)
       (url "https://github.com/user/my-channel"))
      %default-channels)
```

Then: `guix pull`

### Channel authentication (optional but recommended)

1. Create `.guix-authorizations` in the repo root:
```scheme
(authorizations
 (version 0)
 (("FINGERPRINT" (name "Your Name"))))
```

2. Sign commits with GPG.

3. Provide an introduction in `channels.scm`:
```scheme
(channel
 (name 'my-channel)
 (url "https://...")
 (introduction
  (make-channel-introduction
   "<first-signed-commit>"
   (openpgp-fingerprint "XXXX XXXX XXXX ..."))))
```

## Example local channel layout

If you keep a local Guix channel checkout, it can serve as a real-world example. One such layout is `~/projects/gaurix/`:

```
gaurix/
├── .guix-channel           # (channel (version 0) (directory "guix"))
├── channels.scm            # For local testing
├── guix/
│   └── gaurix/
│       ├── packages/       # Package definitions
│       │   ├── hello-gaurix.scm
│       │   └── sunshine-bin.scm
│       └── services.scm    # Service definitions
├── scripts/                # Helper scripts
├── tests/                  # Test scaffolding
└── data/                   # AUR metadata cache
```

Testing: `guix time-machine -C channels.scm -- build hello-gaurix`

## Common mistakes

1. **Module path doesn't match filesystem** — Guile will fail to find the module.
2. **Using `(gnu packages ...)` namespace** — Conflicts with upstream Guix.
3. **Forgetting `.guix-channel`** — Without it, Guix looks for modules at repo root.
4. **Not committing** — `guix time-machine` and `guix pull` work on committed Git state.
5. **Circular dependencies** — Channel A depends on B which depends on A.
