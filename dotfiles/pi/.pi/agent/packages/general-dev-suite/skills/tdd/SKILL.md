---
name: tdd
description: Use for behavior-changing code work. Guides a red-green-refactor loop with small vertical slices and focused test runs.
---
# Test-Driven Development

Use TDD for observable behavior changes.

1. Define the next tiny behavior in user-visible terms.
2. Write or update one focused test that fails for the right reason.
3. Run only the relevant test(s) and capture the red failure.
4. Implement the minimum code to make that test pass.
5. Re-run the focused test, then nearby tests if risk warrants.
6. Refactor while tests stay green.
7. Repeat for the next behavior.

Avoid horizontal slicing (all tests first, all implementation later). Legitimate skips: documentation-only, pure rename with no behavior change, or when no test harness exists; in those cases state the reason explicitly.
