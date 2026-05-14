---
name: client-server-typescript-architecture
description: Use at the start of non-trivial TypeScript client-server work: architecture, feature planning, frontend/backend split, API design, state ownership, project structure, React/Effect/TanStack integration, testing strategy, tooling, or deciding which TS stack skills to use.
---
# Client-Server TypeScript Architecture

Use this meta-skill to orchestrate the functional TypeScript stack. It decides state ownership, boundaries, implementation order, testing, and which narrower skills to load.

## Local reference index

Start with:

```bash
read ~/reference/external_docs/functional-ts-stack-index.md
```

Then search the relevant local docs/source with `rg` before relying on memory, for example:

```bash
rg '<term>' ~/reference/external_docs ~/reference/external_src/github.com
```

If local docs are missing or stale, inspect installed package versions, project-local examples, and `node_modules` types/source when available. Avoid guessing API signatures.

## Skill routing

- Type modeling, strict TS, pure utilities, domain states → `typescript-strict-fp`.
- Side effects, backend workflows, services, dependency injection, typed errors → `effect-application-architecture`.
- HTTP/RPC contracts, request/response schemas, typed error envelopes, client/server compatibility → `effect-http-api-contracts`.
- Auth, sessions, cookies, CSRF/CORS, authorization, secrets, rate limits, PII-safe logging → `web-security-auth-sessions`.
- React TSX, components, hooks, render state, effects, memoization → `react-stateless-components`.
- URL state, typed params/search, navigation → `tanstack-router-url-state`.
- Remote/server cache, queries, mutations → `tanstack-query-server-state`.
- Forms, validation UX, submission state → `tanstack-form-functional-forms`.
- Styling, variants, responsive layout → `tailwind-component-styling`.
- Dialogs/menus/popovers/focus/compound accessible primitives → `radix-shadcn-accessible-components`.
- Build/dev/unit-test config → `vite-vitest-tooling`.
- Component/E2E behavior tests → `testing-library-playwright-testing`.
- Formatting/lint/imports → `biome-code-quality`.
- SQL schema/migrations/repositories → `drizzle-typed-persistence`.
- Also use existing generic skills: `tdd`, `unit-tester`, `e2e-test`, `api-testing`, `build-test-procedures`, `frontend-design`, `ux-review`, and `code-review` when their triggers match.

## Opinionated stack path

1. **Domain first**
   - Define domain types, invariants, IDs, error unions, and schemas.
   - Use `typescript-strict-fp`.

2. **Effect application services**
   - Define service ports with Context/Layer.
   - Implement workflows with typed errors, config, logging, retries, resource safety.
   - Use `effect-application-architecture`.

3. **Persistence and infrastructure**
   - Design Drizzle schema/migrations/adapters.
   - Keep DB details behind Effect service ports.
   - Use `drizzle-typed-persistence`.

4. **HTTP/RPC/API boundary**
   - Define request/response/error contracts and serialization rules.
   - Decode/validate input, authorize, call Effect service, encode output.
   - Keep handlers thin and typed.
   - Use `effect-http-api-contracts`, `web-security-auth-sessions`, and `api-testing`/`add-rest-endpoint` when appropriate.

5. **Routing and state ownership**
   - URL/shareable state: TanStack Router.
   - Remote/server state: TanStack Query.
   - Form draft state: TanStack Form.
   - Ephemeral UI state: React.
   - Derived render data: plain constants or `useMemo` if justified.

6. **React UI implementation**
   - Build pure presentational components.
   - Compose data/query/form/route containers around pure UI.
   - Use Tailwind/Radix/shadcn for stylable accessible components.

7. **Testing**
   - Typecheck all code.
   - Unit-test pure domain logic.
   - Test Effect services with test Layers.
   - Component-test user behavior with Testing Library.
   - E2E-test critical flows with Playwright.

8. **Tooling and CI**
   - Vite for frontend dev/build.
   - Vitest for fast unit/integration tests.
   - Biome for format/lint/import organization.
   - CI stages: format → lint → typecheck → unit/integration → e2e → build.

## Schema and module ownership

- Boundary schemas define external wire/input shapes.
- Domain constructors define internal invariants.
- Persistence schemas define storage shape.
- Mapper functions are explicit; do not assume API payloads, form values, DB rows, and domain values are the same type.

Suggested package/module layout:

- `domain`: pure types, constructors, invariants, domain errors; imports no app/infra/web code.
- `application`: Effect services/workflows and authorization decisions; imports domain and service ports.
- `infra`: adapters for DB, HTTP clients, queues, files, config resources.
- `api`: HTTP/RPC contracts and thin handlers.
- `web`: routes, queries, forms, React components, styling.
- `shared/contracts`: shared/generated wire schemas and clients when useful.
- `test`: test fixtures, test Layers, factories, and E2E helpers.

Imports should point inward: domain ← application ← api/infra/web. Avoid cycles and UI-to-DB shortcuts.

## State ownership table

| State kind | Owner |
| --- | --- |
| Derived render data | React render constants; `useMemo` only if justified |
| Ephemeral UI state | React `useState`/`useReducer` |
| Shareable navigation state | TanStack Router params/search |
| Remote/server data | TanStack Query cache |
| Form draft/touched/dirty/submitting | TanStack Form |
| Durable data | Database via Drizzle adapter |
| Side-effectful workflow | Effect service |
| Configuration/resources | Effect Config/Layer |
| Auth/session/authorization | Server-side API/application services |

## Anti-patterns

- `useEffect + setState` to compute render data.
- Mirroring query/props/URL state into React state.
- Raw `Promise` workflows in domain/application services.
- Untyped thrown expected errors.
- UI-only authorization or hidden buttons as a security boundary.
- API handlers without contract tests or typed error envelopes.
- Components importing DB tables, env, or infrastructure clients.
- Query cache used as arbitrary global UI state.
- Tailwind class strings encoding business rules.
- E2E tests replacing cheaper unit/component tests.
