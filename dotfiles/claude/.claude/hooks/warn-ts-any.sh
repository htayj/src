#!/usr/bin/env bash
set -euo pipefail

payload=$(cat)
tool_name=$(jq -r '.tool_name // ""' <<<"$payload")
file_path=$(jq -r '.tool_input.file_path // ""' <<<"$payload")

if [[ -z "$file_path" ]]; then
  exit 0
fi

case "$file_path" in
  *.ts|*.tsx) ;;
  *) exit 0 ;;
esac

case "$file_path" in
  *.d.ts) exit 0 ;;
esac

case "$tool_name" in
  Edit)
    new_text=$(jq -r '.tool_input.new_string // ""' <<<"$payload")
    ;;
  Write)
    new_text=$(jq -r '.tool_input.content // ""' <<<"$payload")
    ;;
  *)
    exit 0
    ;;
esac

if [[ -z "$new_text" ]]; then
  exit 0
fi

hits=""
while IFS= read -r line; do
  [[ -n "$line" ]] && hits+="  $line"$'\n'
done < <(printf '%s' "$new_text" | grep -nE ':[[:space:]]*any[[:space:]]*([=,;)\|&<>]|$)|<any[>,[:space:]]|[[:space:]]as[[:space:]]+any([[:space:]]|$|[,;)])|[[:space:]]as[[:space:]]+unknown[[:space:]]+as[[:space:]]' || true)

if [[ -z "$hits" ]]; then
  exit 0
fi

msg="TypeScript policy reminder (CLAUDE.md): new code in $file_path uses \`any\` / \`as unknown as\`. Prefer proper types (unknown, generics, Record<string, unknown>). Offending lines (line-number relative to the new content):"$'\n'"$hits"

jq -n --arg m "$msg" '{
  hookSpecificOutput: {
    hookEventName: "PostToolUse",
    additionalContext: $m
  }
}'
