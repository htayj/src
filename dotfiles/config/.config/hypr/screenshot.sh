#!/bin/sh
# Explicit user action only: save a PNG and copy image bytes (not the path).
set -eu
mode=${1:-area}
case "$mode" in
    area) region=$(slurp) || exit 0 ;;
    full) ;;
    *) printf '%s\n' 'usage: screenshot.sh area|full' >&2; exit 2 ;;
esac
dir=${XDG_SCREENSHOTS_DIR:-$HOME/Pictures/Screenshots}
mkdir -p "$dir"
file=$(mktemp "$dir/screenshot-$(date +%Y%m%d-%H%M%S)-XXXXXX.png")
if [ "$mode" = area ]; then
    grim -g "$region" "$file" || { rm -f "$file"; exit 1; }
else
    grim "$file" || { rm -f "$file"; exit 1; }
fi
wl-copy --type image/png < "$file"
notify-send 'Screenshot saved and copied' "$file" 2>/dev/null || true
