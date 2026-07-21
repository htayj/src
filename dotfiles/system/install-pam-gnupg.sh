#!/usr/bin/env bash
set -Eeuo pipefail

script_dir=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)
source_dir="$script_dir/pam.d"
baseline_dir="$source_dir/upstream"
services=(sddm login kde)

usage() {
	printf 'Usage: %s [--restore BACKUP_DIRECTORY]\n' "$0" >&2
	exit 2
}

if (( EUID != 0 )); then
	exec sudo -- "$0" "$@"
fi

restore_backup() {
	local backup_dir=$1 service target

	for service in "${services[@]}"; do
		if [[ ! -f "$backup_dir/$service.etc" && ! -f "$backup_dir/$service.absent" ]]; then
			printf 'Invalid backup: no original-state record for %s\n' "$service" >&2
			return 1
		fi
	done

	for service in "${services[@]}"; do
		target="/etc/pam.d/$service"
		if [[ -f "$backup_dir/$service.etc" ]]; then
			install -o root -g root -m 0644 -- "$backup_dir/$service.etc" "$target"
		else
			rm -f -- "$target"
		fi
	done
}

if [[ ${1:-} == --restore ]]; then
	[[ $# == 2 ]] || usage
	restore_backup "$2"
	printf 'Restored PAM configuration from %s\n' "$2"
	exit 0
elif (( $# != 0 )); then
	usage
fi

if [[ ! -r /usr/lib/security/pam_gnupg.so || ! -x /usr/lib/pam-gnupg/pam_gnupg_helper ]]; then
	printf '%s\n' 'pam-gnupg is incomplete; reinstall the package before changing PAM.' >&2
	exit 1
fi

# Refuse to overwrite package updates or locally divergent PAM stacks.
for service in "${services[@]}"; do
	managed="$source_dir/$service"
	baseline="$baseline_dir/$service"
	[[ -f "$managed" && -f "$baseline" ]] || {
		printf 'Missing managed or baseline PAM file for %s\n' "$service" >&2
		exit 1
	}
	[[ ! -e "/etc/pam.d/$service.pacnew" ]] || {
		printf 'Refusing to install while /etc/pam.d/%s.pacnew needs review.\n' "$service" >&2
		exit 1
	}

	if [[ $service == kde ]]; then
		cmp -s -- /usr/lib/pam.d/kde "$baseline" || {
			printf '%s\n' 'The vendor KDE PAM file changed; update the managed snapshot before installing.' >&2
			exit 1
		}
	fi

	if [[ -e "/etc/pam.d/$service" ]]; then
		active="/etc/pam.d/$service"
	else
		active="/usr/lib/pam.d/$service"
	fi
	if ! cmp -s -- "$active" "$baseline" && ! cmp -s -- "$active" "$managed"; then
		printf 'Refusing to overwrite unexpected PAM changes in %s.\n' "$active" >&2
		exit 1
	fi
done

install -d -o root -g root -m 0700 /var/backups/pam-gnupg
backup_dir=$(mktemp -d /var/backups/pam-gnupg/"$(date +%Y%m%d-%H%M%S)".XXXXXX)
chmod 0700 "$backup_dir"
declare -A staged=()

# Record every original state before replacing any service.
for service in "${services[@]}"; do
	target="/etc/pam.d/$service"
	if [[ -e "$target" ]]; then
		cp -a -- "$target" "$backup_dir/$service.etc"
	else
		: > "$backup_dir/$service.absent"
		if [[ -e "/usr/lib/pam.d/$service" ]]; then
			cp -a -- "/usr/lib/pam.d/$service" "$backup_dir/$service.vendor"
		fi
	fi
	install -o root -g root -m 0644 -- "$source_dir/$service" "$backup_dir/$service.new"
	staged[$service]=$(mktemp "/etc/pam.d/.$service.pam-gnupg.XXXXXX")
	install -o root -g root -m 0644 -- "$backup_dir/$service.new" "${staged[$service]}"
done

rollback_on_error() {
	local status=$?
	trap - ERR INT TERM
	printf '%s\n' 'PAM deployment failed; restoring every original file.' >&2
	if ! restore_backup "$backup_dir"; then
		printf 'CRITICAL: automatic rollback was incomplete. Recover manually from %s\n' "$backup_dir" >&2
	fi
	for service in "${services[@]}"; do
		rm -f -- "${staged[$service]:-}"
	done
	exit "$status"
}
trap rollback_on_error ERR INT TERM

for service in "${services[@]}"; do
	mv -f -- "${staged[$service]}" "/etc/pam.d/$service"
done
trap - ERR INT TERM

printf 'Installed pam-gnupg PAM configuration.\nBackups: %s\n' "$backup_dir"
printf 'Rollback: sudo %q --restore %q\n' "$0" "$backup_dir"
