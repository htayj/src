# Personal Claude Code Instructions

<!-- This file is loaded in every project. Keep it focused on universal preferences. -->
<!-- Project-specific instructions belong in <repo>/CLAUDE.md instead. -->

## Identity & Context

<!-- Who you are, what you work on, your role — helps Claude tailor responses. -->
<!-- Example: "I'm a senior backend engineer working mostly in TypeScript and Go." -->
- I'm a senior fullstack typescript devloper

## Communication Preferences

<!-- How you like Claude to talk to you. -->
<!-- Examples: -->
<!-- - Be concise; skip preamble -->
<!-- - Don't explain things I already know -->
<!-- - Ask before making large changes -->
<!-- - When uncertain, show me options rather than guessing -->
- Be anti-sycophantic — don't fold arguments just because the user pushes back
- Challenge reasoning instead of excessive validation
- No flattery or unnecessary praise
- Don't anthropomorphize 
- When explaining concepts that I dont understand use analogy, metaphor, or alegory to tie things together

## Coding Style & Conventions

<!-- Universal style preferences that apply across all projects. -->
<!-- Examples: -->
<!-- - Prefer functional style over class-based where practical -->
<!-- - Use early returns to reduce nesting -->
<!-- - Prefer named exports over default exports -->
- Always use strict TypeScript (no `any`)
- Never circumvent Typescript types using `as unknown as`

## Tools & Environment

<!-- Your local setup, preferred tools, runtimes. -->
<!-- Examples: -->
<!-- - Shell: bash on Fedora -->
<!-- - Package manager: npm (not yarn/pnpm) -->
<!-- - Editor: VS Code -->
<!-- - Node version: 22.x -->
<!-- - Always use `vitest` not `jest` for new test files -->
- Shell: bash on Fedora
- Editor: emacs
- Terminal: xterm with sixel support
- Diagrams: use ASCII art by default; only use image-based output if explicitly asked
- json parsing: jq
- When curling localhost, use `~/.claude/safer-curl-localhost.sh` instead of `curl` directly — the wrapper rejects any URL not targeting localhost (127.0.0.1, ::1, or localhost).

## Git & Workflow

<!-- How you like to work with version control. -->
<!-- Examples: -->
<!-- - Always run tests before committing -->
- Never force-push without asking
<!-- - Squash commits on feature branches -->
<!-- - Sign commits with GPG -->

## Testing

<!-- Your testing preferences. -->
<!-- Examples: -->
<!-- - Write unit tests for new utility functions -->
<!-- - Prefer integration tests over mocking everything -->
<!-- - Use describe/it blocks, not test() -->

## Things to Avoid

<!-- Anti-patterns or behaviors you don't want. -->
<!-- Examples: -->
<!-- - Don't add comments that just restate the code -->
<!-- - Don't refactor surrounding code unless asked -->
<!-- - Don't suggest installing new dependencies without asking -->
<!-- - Never use `console.log` for debugging in committed code -->
-  The code should document itself. Don't add comments unless the code is structurally very different from code around it and it is unclear what it is doing or how it is doing it.
- **Don't blame; self-blame is fine when appropriate.** In any text someone else will read — MR titles/descriptions, commit messages, code comments, ticket comments, code-review replies — don't attribute a bug, flake, or regression to another colleague. Not by name, and not by proxy through citing "their" ticket or MR. Describing the failure (symptoms, root cause, mechanics) is fine — only the attribution comes off. Self-blame is fine when appropriate ("reverts commit abc123 because it broke X", "fixes the flake we shipped last release"). Non-attribution mentions of others are fine (`@reviewer please look`). Test for any name/ticket/MR/SHA: "is this load-bearing for the reader, or is it just pointing at where the bug came from?" If the latter, drop it.

## Recurring Reminders

<!-- Things you've asked Claude to always remember. -->
<!-- These get added over time via "remember this" requests. -->
