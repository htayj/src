---
name: tanstack-router-url-state
description: Use when implementing TanStack Router route trees, typed params, search params, navigation, loaders, route-level state, URL-derived filters/sort/pagination/tabs, or React page shells with type-safe routing.
---
# TanStack Router URL State

Use this skill when navigation or URL state is involved. The URL is the canonical owner of shareable route state. Pair with `react-stateless-components` for route UI and `tanstack-query-server-state` for remote data.

## Local references

```bash
rg '<term>' ~/reference/external_docs/tanstack/router-docs ~/reference/external_src/github.com/TanStack/router
```

## Rules

- Route params/search params are canonical for navigational/shareable state.
- Validate and parse search params at the route boundary.
- Do not duplicate URL state into React local state.
- Use typed route/navigation APIs; avoid ad hoc string concatenation.
- Search params own filters, sort, page, tab, view mode, and shareable UI state.
- Local state owns only non-shareable transient UI.
- Route files stay thin: parse URL, handle redirects/preload orchestration, compose page shell.
- Reusable UI belongs in React components; reusable workflows belong in Effect services.
- Prefer route-level types and helpers over scattered params parsing.
- Prefer TanStack Query for cache ownership of remote data. If Router loaders fetch data, they should usually prefetch/ensure Query data rather than create a second cache.
- Keep navigation side effects explicit and testable.

## Implementation sequence

1. Define route shape and ownership of params/search.
2. Add validation/search schema.
3. Derive query keys or service inputs from typed route state; keep remote data cache ownership in TanStack Query.
4. Render with pure components.
5. Test route behavior and URL round-tripping.
