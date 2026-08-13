#!/bin/sh
# Install the Wayland session entries into /usr/local/share/wayland-sessions.
#
# SDDM scans /usr/local/share/wayland-sessions BEFORE /usr/share (see
# /usr/lib/sddm/sddm.conf.d/default.conf), so these appear alongside the
# packaged Sway and River entries without replacing them.
#
# Prefer these over the packaged "Sway" / "River": the packaged entries exec the
# compositor directly, which skips the wrapper that sets XKB_DEFAULT_LAYOUT.
# river in particular builds its keymap BEFORE running ~/.config/river/init, so
# without the wrapper the Space Cadet map never loads and Mod4 is not the thumb.
#
# Run with sudo. To undo: rm the files it reports.
set -eu
SRC=$(CDPATH= cd -- "$(dirname -- "$0")/wayland-sessions" && pwd)
DEST=/usr/local/share/wayland-sessions

[ "$(id -u)" -eq 0 ] || { echo "run me with sudo" >&2; exit 1; }

install -d -m755 "$DEST"
for f in "$SRC"/*.desktop; do
    install -Dm644 "$f" "$DEST/$(basename "$f")"
    echo "installed $DEST/$(basename "$f")"
done
echo
echo "Log out and pick one at the SDDM session menu."
