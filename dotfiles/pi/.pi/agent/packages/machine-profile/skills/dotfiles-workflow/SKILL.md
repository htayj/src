---
name: dotfiles-workflow
description: Use when editing shell config, editor config, git config, terminal config, Pi config, or any dotfiles/system configuration managed by this machine's dotfiles repo.
---
# Dotfiles Workflow

"Dotfiles" means any user/system configuration file managed for this machine, not only hidden files. This includes shell/editor/terminal/git/Pi/tool configs and other non-secret config files. Dotfiles live in `~/src/dotfiles` and are managed with GNU `stow`.

Secrets storage is explicitly excluded: do not put secrets, tokens, private keys, password-store data, credential files, or other sensitive material in the dotfiles repo unless the repo already contains an approved encrypted-secret mechanism and the user explicitly asks for it.

## Rules

- Treat any non-secret config file as a dotfile candidate, even if it is not hidden or not under `$HOME`.
- Do not edit managed config files directly in their deployed location when the corresponding source exists in `~/src/dotfiles`.
- Edit the source file under `~/src/dotfiles`.
- After updating dotfiles, run an appropriate `stow` command from `~/src/dotfiles` to apply/symlink changes.
- Review `git diff` in `~/src/dotfiles` before committing.
- Commit and push dotfile updates unless the user explicitly says not to.
- Never commit secrets, tokens, private keys, or machine-local credentials.

## Procedure

1. Inspect the dotfiles repo:
   ```bash
   cd ~/src/dotfiles && git status --short
   ```
2. Locate the package/file that owns the desired home config.
3. Edit files under `~/src/dotfiles`.
4. Apply with stow from the repo root. Use the package name(s) that match the changed files, for example:
   ```bash
   cd ~/src/dotfiles && stow <package>
   ```
5. Verify the result in both the source repo and the target home path.
6. Commit and push:
   ```bash
   cd ~/src/dotfiles
   git diff
   git status --short
   git add <changed-files>
   git commit -m "Update <area> dotfiles"
   git push
   ```

If the correct stow package is unclear, list top-level directories in `~/src/dotfiles` and inspect existing symlinks before applying.
