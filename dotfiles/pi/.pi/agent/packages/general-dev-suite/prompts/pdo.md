---
description: Plan, ask focused clarification questions, then execute via Pi subagents
argument-hint: "<task>"
---
Plan and execute this task after resolving ambiguities: $ARGUMENTS

Use Pi subagents in two phases:

1. Run `general-dev-plan` to gather context and produce an implementation plan.
2. Ask me one focused question at a time for every material open decision. Prefer your recommended answer in each question.
3. After decisions are resolved, run `general-dev-do` with the clarified task/plan.

Keep the parent session as orchestrator and synthesize the final result. Do not commit or push unless explicitly requested.
