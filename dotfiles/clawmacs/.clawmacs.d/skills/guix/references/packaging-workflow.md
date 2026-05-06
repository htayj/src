# Packaging Workflow — End to End

## Step 1: Identify the package

Gather:
- **Upstream URL** (source tarball, git repo, etc.)
- **Build system** (autotools? cmake? meson? python? rust? go?)
- **Dependencies** (what does it link against / import?)
- **License**
- **Version**

## Step 2: Try `guix import`

Before writing from scratch, check if an importer can bootstrap the definition:

```bash
# Python (PyPI)
guix import pypi <package-name>

# R (CRAN)
guix import cran <package-name>

# Ruby (RubyGems)
guix import gem <package-name>

# Rust (crates.io)
guix import crate <package-name>

# Haskell (Hackage)
guix import hackage <package-name>

# Go
guix import go <module-path>

# ELPA (Emacs)
guix import elpa <package-name>

# CPAN (Perl)
guix import cpan <module-name>

# TeX Live
guix import texlive <package-name>

# Generic JSON
guix import json <file.json>

# Stackage (Haskell)
guix import stackage <package-name>

# Opam (OCaml)
guix import opam <package-name>

# Egg (CHICKEN Scheme)
guix import egg <egg-name>

# Hexpm (Elixir/Erlang)
guix import hexpm <package-name>
```

Importers produce a draft definition on stdout. Review and fix it — they are not perfect.

### Recursive imports
```bash
guix import pypi --recursive <package-name>
```
Generates definitions for the package AND all its missing dependencies.

## Step 3: Get the source hash

### For tarballs:
```bash
guix download https://example.com/foo-1.0.tar.gz
# Prints the hash at the end
```

### For git checkouts:
```bash
git clone --depth 1 --branch v1.0 https://github.com/user/repo /tmp/repo-checkout
guix hash -x --serializer=nar /tmp/repo-checkout
rm -rf /tmp/repo-checkout
```

### Placeholder approach (iterate):
Use a dummy hash, attempt `guix build`, and read the actual hash from the error message:
```
hash mismatch for ...:
  expected hash: 0000000000000000000000000000000000000000000000000000
  actual hash:   1abc...the-real-hash...xyz9
```

## Step 4: Write the definition

Create the module file in the correct path. Use the template from SKILL.md.

Key decisions:
- **Build system** → consult `references/build-systems.md`
- **Inputs** → separate into `inputs`, `native-inputs`, `propagated-inputs`
- **Phases** → consult `references/phase-cookbook.md` for customization
- **License** → consult `references/package-anatomy.md` for symbols

## Step 5: Lint

```bash
guix lint -L. <package-name>
```

Common lint warnings and fixes:
- `synopsis should not start with an upper-case letter` → lowercase the first word
- `synopsis should not end with a period` → remove trailing period
- `home-page should be a valid URL` → fix the URL
- `description should start with a capital letter` → capitalize first word
- `Use HTTPS for ...` → switch to HTTPS mirror

Fix ALL lint warnings before proceeding.

## Step 6: Build

```bash
guix build -L. <package-name>
```

If it fails:
1. Read the build log (path is printed in the error)
2. Check `references/phase-cookbook.md` for common fixes
3. Common issues:
   - Missing dependencies → add to `inputs` or `native-inputs`
   - Tests need network → disable with `#:tests? #f` (document why)
   - Wrong configure flags → check upstream docs
   - Build phase error → customize with `modify-phases`

## Step 7: Test the installed package

```bash
guix build -L. <package-name>
# Run the built binary
/gnu/store/...-package-1.0/bin/command --version
```

Or install temporarily:
```bash
guix shell -L. <package-name> -- command --version
```

## Step 8: Commit and publish

```bash
git add <module-file>.scm
git commit -m "gnu: Add <package-name>."  # Guix convention for upstream
# OR for channels:
git commit -m "Add <package-name> <version>"
```

## Step 9: Update existing packages

```bash
# Check for upstream updates
guix refresh <package-name>

# Auto-update version and hash
guix refresh -u <package-name>
```

## Checklist

- [ ] `guix lint -L.` clean
- [ ] `guix build -L.` succeeds
- [ ] Built binary/library works
- [ ] Synopsis/description follow Guix conventions
- [ ] License matches upstream
- [ ] No unnecessary inputs in closure
- [ ] Committed and pushed
