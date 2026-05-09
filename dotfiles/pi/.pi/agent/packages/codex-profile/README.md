# Codex profile for Pi

This local Pi package adapts the user's `~/.codex` setup into Pi without stripping project-specific content.

It provides:

- a `before_agent_start` extension that reminds Pi about the Codex config, trust map, memories, rules, skills, and Oracle MCP note;
- a `codex-profile` skill for consulting Codex memories/rules/config during substantial work;
- a `/codex-context` prompt template for explicitly loading relevant Codex context.

The actual Codex skills are loaded directly from `~/.codex/skills` via `~/.pi/agent/settings.json` so the source content remains canonical.

Private runtime artifacts such as `auth.json`, sessions, logs, SQLite state, caches, and installation identifiers stay in `~/.codex` and are not copied into dotfiles.
