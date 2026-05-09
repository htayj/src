---
description: Run one concrete task through the Pi subagents development chain
argument-hint: "<task>"
---
Run this concrete task through the saved Pi subagents chain `general-dev-do`: $ARGUMENTS

Use the `subagent` tool chain directly, or `/run-chain general-dev-do -- $ARGUMENTS` if I am driving it manually. The chain performs: scout context → plan → implement → compile/typecheck verification → unit tests → code review → scoped fix pass.

Keep the parent session as orchestrator: synthesize chain output, ask me about unapproved product/architecture decisions, and do not commit or push unless explicitly requested.
