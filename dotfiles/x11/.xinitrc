#! /bin/bash
# Shared xinitrc — host-specific bits are sourced from
# ~/.xinitrc.d/host-$(hostname). The host fragment is responsible for
# `exec`ing the WM (so this file should never reach the bottom).

if command -v gnome-keyring-daemon >/dev/null 2>&1; then
    eval "$(gnome-keyring-daemon --start --components=gpg,pkcs11,secrets,ssh)"
    export GNOME_KEYRING_CONTROL SSH_AUTH_SOCK GPG_AGENT_INFO GNOME_KEYRING_PID
fi

# Add bdf / bitmap font dirs to the X font path when present.
[ -d "$HOME/.local/share/fonts/digital/bdf" ] && xset +fp "$HOME/.local/share/fonts/digital/bdf/"
[ -d "$HOME/.local/share/fonts/unscii" ]      && xset +fp "$HOME/.local/share/fonts/unscii/"

# Merge X resources, then layer host-specific overrides if present.
[ -r "$HOME/.Xresources" ] && xrdb -merge "$HOME/.Xresources"
[ -r "$HOME/.Xresources.host-$(hostname)" ] && xrdb -merge "$HOME/.Xresources.host-$(hostname)"

# Host-specific xinit fragment: font paths, screen layout, exec WM.
host_xinit="$HOME/.xinitrc.d/host-$(hostname)"
if [ -r "$host_xinit" ]; then
    . "$host_xinit"
fi

# Fallback: launch stumpwm if the host fragment didn't exec something.
exec stumpwm
