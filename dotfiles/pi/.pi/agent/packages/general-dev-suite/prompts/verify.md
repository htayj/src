---
description: Run build/typecheck/codegen verification through Pi subagents
argument-hint: "[scope]"
---
Verify the current changes using the saved Pi subagents chain `general-dev-verify`. Scope: $ARGUMENTS

The chain discovers changed scope and project commands, then runs read-only build/typecheck/codegen verification with actionable error reporting. Parent should synthesize the result and only apply fixes if I explicitly ask.
