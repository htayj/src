import type { ExtensionAPI } from "@mariozechner/pi-coding-agent";

const CODEX_PROFILE = `
<codex-profile>
This Pi installation is adapted from the user's local ~/.codex configuration without stripping project-specific content.

Codex configuration source:
- Main config: ~/.codex/config.toml
- Personality: pragmatic
- Preferred/default model in Codex: gpt-5.5
- Codex reasoning defaults: model_reasoning_effort=medium, plan_mode_reasoning_effort=xhigh
- Codex memories feature is enabled.
- Codex approval reviewer: guardian_subagent

Project trust map from ~/.codex/config.toml:
- trusted: /home/tay/src
- trusted: /home/tay/projects/qbcl
- trusted: /home/tay/src/guix-config/dotfiles/.emacs.d
- trusted: /home/tay/projects/clawmacs
- trusted: /home/tay/.codex
- trusted: /home/tay/Documents/nethackguide
- trusted: /home/tay/reference/external_src/codex
- trusted: /home/tay/projects/clim-tutorial
- trusted: /home/tay/.emacs.d
- trusted: /home/tay/projects/genera-emu
- trusted: /home/tay/projects/lispmdoc
- trusted: /home/tay/.config
- trusted: /home/tay
- untrusted: /home/tay/projects/flag-hack-ink/flag-hack

Codex resources available to Pi:
- Skills: ~/.codex/skills is loaded through Pi settings. Use these skills, including their project-specific content and local resource paths, when their descriptions match a task.
- Memories: consult ~/.codex/memories/MEMORY.md, ~/.codex/memories/memory_summary.md, ~/.codex/memories/raw_memories.md, and ~/.codex/memories/rollout_summaries/ for relevant project history, preferences, failures, and reusable facts before substantial project work.
- Rules: ~/.codex/rules/default.rules is preserved as Codex's historical command approval/reference list. Pi does not implement Codex prefix_rule approval semantics; consult the file as workflow history, not as a security boundary.
- Shell snapshots, sessions, logs, state databases, model cache, installation id, auth, and temp/plugin-sync artifacts remain under ~/.codex for local reference only.

Codex MCP note:
- Codex configured an oracle MCP server with command: npx -y @steipete/oracle oracle-mcp, with sessions and consult approved.
- Pi core has no MCP support. Prefer the loaded ~/.codex/skills/oracle instructions or explicit local commands only when the user asks for Oracle-style consultation.

Safety and dotfiles handling:
- Do not copy ~/.codex/auth.json, session transcripts, logs, caches, SQLite state, installation identifiers, or other secret/private runtime artifacts into dotfiles or prompts.
- It is fine to read local ~/.codex config, rules, skills, and memories when needed for the current task.
</codex-profile>`;

export default function (pi: ExtensionAPI) {
  pi.on("before_agent_start", async (event) => {
    return { systemPrompt: `${event.systemPrompt}\n\n${CODEX_PROFILE}` };
  });
}
