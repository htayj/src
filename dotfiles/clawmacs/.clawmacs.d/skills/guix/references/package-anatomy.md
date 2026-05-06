# Package Anatomy — Field-by-Field Reference

## `package` record

Defined in `(guix packages)`. All fields:

### Required fields

| Field | Type | Description |
|---|---|---|
| `name` | string | Package name. Lowercase, hyphens for separators. |
| `version` | string | Version string (e.g., `"1.2.3"`). |
| `source` | `origin` or `#f` | Where to get the source. `#f` only for virtual/meta packages. |
| `build-system` | `<build-system>` | Which build system to use (e.g., `gnu-build-system`). |
| `synopsis` | string | One-line summary. Lowercase start (unless proper noun), no period, ≤80 chars. |
| `description` | string | Multi-sentence description. Two spaces after periods (GNU style). |
| `home-page` | string | Upstream URL. Must be valid. |
| `license` | license or list | From `(guix licenses)`. Use `license:gpl3+`, `license:expat`, etc. |

### Optional fields

| Field | Type | Default | Description |
|---|---|---|---|
| `arguments` | list | `'()` | Keyword arguments passed to the build system. |
| `inputs` | list of packages | `'()` | Runtime dependencies. |
| `native-inputs` | list of packages | `'()` | Build-time-only dependencies. |
| `propagated-inputs` | list of packages | `'()` | Runtime deps that must propagate to dependents. |
| `outputs` | list of strings | `'("out")` | Named outputs (e.g., `'("out" "lib" "doc")`). |
| `native-search-paths` | list | `'()` | Search path specifications. |
| `search-paths` | list | `'()` | Search paths for dependents. |
| `replacement` | package or `#f` | `#f` | Grafted replacement for security updates. |
| `properties` | alist | `'()` | Metadata properties (e.g., `(hidden? . #t)`). |
| `location` | location or `#f` | auto | Source location (usually auto-detected). |
| `supported-systems` | list of strings | all | e.g., `'("x86_64-linux" "aarch64-linux")`. |

## `origin` record

Defined in `(guix packages)`. Fields:

| Field | Type | Required | Description |
|---|---|---|---|
| `method` | procedure | yes | Download method: `url-fetch`, `git-fetch`, etc. |
| `uri` | string or object | yes | URL string or `git-reference`, etc. |
| `sha256` | bytevector | yes | Hash of downloaded content. Use `(base32 "...")`. |
| `file-name` | string or `#f` | no | Override the stored file name. Use `(git-file-name name version)` for git. |
| `patches` | list of file-likes | `'()` | Patches to apply. |
| `snippet` | sexp or `#f` | `#f` | Scheme code to modify source (runs in build stratum). |
| `modules` | list | `'()` | Extra modules available to the snippet. |
| `patch-flags` | list of strings | `'("-p1")` | Flags for `patch`. |
| `patch-inputs` | list | auto | Inputs for patching. |

## `git-reference` record

Defined in `(guix git-download)`. Fields:

| Field | Type | Description |
|---|---|---|
| `url` | string | Git repository URL. |
| `commit` | string | Commit hash or tag. |
| `recursive?` | boolean | Whether to fetch submodules (default `#f`). |

## Input categories

### `inputs`
Runtime dependencies. Available during build and at runtime. Linked into the package closure.
```scheme
(inputs (list zlib openssl libpng))
```

### `native-inputs`
Build-time only. Not in the runtime closure. Used for compilers, test frameworks, code generators.
```scheme
(native-inputs (list pkg-config python-pytest))
```

### `propagated-inputs`
Like `inputs` but also made available to packages that depend on this one. Essential for:
- Python libraries (importers need transitive deps in `GUIX_PYTHONPATH`)
- Shared libraries that expose their deps in public headers
```scheme
(propagated-inputs (list python-numpy))
```

## License symbols

Common licenses from `(guix licenses)` (always prefix with `license:`):

| Symbol | License |
|---|---|
| `license:gpl2` | GPL 2.0 only |
| `license:gpl2+` | GPL 2.0 or later |
| `license:gpl3` | GPL 3.0 only |
| `license:gpl3+` | GPL 3.0 or later |
| `license:lgpl2.1` | LGPL 2.1 only |
| `license:lgpl2.1+` | LGPL 2.1 or later |
| `license:lgpl3+` | LGPL 3.0 or later |
| `license:agpl3+` | AGPL 3.0 or later |
| `license:expat` | MIT/Expat |
| `license:bsd-2` | 2-clause BSD |
| `license:bsd-3` | 3-clause BSD |
| `license:asl2.0` | Apache 2.0 |
| `license:isc` | ISC |
| `license:mpl2.0` | Mozilla Public License 2.0 |
| `license:cc0` | Creative Commons Zero |
| `license:public-domain` | Public domain |
| `license:unlicense` | Unlicense |
| `license:zlib` | zlib |
| `license:x11` | X11 |

For multiple licenses: `(list license:gpl3+ license:lgpl2.1+)`
