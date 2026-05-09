---
name: general-dev-branch-ready
description: "Read-only branch readiness pipeline before opening a PR or MR."
---

## scout
output: branch-context.md
outputMode: file-only
skills: git-workflow, build-test-procedures

Collect branch readiness context for:

{task}

Inspect current branch, upstream, target branch if known, merge-base commits, dirty/staged files, changed files, package scope, and likely required verification gates. Do not edit files.

## reviewer
output: branch-ready-report.md
outputMode: inline
reads: branch-context.md
skills: code-review, git-workflow, build-test-procedures

Perform a read-only branch readiness review for:

{task}

Use branch context from {previous}. Check commit hygiene, diff quality, tests, build/typecheck/lint expectations, docs/spec updates, risk, and PR/MR template needs. Report PASS/FAIL and exactly one next concrete action. Do not edit files.
