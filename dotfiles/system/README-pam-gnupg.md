# pam-gnupg integration

This configuration presets the GnuPG signing-subkey passphrase after a successful password login through SDDM or a console, and refreshes it after a password-based KDE screen unlock.

## Security model

- The Unix login password and OpenPGP passphrase must match.
- Only the Git signing subkey is listed in `~/.pam-gnupg`; the certification and encryption keys remain locked.
- PAM entries are `optional`, so a pam-gnupg failure cannot block authentication.
- SSH public-key, fingerprint, smart-card, and autologin flows cannot supply the password and therefore cannot unlock GnuPG.
- The agent cache remains usable while the screen is locked. Locking the screen does not clear it.
- `pam-gnupg` 0.4 is an AUR package whose upstream README warns that the PAM module may contain security bugs.

## Install

```bash
yay -S --needed pam-gnupg
cd ~/src/dotfiles
stow -R -t "$HOME" gnupg
sudo ./system/install-pam-gnupg.sh
systemctl --user restart gpg-agent.service
```

A full agent restart is required after adding `allow-preset-passphrase`; a reload is insufficient.

The installer refuses unexpected PAM changes or pending `.pacnew` files, records all original states under `/var/backups/pam-gnupg`, stages replacements before deployment, and prints an exact rollback command.

## Verify

Keep the current session open while testing a second login. After logging in or unlocking with a password:

```bash
printf test | gpg --batch --local-user 3EA36B492D7E76450D2C59267B55A97A62F6D6C0 --sign >/dev/null
journalctl -b --grep='pam_gnupg\|pam-gnupg'
```

After upgrades to `sddm`, `util-linux`, `pambase`, or `kscreenlocker`, compare the upstream snapshots in `system/pam.d/upstream/` with the installed package files before reapplying.
