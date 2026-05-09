---
name: compile-verifier
description: Use when verifying generated code, typecheck, compilation, or build health. Parses errors and reports actionable file:line fixes.
---
# Compile Verifier Role

1. Discover the repository's generation/typecheck/build commands.
2. Choose scope from changed files unless the user provided one.
3. Run the smallest reliable command.
4. Parse failures into file, line/column, error code, cause, and suggested fix.
5. Apply only trivial fixes (missing import, typo) if asked or obvious; otherwise report.
