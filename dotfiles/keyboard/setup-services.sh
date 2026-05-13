#!/usr/bin/env bash
# Enable + start the kanata user services that this host should run.
# Idempotent: rerun any time you change which configs apply.
#
#   basedserv -> kanata@advantage360 (layered Space Cadet by default)
#   work      -> kanata@normal, kanata@advantage2 (layered Space Cadet by default)
#
# Requires: ~/.config/systemd/user/kanata@.service stowed (config pkg)
# and ~/kanata-launch.sh stowed (keyboard pkg).
set -eu

case "$HOSTNAME" in
    basedserv) services=(kanata@advantage360.service) ;;
    work)      services=(kanata@normal.service kanata@advantage2.service) ;;
    *) echo "setup-services.sh: no kanata services mapped for host '$HOSTNAME'" >&2; exit 1 ;;
esac

systemctl --user daemon-reload
systemctl --user enable --now "${services[@]}"
systemctl --user --no-pager status "${services[@]}" || true
