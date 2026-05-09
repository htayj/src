---
name: immutable-js-typescript
description: Use when working with Immutable.js collections in TypeScript, especially typed Map/List/Record/Seq code and conversion boundaries.
---
# Immutable.js and TypeScript

- Preserve collection types at boundaries; avoid untyped `fromJS` leaks.
- Prefer domain-specific `Record` factories or typed interfaces for nested data.
- Use `update`, `updateIn`, `setIn`, and `withMutations` where they clarify intent.
- Convert to plain JS only at integration boundaries and type/narrow immediately.
- Keep reducer/state updates immutable and test representative nested updates.
