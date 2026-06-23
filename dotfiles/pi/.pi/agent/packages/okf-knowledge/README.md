# okf-knowledge

A local Pi package for OKF-style Markdown+YAML knowledge bundles. It exposes tools,
slash commands, and a skill for reusable personal/project notes without adding the
mutable knowledge data to dotfiles.

## Roots

- **Global**: `~/.pi/agent/knowledge` by default. Override with
  `PI_OKF_GLOBAL_ROOT=/path/to/knowledge`.
- **Project**: nearest ancestor of the Pi cwd containing `.pi/knowledge`,
  `.pi/settings.json`, or `.git`, then `<project>/.pi/knowledge`. If no marker is
  found, the current cwd is treated as the project root.

Search, read, roots, and lint do not create roots. Writes create the selected root
and parent directories as needed.

## OKF v0.1 document shape

OKF documents are UTF-8 Markdown files with YAML frontmatter:

```md
---
type: note
title: Example global note
description: Short explanation
resource: https://example.invalid/reference
tags:
  - pi
  - okf
timestamp: 2026-06-23T00:00:00.000Z
---

Markdown body goes here.
```

Only `type` is required. `title`, `description`, `resource`, `tags`, and
`timestamp` are recommended. Unknown fields and unknown `type` values are allowed.
`index.md` and `log.md` are reserved bundle filenames; lint recommends keeping
root-level versions around for bundle summaries and changelogs.

The parser is intentionally dependency-light. It supports simple `key: value`
frontmatter and lists such as `tags:\n  - pi`; it does not implement the full YAML
spec or block scalars.

## Tools

- `okf_roots` — show resolved global/project roots and whether they exist.
- `okf_search` — search `global`, `project`, or `both` by query, `type`, and
  `tags`.
- `okf_read` — read one bundle-relative Markdown file.
- `okf_write` — create, overwrite, or append an OKF document. Requires `type` and
  rejects obvious secret-like content.
- `okf_lint` — check required `type`, simple frontmatter shape, UTF-8, reserved
  filename recommendations, broken bundle-relative Markdown links, symlink
  rejection, and obvious secret-like content.

Example tool inputs:

```json
{ "scope": "global", "path": "notes/pi.md", "type": "note", "tags": ["pi"], "body": "Global reusable Pi note." }
```

```json
{ "scope": "project", "path": "decisions/router.md", "type": "decision", "tags": ["project"], "body": "Project-local decision note." }
```

```json
{ "scope": "both", "query": "router", "tags": ["project"] }
```

```json
{ "scope": "project", "path": "decisions/router.md" }
```

```json
{ "scope": "both" }
```

## Slash commands

- `/okf-roots`
- `/okf-search [global|project|both] <query>`
- `/okf-read <global|project> <path.md>`
- `/okf-write <global|project> <path.md> [type]` — opens Pi's multi-line editor
  with the existing document or a new OKF template.
- `/okf-lint [global|project|both]`

Examples:

```text
/okf-write global notes/pi.md note
/okf-write project decisions/router.md decision
/okf-search both router
/okf-read project decisions/router.md
/okf-lint both
```

## No secrets

Do not put tokens, passwords, private keys, cookies, or credentials in OKF
knowledge. `okf_write` rejects common secret-looking assignments and key formats,
and `okf_lint` reports existing secret-like content without echoing the value, but
these checks are heuristic. Store credentials in the appropriate secret manager or
environment-specific location outside dotfiles and outside OKF bundles.

OKF bundle paths must stay inside their root and must not contain symlinks; the
extension rejects symlinked roots, intermediate directories, and document paths to
avoid reads/writes escaping the bundle.

## Validation

From this package directory:

```sh
npm install --package-lock=false
npm run validate
```
