---
name: codex-profile
description: Use when adapting behavior from the user's ~/.codex setup, starting substantial project work that may have Codex memories, using project-specific Codex skills, consulting Codex rules/history, or reconciling Pi behavior with Codex preferences.
---

# Use the local Codex profile from Pi

## Goal

Make Pi honor the user's existing `~/.codex` setup without stripping project-specific content. Treat Codex skills, memories, rules, and configuration as local first-party context.

## Sources

- Main config: `~/.codex/config.toml`
- Command rules/reference history: `~/.codex/rules/default.rules`
- Skills: `~/.codex/skills/`
- Memories:
  - `~/.codex/memories/MEMORY.md`
  - `~/.codex/memories/memory_summary.md`
  - `~/.codex/memories/raw_memories.md`
  - `~/.codex/memories/rollout_summaries/`
- Runtime artifacts for local reference only: `~/.codex/sessions/`, `~/.codex/log/`, `~/.codex/shell_snapshots/`, SQLite state/cache files, model cache, plugin temp data.

## Workflow

1. For non-trivial project work, search Codex memories before planning:
   - start with `~/.codex/memories/MEMORY.md` and `memory_summary.md`;
   - use `rg` over `~/.codex/memories/rollout_summaries/` for project names, branch names, technologies, commands, and user phrasing.
2. Use the loaded Codex skills from `~/.codex/skills` when their descriptions match the task. Do not sanitize away project-specific references in those skills.
3. If a task repeats a known shell/build workflow, consult `~/.codex/rules/default.rules` as historical evidence of commands the Codex setup previously allowed or used. Pi does not enforce Codex `prefix_rule` semantics.
4. Respect the Codex project trust map in `~/.codex/config.toml`; treat explicitly untrusted projects cautiously.
5. If Oracle/MCP comes up, remember Codex configured `npx -y @steipete/oracle oracle-mcp`, but Pi has no MCP core. Prefer the `oracle` Codex skill or explicit user-approved local commands.

## Safety

- Do not place `auth.json`, logs, session transcripts, SQLite state, caches, installation identifiers, or other private runtime artifacts into dotfiles, prompts, skills, or commits.
- Reading local private context for the current task is allowed when it is relevant.
- When updating dotfiles, keep secret exclusion rules from the machine profile and run the normal dotfiles workflow.
