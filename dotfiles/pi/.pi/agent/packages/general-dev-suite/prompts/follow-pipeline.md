---
description: Watch a CI pipeline and drive it to green with bounded retries/fixes
argument-hint: "[MR or pipeline] [--max-iterations N]"
---
Follow this pipeline/MR until it is green or needs human input: $ARGUMENTS

Use bounded iterations. Retry clearly transient jobs once or twice. For code/test/lint failures, inspect logs, implement focused fixes, run local verification, amend only if explicitly allowed, and ask before force-pushing.
