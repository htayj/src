---
name: effect-application-architecture
description: Use when building TypeScript services, backend workflows, Effect programs, Layers, Context services, Config, typed errors, Effect Schema validation, concurrency, resource safety, HTTP/RPC APIs, or dependency-injected application architecture.
---
# Effect Application Architecture

Use this skill whenever TypeScript code performs meaningful side effects: HTTP, persistence, env/config, logging, time, randomness, queues, files, concurrency, resource acquisition, retries, or backend application workflows. It complements `typescript-strict-fp` and provides the backend/service spine for the stack.

## Local references

Search docs and source before guessing Effect APIs:

```bash
rg '<term>' ~/reference/external_docs/effect ~/reference/external_src/github.com/Effect-TS/effect ~/reference/external_src/github.com/Effect-TS/website
```

Useful areas: Effect core, Schema, Context, Layer, Config, Cause, Schedule, Stream, Scope, Platform, HTTP API/RPC/SQL packages.

## Non-negotiable rules

- Backend/application side effects and reusable workflows live in Effect. React browser synchronization uses React/TanStack boundaries; wrap those in Effect only when it improves composition, typing, cancellation, or testability.
- No raw Promise chains in domain/application services; wrap at boundaries with Effect constructors.
- Convert Effect to Promise only at process/framework edges.
- Expected failures use typed error channels, not thrown exceptions.
- Defects are exceptional; do not encode domain validation failures as defects.
- Dependencies are `Context` services provided by `Layer`s: database, logger, config, clock, HTTP clients, repositories.
- Resource acquisition uses scoped Effects/Layers; no global singleton clients unless wrapped by a Layer.
- External input/output uses Effect Schema or a project-approved schema boundary. Boundary schemas define wire/input shapes; domain constructors define internal invariants; persistence schemas define storage shape; mapper functions are explicit.
- Concurrency is explicit: document ordering, parallelism, cancellation, interruption, retry, and timeout behavior.
- Keep Effects small and composable; avoid monolithic imperative async functions.

## Layered service structure

1. **Domain**: pure types, constructors, invariants, domain errors.
2. **Application services**: Effect workflows that coordinate domain operations.
3. **Ports**: service interfaces in `Context.Tag`s.
4. **Adapters**: HTTP clients, DB repositories, file systems, env/config, third-party APIs.
5. **Entrypoints**: HTTP/RPC handlers, CLIs, workers, tests; these provide Layers and run Effects.

## Backend guidance

- Prefer Effect Platform/HTTP/RPC for Effect-first services when starting greenfield.
- Keep route/handler code thin: decode input, call an application Effect, encode output.
- Keep DB details in persistence adapters; domain/application services should not casually import table definitions.
- Use structured logging and spans/annotations where available; never log secrets, tokens, session IDs, or raw sensitive payloads.
- Use `Schedule`/retry policies intentionally; never infinite-retry by accident.
- Use `Config` for environment and fail fast on invalid configuration.
- Manage connection pools and long-lived resources through `Layer`/`Scope`, including shutdown.
- Pair API/handler work with `effect-http-api-contracts` and security-sensitive work with `web-security-auth-sessions`.

## Testing guidance

- Test pure domain functions with ordinary Vitest tests.
- Test Effect services by providing test Layers.
- Prefer deterministic test services for clock, random, IDs, HTTP, and repositories.
- Assert typed success/failure values; do not snapshot opaque Effect internals.
