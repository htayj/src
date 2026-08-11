# K8 Plus installation and first boot

Use this runbook with `/home/tay/src/config-k8-plus.scm`. Test every hardware path during the 30-day return window, preferably in the first few days.

## Hardware and firmware map

The system configuration supplies Nonguix `linux`, `microcode-initrd`, and `linux-firmware` for these devices:

| Hardware | Linux support to verify |
| --- | --- |
| Ryzen 7 8845HS | AMD CPU microcode loaded by `microcode-initrd` |
| Radeon 780M | `amdgpu` kernel driver and Mesa renderer |
| Intel AX200 Wi-Fi | `iwlwifi` plus firmware |
| Intel AX200 Bluetooth | `btusb`, BlueZ, and firmware |
| Intel I226-V Ethernet | `igc` kernel driver |
| USB4 ports | kernel USB, Type-C, and `thunderbolt` support |

## Before booting the installer

1. Keep the factory firmware unless a specific problem requires an update. If an update becomes necessary, confirm that the image exactly matches the K8 Plus hardware revision and obtain GMKtec's recovery instructions first.
2. Select UEFI-only boot. Disable CSM or legacy boot.
3. Disable Secure Boot. This configuration uses Nonguix Linux and isn't set up for a Secure Boot signing chain.
4. Back up anything needed from the destination drive.
5. Prefer a current Nonguix installation image. It includes the nonfree firmware needed to test the AX200 before installation. If only the official Guix installer is available, use wired Ethernet through the I226-V and add Nonguix during installation.

Boot the installer in UEFI mode. Confirm it has an EFI environment before changing any disk:

```sh
test -d /sys/firmware/efi && echo "UEFI boot confirmed"
```

## Identify the destination disk

List model names, sizes, filesystems, and current mounts:

```sh
lsblk -e7 -o NAME,PATH,SIZE,TYPE,FSTYPE,FSVER,LABEL,MOUNTPOINTS,MODEL,SERIAL
```

Match the disk by model, serial number, and capacity. Unplug removable storage that isn't needed. Set a shell variable only after checking the exact path printed by `lsblk`:

```sh
DISK=/dev/REPLACE_WITH_VERIFIED_WHOLE_DISK
lsblk -e7 -o NAME,PATH,SIZE,TYPE,FSTYPE,LABEL,MOUNTPOINTS,MODEL,SERIAL "$DISK"
```

Do not continue unless `DISK` is the intended whole disk. No device name is assumed by this guide.

## Partition the disk

A practical GPT layout is:

| Partition | Suggested size | Type | Label |
| --- | ---: | --- | --- |
| EFI System Partition | 1 GiB | FAT32 ESP | `K8EFI` |
| Swap | 32 GiB | Linux swap | `k8-swap` |
| Root | 100 GiB | ext4 | `k8-root` |
| Home | remaining space | ext4 | `k8-home` |

Adjust root and swap sizes for workload needs.

> **DESTRUCTIVE PLACEHOLDER:** The commands below erase the verified disk in `DISK`. They create a 1 GiB ESP, 32 GiB swap, 100 GiB root, and home in the remaining space. Don't run them until the model, serial number, capacity, and path in `lsblk "$DISK"` all match the intended disk.

```sh
parted --script "$DISK" mklabel gpt
parted --script "$DISK" mkpart ESP fat32 1MiB 1025MiB
parted --script "$DISK" set 1 esp on
parted --script "$DISK" mkpart swap linux-swap 1025MiB 33793MiB
parted --script "$DISK" mkpart root ext4 33793MiB 136193MiB
parted --script "$DISK" mkpart home ext4 136193MiB 100%
partprobe "$DISK"
```

After writing the partition table, run `lsblk` again and assign the four verified partition paths:

```sh
lsblk -e7 -o NAME,PATH,SIZE,TYPE,FSTYPE,LABEL,MOUNTPOINTS "$DISK"
EFI_PART=/dev/REPLACE_WITH_VERIFIED_EFI_PARTITION
SWAP_PART=/dev/REPLACE_WITH_VERIFIED_SWAP_PARTITION
ROOT_PART=/dev/REPLACE_WITH_VERIFIED_ROOT_PARTITION
HOME_PART=/dev/REPLACE_WITH_VERIFIED_HOME_PARTITION
```

The next commands destroy existing filesystems on those four partitions. Recheck each variable first:

```sh
printf 'EFI=%s\nSWAP=%s\nROOT=%s\nHOME=%s\n' "$EFI_PART" "$SWAP_PART" "$ROOT_PART" "$HOME_PART"
lsblk -o NAME,PATH,SIZE,TYPE,FSTYPE,LABEL,MOUNTPOINTS "$EFI_PART" "$SWAP_PART" "$ROOT_PART" "$HOME_PART"
```

> **DESTRUCTIVE:** Run only after verifying all four partition paths.

```sh
mkfs.fat -F 32 -n K8EFI "$EFI_PART"
mkswap -L k8-swap "$SWAP_PART"
mkfs.ext4 -L k8-root "$ROOT_PART"
mkfs.ext4 -L k8-home "$HOME_PART"
```

Verify the labels exactly match the configuration:

```sh
lsblk -f "$DISK"
blkid "$EFI_PART" "$SWAP_PART" "$ROOT_PART" "$HOME_PART"
```

## Mount and initialize

Mount by label so the procedure tests the same identifiers used by the system configuration:

```sh
mount LABEL=k8-root /mnt
mkdir -p /mnt/home /mnt/boot/efi
mount LABEL=k8-home /mnt/home
mount LABEL=K8EFI /mnt/boot/efi
swapon LABEL=k8-swap
herd start cow-store /mnt
```

Check the resulting tree before installation:

```sh
findmnt --target /mnt
findmnt --target /mnt/home
findmnt --target /mnt/boot/efi
swapon --show
```

Add Nonguix to the installer's channels. This is required on the official installer and also makes the active channel explicit on a Nonguix image:

```sh
mkdir -p ~/.config/guix
cat > ~/.config/guix/channels.scm <<'EOF'
(use-modules (guix channels))

(cons* (channel
        (name 'nonguix)
        (url "https://gitlab.com/nonguix/nonguix")
        (introduction
         (make-channel-introduction
          "897c1a470da759236cc11798f4e0a5f7d4d59fbc"
          (openpgp-fingerprint
           "2A39 3FFF 68F4 EF7A 3D29 12AF 6F51 20A0 22FB B2D5"))))
       %default-channels)
EOF
guix pull
hash guix
```

Authorize Nonguix substitutes. The key below is the same Ed25519 key embedded in `config-k8-plus.scm`:

```sh
guix archive --authorize <<'EOF'
(public-key
 (ecc
  (curve Ed25519)
  (q #C1FD53E5D4CE971933EC50C9F307AE2171A2D3B52C804642A7A35F84F3A4EA98#)))
EOF
```

Copy the configuration into the target, inspect it once, then initialize the system:

```sh
mkdir -p /mnt/etc
cp /home/tay/src/config-k8-plus.scm /mnt/etc/config-k8-plus.scm
guix system init \
  --substitute-urls="https://substitutes.nonguix.org https://ci.guix.gnu.org https://bordeaux.guix.gnu.org" \
  /mnt/etc/config-k8-plus.scm /mnt
```

If the installer was booted from media where the source file has a different mount path, replace only the source argument to `cp`. Keep its destination unchanged. Reboot after `guix system init` succeeds:

```sh
sync
reboot
```

Remove the installation media and select the UEFI Guix entry.

## First boot

Connect wired Ethernet first. Log in locally as root and immediately set passwords if the installer left the accounts without them:

```sh
passwd
passwd tay
```

Log out of the root console and log in as `tay`. Add the Nonguix channel for that user:

```sh
mkdir -p ~/.config/guix
cat > ~/.config/guix/channels.scm <<'EOF'
(use-modules (guix channels))

(cons* (channel
        (name 'nonguix)
        (url "https://gitlab.com/nonguix/nonguix")
        (introduction
         (make-channel-introduction
          "897c1a470da759236cc11798f4e0a5f7d4d59fbc"
          (openpgp-fingerprint
           "2A39 3FFF 68F4 EF7A 3D29 12AF 6F51 20A0 22FB B2D5"))))
       %default-channels)
EOF
guix pull
hash guix
```

Install the same channel for root so privileged system reconfiguration can resolve the Nonguix modules:

```sh
sudo mkdir -p /root/.config/guix
sudo cp ~/.config/guix/channels.scm /root/.config/guix/channels.scm
sudo -i guix pull -C /root/.config/guix/channels.scm
```

Restore or clone `/home/tay/src/guix-config`, then apply the unchanged shared Home configuration:

```sh
guix home reconfigure ~/src/guix-config/home-configuration.scm
```

For K8 system changes, always name its configuration explicitly:

```sh
sudo -i /root/.config/guix/current/bin/guix system reconfigure \
  /home/tay/src/config-k8-plus.scm
```

The `rbs` Home alias still runs `sudo guix system reconfigure ~/src/config.scm`, which is basedserv's configuration. Do not use `rbs` on the K8.

## Hardware acceptance checks

Run these early in the return window. Save failures and relevant `dmesg` output before changing the configuration.

### Storage labels and EFI

```sh
lsblk -f
findmnt --target /
findmnt --target /home
findmnt --target /boot/efi
findmnt -no FSTYPE,LABEL /boot/efi
test -d /sys/firmware/efi && echo "UEFI boot confirmed"
ls /sys/firmware/efi/efivars >/dev/null
```

Expect `k8-root` on `/`, `k8-home` on `/home`, `K8EFI` as `vfat` on `/boot/efi`, and active swap labeled `k8-swap` in `swapon --show`.

### CPU microcode and Radeon 780M

```sh
sudo dmesg | grep -i microcode
lspci -nnk | grep -A3 -Ei 'VGA|Display'
glxinfo -B
```

Expect `amdgpu` as the kernel driver and the Radeon 780M, not `llvmpipe`, as the renderer.

### Wired and wireless NICs

```sh
lspci -nnk | grep -A3 -Ei 'Ethernet|Network'
ip -brief link
sudo dmesg | grep -Ei 'igc|iwlwifi|firmware'
nmcli device status
```

Expect the I226-V to use `igc` and the AX200 to use `iwlwifi`. Test each NIC separately by transferring a large file or running a sustained network test. Disconnect Ethernet while testing Wi-Fi so traffic can't silently use the other interface.

### Bluetooth

```sh
rfkill list bluetooth
bluetoothctl show
bluetoothctl scan on
```

Confirm the controller is powered, discovery works, and a real headset or other device pairs and reconnects. Stop scanning with `bluetoothctl scan off`.

### USB4

```sh
lspci -nnk | grep -A3 -Ei 'USB4|Thunderbolt'
lsmod | grep -E 'thunderbolt|typec'
sudo dmesg | grep -Ei 'usb4|thunderbolt|type-c|typec'
```

Test every USB4-capable port with a known-good USB4 or Thunderbolt device. Check data transfer, hot-plug, unplug, and display output where applicable.

### Audio

```sh
aplay -l
pactl list short sinks
pactl list short sources
```

Play audio through analog output, HDMI or DisplayPort, and Bluetooth if those paths matter. Record from each needed microphone input.

### Suspend and resume

Close important work, then run:

```sh
loginctl suspend
```

Resume with the power button or keyboard. Repeat with the display attached and after using Wi-Fi and Bluetooth. After each resume, check networking, audio, display, and recent kernel errors:

```sh
journalctl -b -p warning --since "10 minutes ago"
```

### 5120x1440 display at 240 Hz

Connect the display with a cable and port rated for the required bandwidth, then inspect what the active session exposes:

```sh
xrandr --query
xrandr --verbose
```

Select `5120x1440` at `240` Hz in LXQt's display settings if that mode is offered. Confirm the active mode in `xrandr`, then test fullscreen motion, wake from display sleep, suspend and resume, and reconnect. The hardware, cable, port, firmware, compositor, and driver must all support the mode, so this guide doesn't guarantee 240 Hz.
