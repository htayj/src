---
description: Read-only pre-MR/pre-PR readiness gauntlet through Pi subagents
argument-hint: "[target branch]"
---
Check whether the current branch is ready using the saved Pi subagents chain `general-dev-branch-ready`. Target/scope: $ARGUMENTS

The chain is read-only: scout branch context, then review commit hygiene, diff quality, expected verification gates, docs/spec needs, and PR/MR readiness. Report PASS/FAIL and the next concrete action. Do not fix unless I ask.
