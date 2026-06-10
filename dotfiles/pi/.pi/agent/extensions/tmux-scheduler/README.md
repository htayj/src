# tmux scheduler Pi extension

Schedules literal lines to be sent to tmux panes in the future.

## Slash commands

- `/tmux-panes` — list panes and target ids.
- `/tmux-send-later <delay|ISO|HH:MM> [target] -- <line>` — schedule one line.
  - Examples:
    - `/tmux-send-later 5m %7 -- make test`
    - `/tmux-send-later 23:30 %7 -- echo done`
- `/tmux-scheduled-sends` — list pending sends.
- `/tmux-cancel-send <id|all>` — cancel pending sends.

## Tools

- `tmux_list_panes`
- `tmux_schedule_send`
- `tmux_scheduled_sends`

The extension sends text with `tmux send-keys -l` and then sends Enter after each line by default. Omitting `target` uses `TMUX_PANE`, which may type into the Pi pane itself; prefer an explicit pane id from `/tmux-panes`.

Schedules are stored in the Pi session branch and restored on reload/resume. The Pi process must be running when a job becomes due; overdue jobs fire on the next session start or reload.
