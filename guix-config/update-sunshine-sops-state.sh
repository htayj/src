#!/usr/bin/env bash
set -euo pipefail

bundle=/home/tay/src/guix-config/secrets/users/tay-basedserv.sops.yaml
state=/home/tay/.config/sunshine/sunshine_state.json
age_key=${SOPS_AGE_KEY_FILE:-/home/tay/.config/sops/age/keys.txt}
guix=/home/tay/.config/omo/guix/current/bin/guix

if [[ ! -x $guix ]]; then
  guix=/home/tay/.config/guix/current/bin/guix
fi

test -s "$state"
SOPS_AGE_KEY_FILE=$age_key \
  "$guix" shell sops -- \
  sops set --value-file "$bundle" '["sunshine"]["state"]' "$state"

printf 'Sunshine state updated in %s. Reconfigure basedbox before rebooting it.\n' \
  "$bundle"
