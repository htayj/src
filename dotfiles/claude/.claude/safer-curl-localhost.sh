#!/usr/bin/env bash
set -euo pipefail

# Curl wrapper that only allows requests to loopback addresses.
#
# Design:
#   - Proper URL parsing (userinfo stripping, case-insensitive, scheme check)
#   - DNS resolution: hostname must resolve to 127.0.0.0/8 or ::1
#   - Blocklist of flags that can redirect connections or inject URLs
#   - Defensive --resolve pin for literal IPs; hostnames use normal resolution
#     (TOCTOU safe because --resolve/--connect-to/--dns-*/--doh-url are blocked)
#   - Allowlist of value-consuming flags (unlisted flags with values fail safe)
#
# Known limitation: -L (follow redirects) can follow to external hosts if the
# localhost service issues a redirect. This is acceptable because the threat
# model is the *caller* trying to reach external hosts, not the local service.

die() { echo "safe-curl: $*" >&2; exit 1; }

# --- Blocked flags: can redirect connections, inject URLs, or reset state ---

is_blocked_flag() {
  local arg="$1"
  local flag

  # Handle --flag=value: extract the flag part
  if [[ "$arg" == --*=* ]]; then
    flag="${arg%%=*}"
  else
    flag="$arg"
  fi

  case "$flag" in
    # Config files can contain url= directives
    -K|--config) return 0 ;;
    # Override where connections actually go
    --connect-to|--resolve) return 0 ;;
    # Proxy flags route traffic through arbitrary hosts
    -x|--proxy|--socks4|--socks4a|--socks5|--socks5-hostname) return 0 ;;
    --proxy-user|-U|--proxy-header|--proxy-cacert|--proxy-cert) return 0 ;;
    --proxy-ciphers|--proxy-insecure|--proxy-key|--proxy-pass) return 0 ;;
    --proxy-tls13-ciphers|--proxy-tlspassword|--proxy-tlsuser) return 0 ;;
    # DNS override flags
    --doh-url|--dns-servers|--dns-interface|--dns-ipv4-addr|--dns-ipv6-addr) return 0 ;;
    # --next/-: resets option state, defeating our defensive --resolve pin
    --next|-:) return 0 ;;
  esac

  # Catch combined short flags starting with a blocked letter: -Kfile, -xhttp://proxy
  case "$arg" in
    -K*|-x*|-U*) return 0 ;;
  esac

  return 1
}

# --- Value flags: consume the next argument (not a URL) ---
# Allowlist approach — unlisted value-taking flags will have their values
# misidentified as URLs, which fails safe (blocks rather than allows).

is_value_flag() {
  case "$1" in
    -o|--output) return 0 ;;
    -H|--header) return 0 ;;
    -d|--data|--data-raw|--data-binary|--data-urlencode|--json) return 0 ;;
    -X|--request) return 0 ;;
    -u|--user) return 0 ;;
    -e|--referer) return 0 ;;
    -A|--user-agent) return 0 ;;
    -b|--cookie) return 0 ;;
    -c|--cookie-jar) return 0 ;;
    -D|--dump-header) return 0 ;;
    -E|--cert|--cert-type|--key|--key-type) return 0 ;;
    -T|--upload-file) return 0 ;;
    -F|--form|--form-string) return 0 ;;
    -w|--write-out) return 0 ;;
    -r|--range) return 0 ;;
    -Y|--speed-limit|-y|--speed-time) return 0 ;;
    --max-time|--connect-timeout|--expect100-timeout) return 0 ;;
    --happy-eyeballs-timeout-ms|--keepalive-time) return 0 ;;
    --max-redirs|--max-filesize|--limit-rate) return 0 ;;
    --retry|--retry-delay|--retry-max-time) return 0 ;;
    --cacert|--capath|--ciphers|--tls13-ciphers) return 0 ;;
    --tls-max|--tlspassword|--tlsuser) return 0 ;;
    --pinnedpubkey|--pubkey|--pass) return 0 ;;
    --interface|--local-port) return 0 ;;
    --proto|--proto-default|--proto-redir) return 0 ;;
    --service-name|--noproxy) return 0 ;;
    --trace|--trace-ascii|--stderr) return 0 ;;
    --netrc-file|--sasl-authzid) return 0 ;;
    --alt-svc|--hsts) return 0 ;;
    --abstract-unix-socket|--unix-socket) return 0 ;;
    --haproxy-protocol) return 0 ;;
    --url) return 0 ;; # we re-check this value as a URL below
  esac
  return 1
}

# --- URL parsing and validation ---

validate_url() {
  local url="$1"

  # Require a scheme
  if [[ ! "$url" =~ ^([a-zA-Z][a-zA-Z0-9+.-]*)://(.*) ]]; then
    die "URL must include a scheme (http:// or https://): $url"
  fi

  local scheme="${BASH_REMATCH[1],,}"
  local rest="${BASH_REMATCH[2]}"

  case "$scheme" in
    http|https) ;;
    *) die "only http/https schemes allowed (got: $scheme://)" ;;
  esac

  # Extract authority (strip path, query, fragment)
  local authority="${rest%%[/?#]*}"

  # Strip userinfo — prevents http://localhost@evil.com
  if [[ "$authority" == *@* ]]; then
    authority="${authority##*@}"
  fi

  # Parse host and port
  local host port
  if [[ "$authority" =~ ^\[([^\]]+)\](:[0-9]+)?$ ]]; then
    host="${BASH_REMATCH[1]}"
    port="${BASH_REMATCH[2]#:}"
  elif [[ "$authority" =~ ^([^:]+)(:[0-9]+)?$ ]]; then
    host="${BASH_REMATCH[1]}"
    port="${BASH_REMATCH[2]#:}"
  else
    die "cannot parse host from URL: $url"
  fi

  host="${host,,}"   # lowercase
  host="${host%.}"   # strip trailing dot

  [[ -z "$host" ]] && die "empty host in URL: $url"
  [[ "$host" == *%* ]] && die "percent-encoded host not allowed: $url"

  # Default port
  if [[ -z "${port:-}" ]]; then
    case "$scheme" in
      http)  port=80 ;;
      https) port=443 ;;
    esac
  fi

  # Validate the host is loopback
  local needs_pin=false
  if [[ "$host" =~ ^[0-9]+\.[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
    # Literal dotted-quad IPv4 — must be 127.x.x.x, pin curl to it
    [[ "$host" == 127.* ]] || die "IP $host is not loopback"
    needs_pin=true
  elif [[ "$host" == "::1" ]]; then
    needs_pin=true
  elif [[ "$host" =~ ^[0-9] ]] || [[ "$host" =~ ^0x ]]; then
    # Reject numeric/hex/octal IP forms (127.1, 0x7f000001, 2130706433, 0177.0.0.1)
    die "numeric IP forms not allowed — use dotted quad (e.g. 127.0.0.1): $host"
  else
    # Hostname — allowlist known localhost names.
    # DNS resolution is unreliable for this (/etc/hosts often maps localhost
    # to LAN IPs for hostname resolution). Since we've blocked all flags that
    # could reroute connections (--resolve, --connect-to, --dns-*, --doh-url,
    # --proxy, --socks*), the caller can't make curl connect somewhere else.
    case "$host" in
      localhost|localhost4|localhost6) ;;
      localhost.localdomain|localhost4.localdomain4|localhost6.localdomain6) ;;
      *) die "hostname '$host' is not a known localhost name" ;;
    esac
  fi

  echo "$needs_pin $port $host"
}

# --- Argument parsing ---

urls=()
url_indices=()
curl_args=()
skip_next=false
next_is_url_flag=false

for arg in "$@"; do
  if $skip_next; then
    if $next_is_url_flag; then
      # --url value: treat as a URL to validate
      urls+=("$arg")
      url_indices+=("${#curl_args[@]}")
      curl_args+=("$arg")
      next_is_url_flag=false
    else
      curl_args+=("$arg")
    fi
    skip_next=false
    continue
  fi

  # Check blocked flags first
  is_blocked_flag "$arg" && die "flag '${arg%%=*}' is not allowed — can redirect connections"

  # Handle --flag=value forms
  if [[ "$arg" == --*=* ]]; then
    local_flag="${arg%%=*}"
    local_val="${arg#*=}"

    # --url=VALUE: validate the embedded URL
    if [[ "$local_flag" == "--url" ]]; then
      urls+=("$local_val")
      url_indices+=("${#curl_args[@]}")
    fi
    curl_args+=("$arg")
    continue
  fi

  case "$arg" in
    --url)
      curl_args+=("$arg")
      skip_next=true
      next_is_url_flag=true
      ;;
    -*)
      curl_args+=("$arg")
      if is_value_flag "$arg"; then
        skip_next=true
        next_is_url_flag=false
      fi
      ;;
    *)
      urls+=("$arg")
      url_indices+=("${#curl_args[@]}")
      curl_args+=("$arg")
      ;;
  esac
done

[[ ${#urls[@]} -eq 0 ]] && die "no URL provided"

# Validate all URLs and build defensive --resolve pins for literal IPs
resolve_pins=()
for url in "${urls[@]}"; do
  result=$(validate_url "$url") || exit 1
  read -r needs_pin port host <<< "$result"
  if [[ "$needs_pin" == "true" ]]; then
    # Literal IP in URL — pin curl to it so it can't be rerouted
    resolve_pins+=("--resolve" "${host}:${port}:${host}")
  fi
done

exec curl "${resolve_pins[@]}" "${curl_args[@]}"
