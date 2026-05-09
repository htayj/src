---
description: Iterate implementation until a verification gate passes
argument-hint: "<gate command or check> [task]"
---
Iterate on a task until this verification gate passes: $ARGUMENTS

Run the gate first. If it fails, extract the failure set, make the smallest implementation fixes, rerun the same gate, and repeat. Default max iterations: 5. Stop early on no progress (same failure set twice) and report.
