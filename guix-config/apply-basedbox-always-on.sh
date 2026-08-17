#!/bin/sh
set -eu

if [ "$(hostname)" != "basedbox" ]; then
  printf 'Run this script on basedbox, not %s.\n' "$(hostname)" >&2
  exit 1
fi

config_root=/home/tay/src/guix-config
system_config=/home/tay/src/config-k8-plus.scm
channels="$config_root/channels.scm"

sudo mkdir -p /root/.config/guix
sudo cp "$channels" /root/.config/guix/channels.scm
sudo timeout 20m /run/current-system/profile/bin/guix pull \
  -C /root/.config/guix/channels.scm \
  -p /root/.config/guix/current

root_guix=/root/.config/guix/current/bin/guix
sudo timeout 20m "$root_guix" system build --dry-run "$system_config"
sudo timeout 30m "$root_guix" system reconfigure "$system_config"

sudo nmcli connection modify "Wired connection 2" \
  802-3-ethernet.wake-on-lan magic
sudo /run/current-system/profile/sbin/ethtool --change enp3s0 wol g

sudo cp /boot/efi/EFI/Guix/grubx64.efi /boot/efi/EFI/Boot/bootx64.efi
sudo chmod 0644 /boot/efi/EFI/Boot/bootx64.efi
guix_boot=$(sudo efibootmgr | sed -n \
  's/^Boot\([0-9A-Fa-f]\{4\}\)\* Guix.*/\1/p' | head -n 1)
uefi_boot=$(sudo efibootmgr | sed -n \
  's/^Boot\([0-9A-Fa-f]\{4\}\)\* UEFI OS.*/\1/p' | head -n 1)
if [ -z "$guix_boot" ]; then
  printf 'Unable to find the Guix EFI boot entry.\n' >&2
  exit 1
fi
boot_order=$guix_boot
if [ -n "$uefi_boot" ]; then
  boot_order="$boot_order,$uefi_boot"
fi
sudo efibootmgr --bootorder "$boot_order"

printf '\nActive sleep inhibitors:\n'
elogind-inhibit --list
printf '\nWake-on-LAN state:\n'
sudo /run/current-system/profile/sbin/ethtool enp3s0 \
  | grep -E 'Supports Wake-on|Wake-on'
printf '\nEFI boot order and loaders:\n'
sudo efibootmgr -v
sha256sum /boot/efi/EFI/Guix/grubx64.efi \
  /boot/efi/EFI/Boot/bootx64.efi

printf '\nReboot now to activate the X11 session changes? [y/N] '
read -r reboot_answer
case "$reboot_answer" in
  y|Y|yes|YES)
    sudo reboot
    ;;
  *)
    printf 'Reboot deferred. Ask Sisyphus to run post-boot checks afterward.\n'
    ;;
esac
