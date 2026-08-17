#!/bin/sh
set -eu

if [ "$(hostname)" != "basedbox" ]; then
  printf 'Run this script on basedbox, not %s.\n' "$(hostname)" >&2
  exit 1
fi

config=/home/tay/src/config-k8-plus.scm
host_key=/home/tay/.config/sops/age/basedbox-host.txt
expected_recipient=age1m7jhw4zqz7eatrtg9jnyz2ayu0xefpt9qs25z7rhx2gydfq42dgszk4j75

if [ -f "$host_key" ]; then
  actual_recipient=$(age-keygen -y "$host_key")
  if [ "$actual_recipient" != "$expected_recipient" ]; then
    printf 'Unexpected basedbox host age recipient.\n' >&2
    exit 1
  fi

  sudo install -d -m 700 /root/.config/sops/age
  sudo install -m 600 "$host_key" /root/.config/sops/age/keys.txt
else
  sudo test -s /root/.config/sops/age/keys.txt
fi

root_guix=/root/.config/guix/current/bin/guix
sudo timeout 20m "$root_guix" system build --dry-run "$config"
sudo timeout 30m "$root_guix" system reconfigure "$config"

sudo test -s /run/secrets/canary
sudo stat -c '%A %U:%G %n' /root/.config/sops/age/keys.txt \
  /run/secrets/canary
rm -f "$host_key"

printf '\nReboot now to verify boot-time secret materialization? [y/N] '
read -r reboot_answer
case "$reboot_answer" in
  y|Y|yes|YES)
    sudo reboot
    ;;
  *)
    printf 'Reboot deferred. Run it before final SOPS verification.\n'
    ;;
esac
