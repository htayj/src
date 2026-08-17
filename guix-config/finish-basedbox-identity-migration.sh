#!/bin/sh
set -eu

if [ "$(hostname)" != "basedserv" ]; then
  printf 'Run this script on basedserv, not %s.\n' "$(hostname)" >&2
  exit 1
fi

config_root=/home/tay/src/guix-config

"$config_root/migrate-basedserv-gpg-to-basedbox.sh"
ssh -t tay@basedbox "$config_root/activate-basedbox-sops.sh"
