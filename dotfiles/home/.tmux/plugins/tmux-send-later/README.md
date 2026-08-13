# tmux-send-later

A small tmux plugin/CLI for scheduling literal lines to be sent to tmux panes in the future. It is intended for driving other agentic editors or long-running terminal panes without depending on Pi.

## CLI

The dotfiles package also installs `~/.local/bin/tmux-send-later`.

```sh
tmux-send-later schedule --in 5m -t %7 -- make test
tmux-send-later schedule --at 23:30 -t editor:1.0 -- 'echo done'
tmux-send-later prompt %7
tmux-send-later list
tmux-send-later list --all
tmux-send-later cancel tmux-20260610153000-abc123
tmux-send-later cancel all
```

`--at` accepts local `HH:MM[:SS]`, epoch seconds/ms, GNU `date -d` strings, and relative values like `+10s`, `5m`, `1h`, or `2d`. `--in` accepts relative durations.

Text is sent with `tmux send-keys -l`, so it is literal. Enter is sent after the line by default; pass `--no-enter` to only type the text.

Jobs are stored under `${XDG_STATE_HOME:-~/.local/state}/tmux-send-later/jobs`. A background worker sleeps until the due time, then sends the line. The target tmux server/pane must still exist at send time.

## tmux bindings

Loaded from `.tmux.conf` with:

```tmux
run-shell '~/.tmux/plugins/tmux-send-later/tmux-send-later.tmux'
```

Defaults:

- `prefix S` — open a popup form for `when`, `target`, and `line`, then schedule. The default target is the pane where the binding was invoked.
- `prefix L` — popup with all jobs.
- `prefix C-l` — prompt to cancel a job id or `all`.

Override keys before the `run-shell` line:

```tmux
set -g @tmux-send-later-key T
set -g @tmux-send-later-list-key M-t
set -g @tmux-send-later-cancel-key C-t
```
