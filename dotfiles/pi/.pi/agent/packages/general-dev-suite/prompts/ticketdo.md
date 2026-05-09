---
description: Fetch or infer an issue/ticket and run it through Pi subagents
argument-hint: "[ticket key or issue URL]"
---
Run a ticket/issue through the Pi subagents planning-first workflow: $ARGUMENTS

If no ticket is provided, infer from branch name or ask. If project issue tools are available, fetch title/body/acceptance criteria/comments. Treat acceptance criteria as the source of truth. Then run `general-dev-plan`, clarify open decisions with me, and run `general-dev-do`.
