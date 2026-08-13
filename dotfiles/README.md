# Dotfiles

This tree is the standalone GNU Stow source for user dotfiles in `/home/tay`.
It is intentionally separate from `/home/tay/src/guix-config/dotfiles`.

Install all packages:

```sh
stow -d ~/src/dotfiles -t ~ home x11 stumpwm sway emacs config keyboard claude pi
```

Install one package:

```sh
stow -d ~/src/dotfiles -t ~ emacs
```

Managed packages:

- `home`: shell and top-level user config files.
- `x11`: X resources, X init, GTK 2, and screen layout scripts.
- `stumpwm`: the live StumpWM rc file.
- `sway`: the Sway session — compositor config (`~/.config/sway`, split into
  numbered `config.d` fragments plus a per-host output fragment), the supporting
  app configs it owns (`waybar`, `swaylock`, `mako`, `fuzzel`, `kanshi`,
  `xdg-desktop-portal-wlr`), and its helper scripts in `~/.local/bin`. Bindings
  are sway's shipped defaults (the i3 vocabulary) on top of the Space Cadet
  keymap, where `$mod`/Mod3 is RALT — held on either Kinesis thumb key. Parallel
  to `x11`+`stumpwm` rather than replacing them; both sessions coexist and SDDM
  offers each. Design notes and rationale live in `sway-plan.md`; the package
  list is in `sway-install.md`.
- `emacs`: selected editable Emacs config files inside `~/.emacs.d`.
- `config`: selected editable XDG config under `~/.config`, including shell,
  desktop, terminal, GTK, KDE/LXQt, keyboard, and small tool config.
- `keyboard`: keyboard setup scripts and Kinesis layout files. The Space
  Cadet-inspired Kanata/XKB assets live in the
  `keyboard/manna-cadet` submodule and are symlinked into the package
  for stow compatibility.
- `clawmacs`: Clawmacs user config and installed skills under `~/.clawmacs.d`.
- `claude`: curated Claude Code config under `~/.claude` (CLAUDE.md,
  settings.json, keybindings.json, hooks, statusline, safer-curl wrapper).
  Per-host and per-project overrides go in `~/.claude/.claude/settings.local.json`
  (untracked) per Claude Code's override convention.
- `pi`: Pi Coding Agent global config under `~/.pi/agent`, including
  `settings.json`, custom subagents/chains, and local packages such as
  `general-dev-suite` and `okf-knowledge`. Mutable OKF knowledge bundles
  (`~/.pi/agent/knowledge` and project `.pi/knowledge`) are runtime/user data,
  not stowed dotfiles. Runtime state, auth, sessions, binaries, and intercom
  sockets are intentionally excluded.

## Per-host fragments

Most files in this repo are shared across hosts; bits that diverge per
machine live in dedicated fragment files matched by hostname. Each host
gets its own fragment; only the matching one is read on each machine.

| File / directory                                       | Convention                                 |
| ------------------------------------------------------ | ------------------------------------------ |
| `home/.bashrc.d/host-<hostname>`                       | Sourced by `.bashrc` when hostname matches |
| `x11/.xinitrc.d/host-<hostname>`                       | Sourced by `.xinitrc`; `exec`s the WM      |
| `x11/.Xresources.host-<hostname>`                      | Layered onto `.Xresources` via `xrdb -merge` |
| `stumpwm/.stumpwm.d/host-<hostname>.lisp`              | Loaded by `.stumpwmrc` via `(machine-instance)` |
| `sway/.config/sway/host-<hostname>.conf`               | Symlinked to `host.conf` by `sway-session`, included by `config` |
| `emacs/.emacs.d/host-<hostname>.el`                    | Loaded by `init.el` via `(system-name)`    |

Adding a new host: pick a hostname, drop empty fragment files at each of
the paths above, then fill in only what differs from the shared base.

Runtime state, credentials, browser data, package caches, and generated Emacs
state are not meant to live here.

Private shell/API credentials should live outside this repo. Application
state, browser profiles, chat databases, credentials, editor swap files,
and local identity material are intentionally excluded from stow.
