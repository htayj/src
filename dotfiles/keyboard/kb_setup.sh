#!/usr/bin/env bash
# Per-host kanata launcher. Picks the .kbd file matching this machine's
# Kinesis hardware so the wrong evdev node never gets wedged.

setxkbmap -layout 'us(intl)' || true
xmodmap ~/.Xmodmap || true

case "$HOSTNAME" in
    basedserv) kanata -c ~/kinesis.advantage360.kanata.kbd & ;;
    work)      kanata -c ~/kinesis.advantage2.kanata.kbd   & ;;
    *)         echo "kb_setup.sh: no kanata config mapped for host '$HOSTNAME'" >&2 ;;
esac
