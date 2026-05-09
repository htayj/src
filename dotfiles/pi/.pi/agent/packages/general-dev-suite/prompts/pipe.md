---
description: Run a sequence of workflow stages, halting on first failure
argument-hint: "<stage1> <stage2> ..."
---
Run these workflow stages in order, stopping at the first failure: $ARGUMENTS

Treat each stage as a plain-language instruction or slash-template invocation. Before each stage, state what will run. After each stage, record pass/fail and evidence. Do not run later side-effecting stages if an earlier gate failed.
