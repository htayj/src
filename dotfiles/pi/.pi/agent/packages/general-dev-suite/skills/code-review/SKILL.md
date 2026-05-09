---
name: code-review
description: Use before handing off code changes or opening a PR/MR. Reviews diffs for bugs, security, maintainability, type safety, error handling, tests, and project conventions.
---
# Code Review Checklist

Review changed code as if you are blocking a merge.

- Correctness: edge cases, null/empty/error paths, concurrency, ordering, retries.
- Security: injection, authz/authn, secrets, path traversal, unsafe deserialization.
- Types/API contracts: no unsafe casts, no broadened types, backward compatibility.
- Tests: behavior changes covered; tests fail without the fix; no weakened assertions.
- Maintainability: follows local patterns; minimal surface area; clear names; no unrelated refactors.
- Operations: logging, metrics, migrations, feature flags, rollback, docs/spec updates.

Prefer precise file/line comments with suggested fixes.
