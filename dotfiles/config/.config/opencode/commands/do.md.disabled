---
description: Run a task through the OpenCode /do staged implementation pipeline.
agent: do-orchestrator
subtask: false
---

Run `/do` with this task text:

$ARGUMENTS

If the task text is empty, ask the user what they want done and stop. Otherwise,
load the `opencode-do-pipeline` skill and run it in `/do` mode.

Do not read, write, or mutate `TODO.org` or `DONE.org`. Use OpenCode todos only
as an in-session checklist. Do not commit or push unless the user explicitly
approved that action in this run; never force-push.
