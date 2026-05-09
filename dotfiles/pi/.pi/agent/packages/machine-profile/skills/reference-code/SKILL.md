---
name: reference-code
description: Use when researching third-party libraries, framework APIs, examples, documentation, or implementation details; also use when the user asks to download source/docs for reference.
---
# Reference Code and Docs

This machine keeps local third-party references in:

- Source repositories: `~/reference/external_src/`
- Documentation snapshots/notes: `~/reference/external_docs/`

## Rules

- When uncertain about how a third-party library/API works, check local reference source/docs before guessing.
- When the user asks to download source for reference, clone or download it under `~/reference/external_src/`.
- When the user asks to download documentation for reference, save it under `~/reference/external_docs/`.
- Keep directory names clear and stable, usually `<host>/<owner>/<repo>` for source and `<library-or-project>/...` for docs.
- Do not vendor reference code into active project repos unless explicitly asked.
- Do not modify reference repositories except to update/fetch them for research.

## Source workflow

1. Search local references first:
   ```bash
   find ~/reference/external_src -maxdepth 4 -type d -iname '*<name>*'
   rg '<symbol-or-api>' ~/reference/external_src
   ```
2. If missing and the user asked to download it, clone into a host/owner/repo path, for example:
   ```bash
   mkdir -p ~/reference/external_src/github.com/<owner>
   git clone https://github.com/<owner>/<repo>.git ~/reference/external_src/github.com/<owner>/<repo>
   ```
3. If already present, prefer `git fetch --all --tags --prune` over recloning.

## Docs workflow

1. Search local docs first:
   ```bash
   find ~/reference/external_docs -maxdepth 4 -type f -iname '*<name>*'
   rg '<term>' ~/reference/external_docs
   ```
2. If the user asks to download docs, save them under `~/reference/external_docs/<project>/` with source URLs and retrieval date.
3. Prefer official docs and primary sources. Keep fetched docs readable as Markdown/text when possible.
