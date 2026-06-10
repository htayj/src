#!/usr/bin/env bash
set -euo pipefail

CURRENT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
CMD="$CURRENT_DIR/scripts/tmux-send-later"

schedule_key="$(tmux show-option -gqv '@tmux-send-later-key')"
list_key="$(tmux show-option -gqv '@tmux-send-later-list-key')"
cancel_key="$(tmux show-option -gqv '@tmux-send-later-cancel-key')"

schedule_key="${schedule_key:-S}"
list_key="${list_key:-L}"
cancel_key="${cancel_key:-C-l}"

tmux set-option -gq '@tmux-send-later-command' "$CMD"

tmux bind-key "$schedule_key" command-prompt \
  -p 'when,target,line' \
  -I '5m,#{pane_id},' \
  "run-shell -b '$CMD schedule --at \"%1\" -t \"%2\" -- \"%3\" >/tmp/tmux-send-later.last 2>&1; tmux display-message \"#(cat /tmp/tmux-send-later.last)\"'"

tmux bind-key "$list_key" display-popup -E -w 90% -h 70% "$CMD list --all; printf '\nPress Enter to close...'; read -r _"

tmux bind-key "$cancel_key" command-prompt \
  -p 'cancel tmux-send-later id (or all)' \
  "run-shell -b '$CMD cancel \"%%\" >/tmp/tmux-send-later.last 2>&1; tmux display-message \"#(cat /tmp/tmux-send-later.last)\"'"
