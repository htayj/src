# Dotfiles

This tree is the standalone GNU Stow source for user dotfiles in `/home/tay`.
It is intentionally separate from `/home/tay/src/guix-config/dotfiles`.

Install all packages:

```sh
stow -d ~/src/dotfiles -t ~ home x11 stumpwm emacs config keyboard
```

Install one package:

```sh
stow -d ~/src/dotfiles -t ~ emacs
```

Managed packages:

- `home`: shell and top-level user config files.
- `x11`: X resources, X init, GTK 2, and screen layout scripts.
- `stumpwm`: the live StumpWM rc file.
- `emacs`: selected editable Emacs config files inside `~/.emacs.d`.
- `config`: selected editable XDG config under `~/.config`, including shell,
  desktop, terminal, GTK, KDE/LXQt, keyboard, and small tool config.
- `keyboard`: keyboard setup scripts and Kinesis layout files.
- `clawmacs`: Clawmacs user config and installed skills under `~/.clawmacs.d`.

Runtime state, credentials, browser data, package caches, and generated Emacs
state are not meant to live here.

Private shell/API credentials should live outside this repo, for example in
`~/.config/private/env`, which is sourced by the stowed `.bashrc` when present.
Application state, browser profiles, chat databases, credentials, editor swap
files, and local identity material are intentionally excluded from stow.
