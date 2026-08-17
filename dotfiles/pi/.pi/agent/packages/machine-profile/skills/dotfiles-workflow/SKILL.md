---
name: dotfiles-workflow
description: Use when editing shell, editor, git, terminal, Pi, Guix Home, Guix System, or other configuration managed in ~/src. Routes basedbox changes through Guix and other hosts through GNU Stow.
---
# Dotfiles Workflow

"Dotfiles" means any user/system configuration file managed for this machine, not only hidden files. Sources live under `~/src`; user configuration is usually under `~/src/dotfiles` and Guix configuration under `~/src/guix-config` or `~/src/config-k8-plus.scm`.

Secrets storage is explicitly excluded: do not put secrets, tokens, private keys, password-store data, credential files, or other sensitive material in the dotfiles repo unless the repo already contains an approved encrypted-secret mechanism and the user explicitly asks for it.

## Route by host

Run `hostname` before choosing an activation workflow.

### basedbox

`basedbox` is Guix System. Guix Home owns the deployed dotfile symlinks, so do not run `stow` there and do not edit store-backed files under `$HOME`.

- Workstation Home entry point: `~/src/guix-config/home-workstation-configuration.scm`
- Shared Home module: `~/src/guix-config/modules/tay/home-common.scm`
- System entry point: `~/src/config-k8-plus.scm`
- Pinned channels: `~/src/guix-config/channels.scm`
- Dotfile sources: `~/src/dotfiles`
- Git root for all of the above: `~/src`

Use `rbh` after user-level or dotfile changes. It runs the pinned workstation Home reconfiguration:

```bash
rbh
```

Use `rbs` only when the system package set, boot configuration, hardware, or system services changed:

```bash
rbs
```

Before activation, inspect the focused diff and build or dry-run when the change could affect package resolution. Prefer substitutes and stop before a large source build.

```bash
git -C ~/src diff -- <changed-paths>
guix time-machine -C ~/src/guix-config/channels.scm -- \
  home build --dry-run -L ~/src/guix-config/modules \
  ~/src/guix-config/home-workstation-configuration.scm
```

Keep the previous working Home/System generations until the new generation passes real-session checks. Use `guix home describe`, `guix home roll-back`, and `guix home switch-generation` for Home inspection and rollback.

Never activate `~/src/guix-config/home-configuration.scm`; it is the legacy, broken Home configuration. Do not apply basedbox Guix configurations to `basedserv`. Do not update channels or add a channel merely to obtain one package unless the user explicitly requests it.

### Other hosts

On hosts where GNU Stow still owns deployed files, edit the source under `~/src/dotfiles` and apply only the affected package:

```bash
cd ~/src/dotfiles && stow <package>
```

Do not assume this Stow workflow applies to `basedbox`.

## Procedure

1. Identify the host and inspect the shared worktree:
   ```bash
   hostname
   git -C ~/src status --short
   ```
2. Locate and read the source that owns the deployed configuration.
3. Preserve unrelated dirty-worktree changes; edit only the required source files.
4. Validate syntax and run the narrowest relevant test.
5. Activate through `rbh`/`rbs` on `basedbox`, or the affected Stow package elsewhere.
6. Verify the deployed target and exercise the changed program or session.
7. Review `git -C ~/src diff -- <changed-paths>` and `git -C ~/src status --short`.
8. Commit or push only when the user explicitly requests it. Stage only named files.

Never commit secrets, tokens, private keys, machine-local credentials, generated caches, or decrypted SOPS output.
