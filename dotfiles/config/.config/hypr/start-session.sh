#!/bin/sh
# Run from a newly logged-in local TTY as tay, never with sudo.
# A private bus keeps the concurrent X session's Dunst and portal untouched.
set -eu
export XDG_CURRENT_DESKTOP=Hyprland
export XDG_SESSION_DESKTOP=Hyprland
export XDG_SESSION_TYPE=wayland
export KITTY_WAYLAND_DETECT_MODIFIERS=1
export PATH="$HOME/.guix-profile/bin:$HOME/.guix-home/profile/bin:$PATH"
export XDG_DATA_DIRS="$HOME/.guix-profile/share:$HOME/.guix-home/profile/share:/run/current-system/profile/share${XDG_DATA_DIRS:+:$XDG_DATA_DIRS}"
export QT_PLUGIN_PATH="$HOME/.guix-profile/lib/qt6/plugins:$HOME/.guix-home/profile/lib/qt6/plugins${QT_PLUGIN_PATH:+:$QT_PLUGIN_PATH}"
export QML2_IMPORT_PATH="$HOME/.guix-profile/lib/qt6/qml:$HOME/.guix-home/profile/lib/qt6/qml${QML2_IMPORT_PATH:+:$QML2_IMPORT_PATH}"
export QML_IMPORT_PATH="$HOME/.guix-profile/lib/qt6/qml:$HOME/.guix-home/profile/lib/qt6/qml${QML_IMPORT_PATH:+:$QML_IMPORT_PATH}"
exec dbus-run-session -- "$HOME/.guix-profile/bin/start-hyprland" -- \
    --config "$HOME/.config/hypr/hyprland.conf" "$@"
