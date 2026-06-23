---
name: okf-knowledge
description: Use when capturing, searching, reading, writing, or linting local OKF Markdown+YAML knowledge bundles in Pi global or project memory, while keeping secrets out.
---
# OKF Knowledge

Use the OKF tools for durable local Pi memory that should live outside a single
chat transcript.

## Scopes

- `global`: `~/.pi/agent/knowledge` unless `PI_OKF_GLOBAL_ROOT` overrides it.
- `project`: nearest ancestor with `.pi/knowledge`, `.pi/settings.json`, or
  `.git`, then `.pi/knowledge` under that project root.
- `both`: search or lint both roots.

Mutable knowledge bundles are runtime/user data, not stowed dotfiles.

## OKF v0.1

Documents are Markdown files with YAML frontmatter. Only `type` is required;
recommended fields are `title`, `description`, `resource`, `tags`, and
`timestamp`. Unknown fields and unknown types are valid and should be tolerated.
`index.md` and `log.md` are reserved bundle filenames.

The local parser supports simple `key: value` metadata and string lists. It is not
a full YAML parser.

## Preferred workflow

1. Use `okf_roots` if root choice is unclear.
2. Use `okf_search` before adding new durable knowledge.
3. Use `okf_read` for exact files returned by search.
4. Use `okf_write` for concise global or project notes with a non-empty `type`.
5. Use `okf_lint` after adding or changing knowledge files; it also reports
   symlinks and obvious secret-like content.

Never store secrets, tokens, passwords, cookies, private keys, or credentials in
OKF bundles. If content looks credential-like, do not write it; tell the user to
use an appropriate secret store instead. Do not use symlinks inside OKF bundles;
the extension rejects them so reads and writes cannot escape the bundle root.
