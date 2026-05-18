#!/usr/bin/env bash
set -euo pipefail

payload=$(cat)
cmd=$(jq -r '.tool_input.command // ""' <<<"$payload")

if [[ -z "$cmd" ]]; then
  exit 0
fi

# Strip single- and double-quoted substrings so matches inside literals (echo "...", grep '...') don't trigger.
cmd=$(printf '%s' "$cmd" | sed -E "s/'[^']*'//g; s/\"[^\"]*\"//g")

if [[ ! "$cmd" =~ (^|[^A-Za-z0-9_./-])git([[:space:]]|$) ]]; then
  exit 0
fi

emit_deny() {
  local reason="$1"
  jq -n --arg r "$reason" '{
    hookSpecificOutput: {
      hookEventName: "PreToolUse",
      permissionDecision: "deny",
      permissionDecisionReason: $r
    }
  }'
  exit 0
}

if [[ "$cmd" =~ git[[:space:]]+push[[:space:]] ]]; then
  if [[ "$cmd" =~ (--force|[[:space:]]-f([[:space:]]|$)) ]] && [[ ! "$cmd" =~ --force-with-lease ]]; then
    emit_deny "Don't force-push without explicit confirmation (CLAUDE.md rule). Use --force-with-lease if you must rewrite published history."
  fi
fi

if [[ "$cmd" =~ git[[:space:]]+reset[[:space:]]+.*--hard ]]; then
  emit_deny "git reset --hard discards uncommitted work. Ask the user first, or save HEAD (git rev-parse HEAD) before proceeding."
fi

if [[ "$cmd" =~ git[[:space:]]+clean[[:space:]]+-[a-zA-Z]*f ]]; then
  emit_deny "git clean -f deletes untracked files. Ask the user first; preview with \`git clean -nxd\`."
fi

if [[ "$cmd" =~ git[[:space:]]+branch[[:space:]]+-D[[:space:]] ]]; then
  emit_deny "git branch -D force-deletes a branch. Ask the user first, or use \`-d\` (safe delete) if the branch is merged."
fi

exit 0
