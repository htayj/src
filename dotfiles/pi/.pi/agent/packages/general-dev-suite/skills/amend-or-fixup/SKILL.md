---
name: amend-or-fixup
description: Use when adding follow-up changes to an existing branch. Helps decide whether to amend, create fixup commits, or make a new logical commit.
---
# Amend or Fixup

- If the branch has one logical commit and the change belongs to it, amend.
- If the branch has multiple logical commits, make a `fixup! <subject>` commit targeting the right commit, then autosquash before review.
- If the change is a new logical unit, create a separate well-named commit.
- Never rewrite shared history without checking upstream and using `--force-with-lease`.
