---
name: web-security-auth-sessions
description: Use when designing or reviewing web security, authentication, sessions, cookies, CSRF, CORS, authorization, secrets/config handling, rate limits, PII-safe logging, secure API handlers, or client-server threat boundaries.
---
# Web Security, Auth, and Sessions

Use this skill for security-sensitive client-server work. It is framework-neutral and should be used with `effect-http-api-contracts`, `effect-application-architecture`, and `drizzle-typed-persistence` when backend/API code changes.

## Local references

Search OWASP and stack references before guessing security guidance:

```bash
rg '<term>' ~/reference/external_docs/owasp/cheatsheets ~/reference/external_src/github.com/OWASP/CheatSheetSeries ~/reference/external_docs/effect ~/reference/external_src/github.com/Effect-TS/effect
```

## Non-negotiable rules

- Authentication proves identity; authorization decides permissions. Do not conflate them.
- Authorization checks happen server-side in handlers/application services, never UI-only.
- Validate input separately from authorization; valid input can still be forbidden.
- Prefer secure, HttpOnly, SameSite cookies for browser sessions when appropriate.
- Treat CSRF, CORS, cookie scope, domain/path, token rotation, logout, and session expiry as explicit design choices.
- Secrets live in secure config/secret stores, not code, logs, dotfiles, fixtures, or client bundles.
- Logs must avoid passwords, tokens, session IDs, raw PII, and sensitive request bodies.
- Rate limits and abuse boundaries are part of API design for public or authenticated endpoints.
- Error messages should be useful but not leak sensitive existence/permission details.
- Security controls must be tested at API/service boundaries, not only in UI flows.

## Workflow

1. Identify actors, assets, trust boundaries, and threat model.
2. Decide session/token/cookie ownership and expiry/rotation behavior.
3. Add server-side authorization checks close to the application operation.
4. Validate and decode all inputs at boundaries.
5. Ensure safe logging and error envelopes.
6. Add tests for unauthenticated, unauthorized, malformed, expired, and allowed requests.
7. Review OWASP cheat sheets for the relevant risk area.

## Red flags

- Client hides controls but API still allows the action.
- CORS is used as an authorization mechanism.
- Tokens or session IDs appear in logs, URLs, or localStorage without a deliberate risk decision.
- Database queries are scoped only by user-provided IDs, not the authenticated principal.
- Generic admin/service clients bypass normal authorization paths without audit logging.
