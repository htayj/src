#!/usr/bin/env bash
# X-side keyboard setup: layout + xmodmap. The kanata side runs as a
# systemd user service (kanata@<profile>.service); start it via
# `setup-services.sh` after stowing or via `systemctl --user start
# kanata@<profile>.service` manually.

setxkbmap -layout 'us(intl)' || true
xmodmap ~/.Xmodmap || true
