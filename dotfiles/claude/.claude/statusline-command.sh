#!/usr/bin/env bash
input=$(cat)

host=$(hostname -s)

raw_dir=$(echo "$input" | jq -r '.cwd // .workspace.current_dir // empty')
home_dir="$HOME"
dir="${raw_dir/#$home_dir/\~}"

branch=$(git -C "$raw_dir" --no-optional-locks rev-parse --abbrev-ref HEAD 2>/dev/null)

model_name=$(echo "$input" | jq -r '.model.display_name // empty')
case "$model_name" in
  *Haiku*)  model_letter="H" ;;
  *Sonnet*) model_letter="S" ;;
  *Opus*)   model_letter="O" ;;
  *)        model_letter="?" ;;
esac

ctx_pct=$(echo "$input" | jq -r '.context_window.used_percentage // 0 | floor')
ctx_tokens=$(echo "$input" | jq -r '
  (.context_window.current_usage // {}) as $u
  | (($u.input_tokens // 0)
    + ($u.cache_creation_input_tokens // 0)
    + ($u.cache_read_input_tokens // 0))
  | if . >= 1000000 then "\(. / 1000000 * 10 | floor / 10)M"
    elif . >= 1000 then "\(. / 1000 | floor)k"
    else "\(.)"
    end
')

dirty=""
if [ -n "$branch" ]; then
  git_status=$(git -C "$raw_dir" --no-optional-locks status --porcelain 2>/dev/null | head -1)
  [ -n "$git_status" ] && dirty="*"

  upstream=$(git -C "$raw_dir" --no-optional-locks rev-list --left-right --count HEAD...@{upstream} 2>/dev/null)
  if [ -n "$upstream" ]; then
    ahead=$(echo "$upstream" | cut -f1)
    behind=$(echo "$upstream" | cut -f2)
    arrow=""
    [ "$ahead" -gt 0 ] 2>/dev/null && arrow="↑${ahead}"
    [ "$behind" -gt 0 ] 2>/dev/null && arrow="${arrow}↓${behind}"
  fi
fi

ctx_warn=""
[ "$ctx_pct" -ge 75 ] && ctx_warn="⚠"

branch_section=""
[ -n "$branch" ] && branch_section="[${branch}${dirty}${arrow:+ ${arrow}}]"

printf '%s:\t%s\t%s\t\t<%s|%s %s%%%s>' "$host" "$dir" "$branch_section" "$model_letter" "$ctx_tokens" "$ctx_pct" "$ctx_warn"
