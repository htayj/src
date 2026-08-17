#!/usr/bin/env bash
set -euo pipefail

if [[ $(hostname) != basedserv ]]; then
  printf 'Run this script on basedserv, not %s.\n' "$(hostname)" >&2
  exit 1
fi

fingerprint=3EA36B492D7E76450D2C59267B55A97A62F6D6C0
remote_gpg=/home/tay/.guix-home/profile/bin/gpg

export GPG_TTY
GPG_TTY=$(tty)

gpg --batch --export "$fingerprint" \
  | ssh tay@basedbox "$remote_gpg --batch --import"
gpg --export-secret-keys "$fingerprint" \
  | ssh tay@basedbox "$remote_gpg --batch --import"
gpg --batch --export-ownertrust \
  | ssh tay@basedbox "$remote_gpg --batch --import-ownertrust"

ssh tay@basedbox \
  "$remote_gpg --batch --with-colons --list-secret-keys $fingerprint" \
  | grep -E '^(sec|ssb|fpr):'
