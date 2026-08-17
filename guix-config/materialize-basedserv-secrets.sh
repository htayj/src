#!/usr/bin/env bash
set -euo pipefail

if [[ $(hostname) != basedserv ]]; then
  printf 'Run this script on basedserv, not %s.\n' "$(hostname)" >&2
  exit 1
fi

bundle=/home/tay/src/guix-config/secrets/users/tay-basedserv.sops.yaml
runtime=/run/user/$(id -u)/secrets
age_key=${SOPS_AGE_KEY_FILE:-/home/tay/.config/sops/age/keys.txt}
guix=/home/tay/.config/omo/guix/current/bin/guix
sunshine_source=/home/tay/src/dotfiles/config/.config/sunshine
sunshine_home=/home/tay/.config/sunshine

umask 077
mkdir -p "$runtime"
decrypted=$(mktemp "$runtime/bundle.XXXXXX")
trap 'rm -f "$decrypted"' EXIT

SOPS_AGE_KEY_FILE=$age_key "$guix" shell sops -- \
  sops decrypt --output-type json "$bundle" > "$decrypted"

if [[ -L $sunshine_home ]]; then
  rm "$sunshine_home"
fi
mkdir -p "$sunshine_home/credentials"
rm -f "$sunshine_source/credentials/cakey.pem" \
  "$sunshine_source/sunshine_state.json"
for relative in apps-hdr.json apps.json HDR-MODE.md sunshine-hdr.conf sunshine.conf; do
  ln -sfn "$sunshine_source/$relative" "$sunshine_home/$relative"
done
ln -sfn "$sunshine_source/credentials/cacert.pem" \
  "$sunshine_home/credentials/cacert.pem"

materialize() {
  local filter=$1
  local path=$2
  local name=$3
  local output="$runtime/$name"
  local temporary

  mkdir -p "$(dirname "$path")" "$(dirname "$output")"
  temporary=$(mktemp "$(dirname "$output")/secret.XXXXXX")
  jq -rj "$filter" "$decrypted" > "$temporary"
  chmod 600 "$temporary"
  mv -f "$temporary" "$output"
  rm -f "$path"
  ln -s "$output" "$path"
}

materialize '.sunshine.cakey' /home/tay/.config/sunshine/credentials/cakey.pem sunshine/cakey
materialize '.sunshine.state' /home/tay/.config/sunshine/sunshine_state.json sunshine/state
materialize '.basedserv.authinfo' /home/tay/.authinfo basedserv/authinfo
materialize '.basedserv.botircoper' /home/tay/botircoper.txt basedserv/botircoper
materialize '.basedserv.claudeoauth' /home/tay/claudeoauth basedserv/claudeoauth
materialize '.basedserv.private_claudeoauth' /home/tay/.config/private/claudeoauth.txt basedserv/private_claudeoauth
materialize '.basedserv.ircduserpass' /home/tay/ircduserpass basedserv/ircduserpass
materialize '.basedserv.kloakkey' /home/tay/kloakkey basedserv/kloakkey
materialize '.basedserv.kubekey' /home/tay/kubekey basedserv/kubekey
materialize '.basedserv.sloppass' /home/tay/sloppass basedserv/sloppass
materialize '.basedserv.clawmacs.token' /home/tay/.config/clawmacs/token basedserv/clawmacs/token
materialize '.basedserv.clawmacs.claude_max_token' /home/tay/.config/clawmacs/claude-max-token basedserv/clawmacs/claude_max_token
materialize '.basedserv.pi_a2a.token' /home/tay/.config/pi-a2a-bridge/token basedserv/pi_a2a/token
materialize '.basedserv.pi_a2a.hermes_peer' /home/tay/.config/pi-a2a-bridge/peers/hermes-192.168.1.111-token basedserv/pi_a2a/hermes_peer
materialize '.basedserv.pi_a2a.openclaw_peer' /home/tay/.config/pi-a2a-bridge/peers/openclaw-192.168.1.111-token basedserv/pi_a2a/openclaw_peer
materialize '.basedserv.routebraid_stage1_token' /home/tay/.config/routebraid/stage1-token basedserv/routebraid_stage1_token
materialize '.basedserv.openclaw_remote_gateway_token' /home/tay/.openclaw/remote-gateway-token basedserv/openclaw_remote_gateway_token
materialize '.basedserv.private_env.ggn' /home/tay/.local/share/private-env.d/ggn.sh basedserv/private_env/ggn
materialize '.basedserv.private_env.gitea_mcp' /home/tay/.local/share/private-env.d/gitea-mcp.sh basedserv/private_env/gitea_mcp
materialize '.basedserv.private_env.gramps_mcp' /home/tay/.local/share/private-env.d/gramps-mcp.sh basedserv/private_env/gramps_mcp
materialize '.basedserv.private_env.mobygames_mcp' /home/tay/.local/share/private-env.d/mobygames-mcp.sh basedserv/private_env/mobygames_mcp
materialize '.basedserv.private_env.omniroute' /home/tay/.local/share/private-env.d/omniroute.sh basedserv/private_env/omniroute
