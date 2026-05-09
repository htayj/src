# machine-profile

Local Pi package for machine-specific preferences and resources.

## Contents

- `extensions/machine-profile.ts` — appends a concise internal machine-profile advisory to each turn.
- `skills/dotfiles-workflow` — how to edit dotfiles under `~/src/dotfiles` with GNU stow and commit/push changes.
- `skills/reference-code` — how to use and populate local third-party source/docs caches.
- `prompts/dotfiles-change.md` — manual workflow for dotfile edits.
- `prompts/reference-library.md` — manual workflow for library/source/docs research.

## Key facts

- Dotfiles means any non-secret user/system configuration file for this machine, not only hidden files.
- Dotfiles live in `~/src/dotfiles` and are managed with `stow`.
- Secrets storage is excluded from dotfiles: do not store tokens, private keys, credentials, password-store data, or sensitive material there.
- When dotfiles are updated, commit and push the dotfiles repo unless the user says not to.
- Third-party reference source lives in `~/reference/external_src/`.
- Third-party reference docs live in `~/reference/external_docs/`.
- When asked to download reference material, store it under those directories.
- When uncertain about library/API behavior, check local reference source/docs before guessing.
