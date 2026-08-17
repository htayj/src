#!/usr/bin/env bash
set -euo pipefail

readonly system_config=/home/tay/src/config-k8-plus.scm
readonly efi_directory=/boot/efi/EFI
readonly owner=tay

if [[ ${1:-} == --check ]]; then
    hostname
    guix system describe
    efibootmgr -v
    grep '^input:' /etc/group
    exit 0
fi

if [[ $(hostname) != basedbox ]]; then
    printf 'Refusing to run on host %s; expected basedbox.\n' "$(hostname)" >&2
    exit 1
fi

if [[ $EUID -ne 0 ]]; then
    exec timeout 2h sudo "$0" "$@"
fi

timestamp=$(date -u +%Y%m%dT%H%M%SZ)
evidence_directory="/home/$owner/basedbox-admin-$timestamp"
mkdir -p "$evidence_directory"
trap 'chown -R tay:users "$evidence_directory"' EXIT

efibootmgr -v >"$evidence_directory/efibootmgr-before.txt"
guix system describe >"$evidence_directory/system-before.txt"

mapfile -t guix_entries < <(
    efibootmgr | sed -n 's/^Boot\([[:xdigit:]]\{4\}\)\*\{0,1\} Guix.*/\1/p'
)
mapfile -t windows_entries < <(
    efibootmgr | sed -n 's/^Boot\([[:xdigit:]]\{4\}\)\*\{0,1\} Windows Boot Manager.*/\1/p'
)

if [[ ${#guix_entries[@]} -ne 1 || ${#windows_entries[@]} -ne 1 ]]; then
    printf 'Expected exactly one Guix and one Windows Boot Manager entry.\n' >&2
    exit 1
fi

timeout 90m guix system reconfigure "$system_config" \
    >"$evidence_directory/reconfigure.log" 2>&1

input_group=$(grep '^input:' /etc/group)
input_members=${input_group##*:}
if [[ ,$input_members, != *,tay,* ]]; then
    printf 'System reconfigure completed, but tay is not in the input group.\n' >&2
    exit 1
fi

if [[ -d "$efi_directory/Microsoft" ]]; then
    timeout 10m tar -C "$efi_directory" -cpf \
        "$evidence_directory/EFI-Microsoft.tar" Microsoft
    mv "$efi_directory/Microsoft" \
        "$efi_directory/Microsoft.disabled-$timestamp"
fi

efibootmgr --bootnum "${windows_entries[0]}" --delete-bootnum
efibootmgr --bootorder "${guix_entries[0]}"

efibootmgr -v >"$evidence_directory/efibootmgr-after.txt"
guix system describe >"$evidence_directory/system-after.txt"

if grep -q '^Boot[[:xdigit:]]\{4\}.*Windows Boot Manager' \
    "$evidence_directory/efibootmgr-after.txt"; then
    printf 'Windows Boot Manager still exists after cleanup.\n' >&2
    exit 1
fi

printf 'Completed. Evidence: %s\n' "$evidence_directory"
printf 'Log out and back in, or reboot, before starting Kanata.\n'
