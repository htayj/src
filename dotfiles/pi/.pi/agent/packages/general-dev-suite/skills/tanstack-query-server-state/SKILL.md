---
name: tanstack-query-server-state
description: Use when implementing TanStack Query queries, mutations, query keys, cache invalidation, optimistic updates, Suspense/error boundaries, data fetching, server-state ownership, or React integration with remote APIs.
---
# TanStack Query Server State

Use this skill whenever React needs remote/server data. It prevents server state from leaking into local component state and keeps fetch/cache/mutation policy explicit.

## Local references

```bash
rg '<term>' ~/reference/external_docs/tanstack/query-docs ~/reference/external_src/github.com/TanStack/query
```

## Rules

- Remote data is server state; do not store it in `useState`.
- Query keys are structured, stable, typed, and colocated with query factories.
- Fetchers validate boundary data before returning domain values.
- Prefer deriving render values from query results over copying them elsewhere.
- Mutations must declare invalidation/update policy explicitly.
- Optimistic updates require clear rollback behavior.
- Cache freshness/staleness and retention settings must be intentional.
- Use Query for server/async state, not arbitrary global UI state.
- Integrate Effect at fetcher/service boundaries, not randomly inside render components.
- Router may validate params/search and prefetch/ensure query data, but TanStack Query owns remote-data caching.
- Keep API clients/fetchers outside TSX where practical.

## Query factory shape

- Centralize keys and options per resource/feature.
- Include all route/search/filter inputs in the key.
- Keep select/transform functions pure.
- Avoid unstable object identities in keys/options.
- Use error boundaries and loading/empty states deliberately.
- Coordinate error envelope shapes with `effect-http-api-contracts`.

## Mutation checklist

- What does success invalidate or update?
- What happens on error?
- Is optimistic UI safe and reversible?
- Is duplicate submission prevented?
- Are domain/API errors visible to the user?
