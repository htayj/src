#!/usr/bin/env bash
set -euo pipefail

payload=$(cat)
cmd=$(jq -r '.tool_input.command // ""' <<<"$payload")

if [[ -z "$cmd" ]]; then
  exit 0
fi

if [[ "$cmd" == *"safer-curl-localhost.sh"* ]]; then
  exit 0
fi

# Strip single- and double-quoted substrings so matches inside literals (echo '...', grep "...") don't trigger.
stripped=$(printf '%s' "$cmd" | sed -E "s/'[^']*'//g; s/\"[^\"]*\"//g")

if [[ "$stripped" =~ (^|[^A-Za-z0-9_./-])curl([[:space:]]|$) ]]; then
  if [[ "$stripped" =~ (localhost|127\.0\.0\.1|::1|\[::1\]) ]]; then
    jq -n '{
      hookSpecificOutput: {
        hookEventName: "PreToolUse",
        permissionDecision: "deny",
        permissionDecisionReason: "Use ~/.claude/safer-curl-localhost.sh instead of raw curl for localhost (CLAUDE.md rule). It accepts the same args."
      }
    }'
    exit 0
  fi
fi

exit 0
