#!/usr/bin/env bash
# Resolve a friendly profile name to its kanata config path and exec.
# Used by ~/.config/systemd/user/kanata@.service so each instance can
# carry a short, human-readable name (advantage360, advantage2, normal)
# instead of a full filename.
set -eu

profile="${1:?usage: kanata-launch.sh <profile>}"

case "$profile" in
    advantage360)         config="$HOME/kinesis.advantage360.layered.kanata.kbd" ;;
    advantage360-chords)  config="$HOME/kinesis.advantage360.kanata.kbd"         ;;
    advantage360-layered) config="$HOME/kinesis.advantage360.layered.kanata.kbd" ;;
    advantage2)           config="$HOME/kinesis.advantage2.layered.kanata.kbd"   ;;
    advantage2-chords)    config="$HOME/kinesis.advantage2.kanata.kbd"           ;;
    advantage2-layered)   config="$HOME/kinesis.advantage2.layered.kanata.kbd"   ;;
    normal)               config="$HOME/normal.kanata.kbd"                       ;;
    *) echo "kanata-launch.sh: unknown profile '$profile'" >&2; exit 2 ;;
esac

if [ ! -e "$config" ]; then
    echo "kanata-launch.sh: missing config $config" >&2
    exit 1
fi

# systemd user services run with a minimal $PATH that often misses
# user-local install dirs. Probe the common ones so the unit file
# doesn't need a hardcoded binary path per host.
find_kanata() {
    if command -v kanata >/dev/null 2>&1; then
        command -v kanata
        return 0
    fi
    for cand in \
        "$HOME/.cargo/bin/kanata" \
        "$HOME/.local/bin/kanata" \
        "$HOME/.nix-profile/bin/kanata" \
        /run/current-system/profile/bin/kanata \
        /usr/local/bin/kanata \
        /usr/bin/kanata; do
        if [ -x "$cand" ]; then
            echo "$cand"
            return 0
        fi
    done
    return 1
}

if ! kanata_bin="$(find_kanata)"; then
    echo "kanata-launch.sh: kanata binary not found in PATH or known locations" >&2
    exit 127
fi

exec "$kanata_bin" -c "$config"
