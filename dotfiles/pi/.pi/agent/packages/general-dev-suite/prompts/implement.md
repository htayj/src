---
description: Explore, plan, implement, and verify a coding task using Pi subagents
argument-hint: "[task or ticket]"
---
Implement this coding task using the Pi subagents development pipeline: $ARGUMENTS

If no task was provided, ask me for the task. Otherwise prefer the saved chain `general-dev-do` via the `subagent` tool. It runs scout → planner → implementer → compile-verifier → unit-tester → code-review-enforcer → implementer fix pass.

Parent responsibilities:
- Keep orchestration authority in this session.
- If scout/planner surfaces unresolved product, architecture, migration, or compatibility decisions, ask me before implementation.
- Synthesize final chain output into files changed, validation results, and remaining risks.
- Do not commit or push unless explicitly requested.
