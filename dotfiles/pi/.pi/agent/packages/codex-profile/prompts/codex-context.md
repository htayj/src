---
description: Inspect the local ~/.codex configuration, memories, skills, and rules relevant to the current task before proceeding.
argument-hint: [task/context]
---

Use the `codex-profile` skill.

Task/context: $ARGUMENTS

Checklist:
1. Read or search relevant files under `~/.codex/memories/`.
2. Identify any matching `~/.codex/skills/*/SKILL.md` skills and use them.
3. Check `~/.codex/config.toml` for project trust/preferences when relevant.
4. Check `~/.codex/rules/default.rules` for historical command/workflow patterns when relevant.
5. Summarize the Codex-derived context you will apply, then continue with the task.
