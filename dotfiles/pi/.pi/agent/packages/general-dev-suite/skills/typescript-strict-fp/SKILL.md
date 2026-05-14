---
name: typescript-strict-fp
description: Use when writing, reviewing, or refactoring TypeScript types, domain models, utility functions, API contracts, generics, discriminated unions, strict compiler settings, immutable data, validation boundaries, or functional programming style in TS projects.
---
# TypeScript Strict FP

Use this skill as the baseline for TypeScript in the functional client-server stack. It owns type modeling, strictness, immutable data, pure functions, and boundary validation. Pair it with `effect-application-architecture` for side-effectful workflows and with `react-stateless-components` for TSX/rendering.

## Local references

Before relying on memory for TypeScript behavior, search local references:

```bash
rg '<term>' ~/reference/external_docs/typescript ~/reference/external_src/github.com/microsoft/TypeScript ~/reference/external_src/github.com/microsoft/TypeScript-Website
```

Reference index: `~/reference/external_docs/functional-ts-stack-index.md`.

## Non-negotiable style

- Enable and respect strict TypeScript: `strict`, `noUncheckedIndexedAccess`, and `exactOptionalPropertyTypes` where practical.
- No `any` by default; use `unknown` plus explicit narrowing at boundaries. Narrow exceptions are generated code, third-party type holes, untyped test mocks, or tiny interop shims; keep them local, documented, and hidden behind typed functions.
- No non-null assertions except at tiny, documented interop boundaries.
- Prefer `readonly`, `ReadonlyArray<T>`, immutable records, `as const`, and pure transformation functions.
- Prefer clear expression-oriented code and total functions; do not sacrifice readability to avoid every statement.
- Model states with discriminated unions, not boolean flag clusters.
- Make impossible states unrepresentable.
- Use exhaustive `switch`/pattern handling with `never` checks.
- Do not throw for expected domain failures. Return typed results or use Effect error channels.
- Avoid classes for domain modeling unless an external API requires them.
- Keep parsing/validation at IO boundaries; never trust JSON, URLs, forms, env, headers, or DB rows.
- Isolate mutation in the smallest possible scope when a library requires mutation.

## Architecture rules

- Canonical domain types live outside React components and infrastructure adapters.
- Boundary schemas own external wire/input shapes; domain constructors own internal invariants; persistence schemas own storage shape. Use explicit mapper functions rather than assuming API payloads, form values, DB rows, and domain values are the same type.
- Prefer deriving types from schemas or canonical constants rather than duplicating string unions.
- Keep generic utilities small; do not invent abstract frameworks when direct types are clearer.
- Prefer branded/opaque types for identifiers that should not be mixed (`UserId`, `ProjectId`).
- Treat arrays/maps as values; do not mutate shared collections.

## Review checklist

- Can every nullable/optional case be explained?
- Are error cases typed and reachable by tests?
- Is external data validated before use?
- Are discriminants stable and narrow?
- Can TypeScript catch a missing case if a union expands?
- Are casts local, justified, and hidden behind a safe function?
