---
name: task-graph-deterministic-nodes
description: Use when adding, reviewing, or debugging task graph node descriptors, stable semantic keys, descriptor prompt blocks, descriptor-safe status/TUI/flowchart labels, or privacy guardrails around prompt instructions.
---
# Task Graph Deterministic Nodes

Use metadata-backed descriptors when task graph nodes need Claude-workflow-like semantic identity without changing scheduler semantics.

## Contract

- Keep `TaskNode.id`, `blockedBy`, `blocks`, edges, locks, readiness, and ready ordering task-ID based.
- Put stable public identity in `metadata.nodeDescriptor` only.
- Treat descriptors as persisted, deterministic, non-executable metadata.
- Complete missing descriptor fields from semantic fallbacks and task creation order, never from generated task IDs, timestamps, random values, or prompt text.
- Dedupe duplicate stable keys deterministically with suffixes such as `~2`.

## Privacy

Descriptor renderers must be whitelist-only. Never copy or render:

- `promptInstructions`
- `projectPromptInstructions`
- `readyPrompt`
- `workerPrompt`
- `systemPrompt`
- `hiddenPrompt`
- `promptTemplate`
- secrets, credentials, cookies, `.env` values, or private/local auth data

Worker prompts may include the fixed `## Deterministic node descriptor` block. Status, TUI details, and flowcharts should show stable key and purpose, not hidden prompt instructions.

## Validation

Run the focused descriptor validation after changes:

```sh
cd /home/tay/src/pi-task-graph
npm run validate:deterministic-nodes
```

Also run nearby settings/UI/flowchart validations when descriptor rendering or custom graph settings change.
