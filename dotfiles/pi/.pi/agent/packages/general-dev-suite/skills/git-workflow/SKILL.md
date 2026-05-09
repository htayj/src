---
name: git-workflow
description: Use when creating branches, choosing PR/MR targets, rebasing/squashing, committing, pushing, or opening review requests.
---
# Git Workflow

1. Inspect remotes, current branch, upstream, target branch, and merge-base.
2. Choose target branch from project docs, issue metadata, or release policy; never assume `main` when release branches exist.
3. Keep commits logical. Squash scratch commits (`wip`, `fixup`, `oops`, auto-fix) before a non-draft PR/MR.
4. Use `--force-with-lease`, not plain force, after rebases.
5. Before opening review: run required gates, fill template, link issue, include screenshots/videos for UI changes.
