---
name: effect-http-api-contracts
description: Use when designing or implementing TypeScript HTTP/RPC APIs, Effect Platform handlers, client-server contracts, request/response schemas, typed error envelopes, serialization, generated/shared clients, API compatibility, or contract tests.
---
# Effect HTTP/API Contracts

Use this skill for client-server boundary design in the functional TypeScript stack. It complements `effect-application-architecture`: that skill owns application workflows; this skill owns wire contracts, handlers, clients, serialization, and compatibility.

## Local references

Search Effect docs/source before guessing API/HTTP/RPC details:

```bash
rg '<term>' ~/reference/external_docs/effect ~/reference/external_src/github.com/Effect-TS/effect ~/reference/external_src/github.com/Effect-TS/website
```

Also use the stack index: `~/reference/external_docs/functional-ts-stack-index.md`.

## Contract rules

- Define request, response, and error contracts before implementation.
- Boundary schemas define external wire/input shapes; domain constructors define internal invariants.
- Do not assume API payloads, form values, DB rows, and domain values are the same type.
- Mapper functions between wire/domain/persistence shapes are explicit and tested.
- Serialize dates, branded IDs, decimals, bigints, enums, and nullability intentionally.
- Typed error envelopes must be stable and useful to clients.
- Authentication identifies the caller; authorization belongs in application services and handlers, not UI-only checks.
- Versioning/backward compatibility is explicit for public or persisted clients.
- Prefer shared/generated clients from canonical contracts over duplicated fetch types.
- Handlers stay thin: decode input → authorize → call Effect service → encode output.

## Implementation workflow

1. Define route/RPC operation and ownership.
2. Define wire schemas and typed error shapes.
3. Map wire input to domain/application input.
4. Call an Effect service workflow.
5. Map domain result/error to wire response.
6. Add client helper/query/mutation integration.
7. Add contract tests for success, validation failure, authorization failure, and compatibility-sensitive cases.

## Review checklist

- Are request/response/error shapes validated at runtime?
- Are secrets/PII excluded from responses and logs?
- Can the frontend distinguish validation, auth, not found, conflict, and transient errors?
- Are clients generated/shared from a canonical source?
- Do tests prove serialization round-trips for nontrivial types?
