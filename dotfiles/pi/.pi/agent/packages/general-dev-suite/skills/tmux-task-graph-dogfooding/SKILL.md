---
name: tmux-task-graph-dogfooding
description: Use when a parent Pi must delegate real implementation to a separate Pi process running inside tmux, especially to dogfood the task graph extension or to prove project code was produced by external workers.
---
# tmux-puppeted Pi task-graph dogfooding

Use this skill when the orchestrator must supervise work but must not write the target project code directly. The parent owns scope, evidence, and review; the child Pi owns implementation inside its assigned project directory.

## Parent workflow

1. Create or select a parent task graph run.
2. Write a non-secret worker prompt that states:
   - exact project directory and boundaries;
   - child must create/use `task_graph_create`, `task_graph_next`, and `task_graph_update`;
   - child must record validation commands and outputs;
   - child must not commit/push unless explicitly approved;
   - child must report child run id(s), changed files, and artifacts.
3. Prefer `task_graph_spawn_tmux_worker` when available. Otherwise launch manually:
   ```bash
   tmux new-session -d -s <session> -c <cwd> pi
   tmux pipe-pane -o -t <session> 'cat >> <transcript.log>'
   tmux load-buffer -b <session>-prompt <prompt.md>
   tmux paste-buffer -b <session>-prompt -t <session>
   tmux send-keys -t <session> Enter
   ```
4. Keep the parent out of project source files. The parent may create prompts, logs, evidence summaries, and validation scripts outside the child-owned project code paths.
5. Capture evidence:
   ```bash
   tmux capture-pane -pt <session> -S -50000 > capture-pane-final.txt
   find <project>/.pi/dev-suite/task-graph/runs -type f -name '*.json' -print
   grep -R "task_graph_create\|task_graph_next\|task_graph_update" <transcript.log> <project>/.pi/dev-suite/task-graph/runs
   ```
6. Update the parent graph with worker metadata, transcript path, child run id/path, validation commands, and git status.

## Child prompt checklist

The child Pi should be told to:

- initialize or preserve an independent git repository in the project directory;
- create a task graph before implementation;
- drive ready work with `task_graph_next` and record every completed stage with `task_graph_update`;
- write README/operator docs and local validation scripts;
- run at least one deterministic validation command;
- put logs/evidence under `evidence/` or the requested orchestration directory;
- avoid secrets in prompts, files, logs, commits, and task artifacts.

## Evidence is required for PASS

A parent task should not be marked PASS unless all applicable evidence exists:

- tmux session name and transcript path;
- worker prompt path and prompt hash/provenance;
- child project `.git/`;
- child `.pi/dev-suite/task-graph/runs/*.json`;
- transcript or run JSON containing `task_graph_create`, `task_graph_next`, and `task_graph_update`;
- validation command, exit code, and output tail;
- README with run/validation instructions;
- final `git status --short`.

If any required evidence is missing, mark the parent task `failed` or `awaiting_input`; do not treat missing evidence as optional polish.

## Safety

- Do not paste secrets or environment dumps into tmux workers.
- Review transcripts before preserving them as final artifacts.
- Keep commit/push disabled unless the user explicitly approves via the task graph gate.
- Prefer dependency-light validation so absence of GUI/Quicklisp/etc. is reported honestly instead of hidden.
