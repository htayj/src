#!/usr/bin/env bash
set -u

mode="${1:-attention}"
payload=$(cat)

session_id=$(jq -r '.session_id // ""' <<<"$payload" | cut -c1-8)
cwd=$(jq -r '.cwd // ""' <<<"$payload")
folder=$(basename "${cwd:-unknown}")

case "$mode" in
  attention)
    msg=$(jq -r '.message // "Claude needs attention"' <<<"$payload")
    urgency=critical
    title="Claude Code — $folder"
    ;;
  stop)
    msg="Task complete"
    urgency=low
    title="Claude Code — $folder"
    ;;
  *)
    msg="Claude event: $mode"
    urgency=normal
    title="Claude Code — $folder"
    ;;
esac

body="$msg
session $session_id · $cwd"

notify-send -a "Claude Code" -u "$urgency" -i dialog-information "$title" "$body"
