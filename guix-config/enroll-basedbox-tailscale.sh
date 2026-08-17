#!/bin/sh
set -eu

if [ "$(hostname)" != "basedbox" ]; then
  printf 'Run this script on basedbox, not %s.\n' "$(hostname)" >&2
  exit 1
fi

tailscale=/run/current-system/profile/bin/tailscale

sudo timeout 10m "$tailscale" up \
  --hostname=basedbox \
  --accept-dns=false \
  --operator=tay \
  --timeout=5m

printf '\nTailscale status:\n'
"$tailscale" status
printf '\nTailscale IPv4:\n'
"$tailscale" ip --4
printf '\nDNS policy:\n'
"$tailscale" dns status
printf '\nPeer connectivity:\n'
timeout 15s "$tailscale" ping htpc
