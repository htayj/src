---
name: general-dev-review
description: "General code review pipeline for the current diff or requested scope."
---

## reviewer
output: review-report.md
outputMode: inline
skills: code-review

Review this scope:

{task}

Inspect relevant files and diffs directly. Do not edit files unless explicitly requested in the task. Focus on correctness, security, error handling, type safety, tests, maintainability, and project conventions. Return prioritized findings with evidence.
