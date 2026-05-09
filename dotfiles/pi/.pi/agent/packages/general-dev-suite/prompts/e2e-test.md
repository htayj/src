---
description: Create or run browser/end-to-end tests through Pi subagents
argument-hint: "[flow or feature]"
---
Create or run E2E coverage using the saved Pi subagents chain `general-dev-e2e-test`: $ARGUMENTS

The chain gathers E2E framework/context and delegates authoring/execution to the `e2e-tester` subagent. Product bugs found during E2E work should be reported, not silently fixed, unless I approve a fix.
