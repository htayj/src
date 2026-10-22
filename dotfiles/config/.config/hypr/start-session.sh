#!/bin/sh
# Run from a newly logged-in local TTY (never sudo), or via the System GDM
# wrapper with --gdm. Both paths use the same profile/Meta environment below.
# TTY gets a private bus, keeping concurrent X sessions untouched; GDM already
# owns its session bus. Never source a login shell or Guix Home setup here:
# those can replace GDM's DBUS_SESSION_BUS_ADDRESS and session environment.
set -eu
: "${HOME:?Hyprland session requires HOME from the logged-in user}"
mode=tty
if [ "${1-}" = --gdm ]; then
    mode=gdm
    shift
    if [ -z "${DBUS_SESSION_BUS_ADDRESS-}" ]; then
        printf '%s\n' 'Hyprland (Caelestia): GDM did not provide a session bus' >&2
        exit 1
    fi
fi
config="${XDG_CONFIG_HOME:-$HOME/.config}/hypr/hyprland.conf"
if [ ! -r "$config" ]; then
    printf 'Hyprland (Caelestia): missing readable config: %s\n' "$config" >&2
    exit 1
fi
export XDG_CURRENT_DESKTOP=Hyprland
export XDG_SESSION_DESKTOP=Hyprland
export XDG_SESSION_TYPE=wayland
export KITTY_WAYLAND_DETECT_MODIFIERS=1
# Privileged wrappers must win over ordinary profile programs; keep the user
# profile first among profiles for compositor/plugin ABI compatibility.
export PATH="/run/privileged/bin:$HOME/.guix-profile/bin:$HOME/.guix-home/profile/bin:/run/current-system/profile/bin${PATH:+:$PATH}"
export XDG_DATA_DIRS="$HOME/.guix-profile/share:$HOME/.guix-home/profile/share:/run/current-system/profile/share${XDG_DATA_DIRS:+:$XDG_DATA_DIRS}"
export QT_PLUGIN_PATH="$HOME/.guix-profile/lib/qt6/plugins:$HOME/.guix-home/profile/lib/qt6/plugins${QT_PLUGIN_PATH:+:$QT_PLUGIN_PATH}"
export QML2_IMPORT_PATH="$HOME/.guix-profile/lib/qt6/qml:$HOME/.guix-home/profile/lib/qt6/qml${QML2_IMPORT_PATH:+:$QML2_IMPORT_PATH}"
export QML_IMPORT_PATH="$HOME/.guix-profile/lib/qt6/qml:$HOME/.guix-home/profile/lib/qt6/qml${QML_IMPORT_PATH:+:$QML_IMPORT_PATH}"
# Resolve the compositor, not this start-session wrapper, from the profiles.
# The user profile remains first to match the configured plugin ABI.
if ! compositor=$(command -v start-hyprland); then
    printf '%s\n' 'Hyprland (Caelestia): start-hyprland is missing from the Guix profiles' >&2
    exit 1
fi
if [ "$mode" = gdm ]; then
    exec "$compositor" -- --config "$config" "$@"
fi
exec dbus-run-session -- "$compositor" -- --config "$config" "$@"
