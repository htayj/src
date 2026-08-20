# Basedbox deployment and hardware acceptance

Use this runbook with `/home/tay/src/config-k8-plus.scm`. The GMKtec K8 Plus is already installed. Do not repartition or format it.

## Hardware and firmware map

The system configuration supplies Nonguix `linux`, `microcode-initrd`, and `linux-firmware` for these devices:

| Hardware | Linux support to verify |
| --- | --- |
| Ryzen 7 8845HS | AMD CPU microcode loaded by `microcode-initrd` |
| Radeon 780M | `amdgpu` kernel driver and Mesa renderer |
| MediaTek MT7922 Wi-Fi | `mt7921e` plus firmware |
| MediaTek MT7922 Bluetooth | `btusb`, `btmtk`, BlueZ, and firmware |
| Dual Intel I226-V Ethernet | `igc` kernel driver |
| USB4 ports | kernel USB, Type-C, and `thunderbolt` support |

## Verified installed layout

The installation uses one Btrfs filesystem for `/`, including `/home` and `/gnu/store`. Preserve this layout:

| Mount or use | Filesystem | UUID |
| --- | --- | --- |
| `/` | Btrfs | `b19ca7a2-0762-4d14-91fd-484dbd9d7ee9` |
| `/boot/efi` | FAT32 | `521A-DCFF` |
| swap | Linux swap | `d23519bc-ece4-4a0d-b4db-224d6e2c6f58` |

Confirm that the live system still matches before reconfiguration:

```sh
findmnt --target /
findmnt --target /boot/efi
swapon --show
lsblk -f
test -d /sys/firmware/efi && echo "UEFI boot confirmed"
```

Do not continue if these UUIDs differ from `config-k8-plus.scm`.

## Deferred privileged completion

Run the bounded administrative script after reviewing its `--check` output:

```sh
~/src/guix-config/deferred-basedbox-admin.sh --check
~/src/guix-config/deferred-basedbox-admin.sh
```

It reconfigures the pending `input` group membership, archives and disables
the Microsoft EFI loader, removes only the matching Windows NVRAM entry, and
records before/after evidence under `~/basedbox-admin-<timestamp>/`. Log out
and back in, or reboot, afterward so Kanata inherits the new group.

## Stage and validate

Copy `config-k8-plus.scm` and the complete `guix-config` directory to `/home/tay/src` on `basedbox`. Install the shared channel configuration for `tay`:

Before pulling channels, verify the existing store. If this reports modified paths, repair them as root before continuing:

```sh
guix gc --verify=contents
sudo guix gc --verify=repair,contents
guix gc --verify=contents
```

The final verification must report no modified paths. Do not build or activate a system generation against a corrupt store.

```sh
mkdir -p ~/.config/guix
cp ~/src/guix-config/channels.scm ~/.config/guix/channels.scm
guix pull -C ~/.config/guix/channels.scm
hash guix
guix describe
```

Evaluate both configurations before activating either one:

```sh
guix system build --dry-run ~/src/config-k8-plus.scm
guix home build --dry-run ~/src/guix-config/home-workstation-configuration.scm
```

Both commands must evaluate successfully before activation.

## Activate Guix Home

Authorize Nonguix substitutes before applying Home. This imperative command replaces the managed `/etc/guix/acl` symlink temporarily; the subsequent System reconfiguration restores it declaratively with the same key plus `%default-authorized-guix-keys`:

```sh
sudo ~/.config/guix/current/bin/guix archive --authorize <<'EOF'
(public-key
 (ecc
  (curve Ed25519)
  (q #C1FD53E5D4CE971933EC50C9F307AE2171A2D3B52C804642A7A35F84F3A4EA98#)))
EOF
```

Apply the shared Home configuration as `tay`, explicitly including Nonguix until the System configuration has activated its daemon settings:

```sh
guix home reconfigure \
  --substitute-urls="https://substitutes.nonguix.org https://bordeaux.guix.gnu.org https://ci.guix.gnu.org" \
  ~/src/guix-config/home-workstation-configuration.scm
```

The workstation Home configuration extends the tested core profile. Codex is
installed separately with npm and is not built from source by Guix Home.

## Activate the system

Use the same pinned Guix profile that evaluated the Home configuration.  The
profile contains immutable store links, so root can execute it directly; a
second root-owned pull is unnecessary.  Re-evaluate, activate the generation,
and reboot:

```sh
sudo ~/.config/guix/current/bin/guix system build --dry-run \
  /home/tay/src/config-k8-plus.scm
sudo ~/.config/guix/current/bin/guix system reconfigure \
  /home/tay/src/config-k8-plus.scm
sync
sudo reboot
```

After bootstrap, use `rbs` for System reconfiguration and `rbh` for Home.
Both functions explicitly use `~/.config/guix/current/bin/guix`, avoiding
sudo's restricted PATH and eliminating the need for `guix time-machine`.

They are shell functions defined in `dotfiles/home/.bashrc.d/host-basedbox`,
which `~/.bashrc` sources only when `$HOSTNAME` is `basedbox`, so they are
not available on other hosts and are not visible to non-interactive shells.
`rbs` targets `~/src/config-k8-plus.scm` and `rbh` targets
`home-workstation-configuration.scm`; neither needs `--allow-downgrades`
while the pulled channels are at or ahead of the running generation.

## Hardware acceptance checks

Run these early in the return window. Save failures and relevant kernel output before changing the configuration.

### Storage and EFI

```sh
findmnt --target /
findmnt --target /boot/efi
swapon --show
test -d /sys/firmware/efi && echo "UEFI boot confirmed"
```

Expect Btrfs UUID `b19ca7a2-0762-4d14-91fd-484dbd9d7ee9` on `/`, FAT32 UUID `521A-DCFF` on `/boot/efi`, and swap UUID `d23519bc-ece4-4a0d-b4db-224d6e2c6f58`. There is no separate `/home` filesystem.

### CPU microcode and Radeon 780M

```sh
sudo dmesg | grep -i microcode
lspci -nnk | grep -A3 -Ei 'VGA|Display'
ls -l /dev/dri
glxinfo -B
```

Expect `amdgpu` as the kernel driver, `/dev/dri/card0` and `/dev/dri/renderD128`, and the Radeon 780M rather than `llvmpipe` as the renderer.

### Wired and wireless networking

```sh
lspci -nnk | grep -A3 -Ei 'Ethernet|Network'
ip -brief link
sudo dmesg | grep -Ei 'igc|mt7921|firmware'
nmcli device status
```

Expect both I226-V controllers to use `igc` and the MT7922 to use `mt7921e`. Test each interface separately with a sustained transfer. Disconnect Ethernet while testing Wi-Fi so traffic cannot silently use the wired route.

### Bluetooth

```sh
rfkill list bluetooth
bluetoothctl show
bluetoothctl scan on
```

Confirm that discovery, pairing, and reconnection work with a real device. Stop scanning with `bluetoothctl scan off`.

### USB4

```sh
lspci -nnk | grep -A3 -Ei 'USB4|Thunderbolt'
lsmod | grep -E 'thunderbolt|typec'
sudo dmesg | grep -Ei 'usb4|thunderbolt|type-c|typec'
```

Test every USB4-capable port with a known-good USB4 or Thunderbolt device, including transfer, hot-plug, unplug, and display output where applicable.

### Audio

```sh
aplay -l
pactl list short sinks
pactl list short sources
```

Test analog, HDMI or DisplayPort, Bluetooth, and every microphone path that matters.

### Suspend and resume

```sh
loginctl suspend
```

After resuming, verify networking, audio, and display output, then inspect recent warnings:

```sh
journalctl -b -p warning --since "10 minutes ago"
```

Repeat after using Wi-Fi and Bluetooth and with the display attached.

### 5120x1440 at 240 Hz

Use a cable and port rated for the required bandwidth:

```sh
xrandr --query
xrandr --verbose
```

If `5120x1440` at `240` Hz is offered, select it in LXQt and confirm the active mode with `xrandr`. Test fullscreen motion, display sleep, suspend and resume, and reconnect.
