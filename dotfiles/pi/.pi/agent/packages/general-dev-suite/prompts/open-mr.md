---
description: Prepare and optionally open a merge request or pull request
argument-hint: "[title/target/draft]"
---
Prepare a merge/pull request for the current branch: $ARGUMENTS

Preflight before creating anything:
1. Verify remote project, current branch, upstream, and target branch.
2. Summarize commits and diff since merge-base.
3. Run `general-dev-branch-ready` or ask before skipping readiness checks.
4. Load the repo's PR/MR template and fill all sections.
5. Use the project's configured forge tooling (`gh`, `glab`, web UI instructions, or MCP/tools if installed) with explicit repo/base/head.
Ask for confirmation before opening a non-draft request.
