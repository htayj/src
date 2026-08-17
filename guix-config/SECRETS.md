# SOPS-managed secrets

`secrets/users/tay-basedserv.sops.yaml` contains stable user credentials shared
with the recovery policy in `.sops.yaml`. Plaintext is materialized only in
runtime storage with mode `0600`.

## Materialization

- `basedserv` runs `materialize-basedserv-secrets.sh` from the
  `basedserv-sops-secrets.service` user unit. Files live under
  `/run/user/1000/secrets` and application paths are symlinks.
- `basedbox` uses `sops-secrets-service-type` from `config-k8-plus.scm` for the
  complete stable user credential set. Files are materialized at their
  application paths, owned by `tay:users` with mode `0600`; required private
  parent directories are created with mode `0700`.

## Managed files

- Sunshine private key and state
- `.authinfo`
- Standalone IRC/operator, cluster, and service password files
- Manually managed Claude tokens
- PI A2A bridge and peer tokens
- Routebraid and OpenClaw gateway tokens
- MCP environment fragments under `.local/share/private-env.d`

## Exclusions

Mutable OAuth refresh stores, browser/session cookies, logs, histories,
`Xauthority`, Pulse cookies, Signal state, and tool session databases are not
SOPS-managed. SSH, GPG, age, and KDE Connect private identities remain in their
native permission-controlled stores to avoid circular recovery dependencies.

`.npmrc`, GitHub CLI configuration, and the current rclone configuration do not
contain credentials and do not belong in SOPS.

## Sunshine updates

Sunshine can modify `sunshine_state.json` when pairings change. Run:

```sh
/home/tay/src/guix-config/update-sunshine-sops-state.sh
```

Then sync the repository and reconfigure `basedbox` before rebooting it.
