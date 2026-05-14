---
name: drizzle-typed-persistence
description: Use when designing or changing Drizzle ORM schemas, migrations, SQL queries, repositories, typed persistence adapters, transactions, database tests, or TypeScript database integration in a functional client-server stack.
---
# Drizzle Typed Persistence

Use this skill for SQL persistence in the opinionated TypeScript stack. Drizzle is infrastructure; domain/application code should see typed ports/services, not raw table sprawl.

## Local references

```bash
rg '<term>' ~/reference/external_docs/drizzle ~/reference/external_src/github.com/drizzle-team/drizzle-orm ~/reference/external_src/github.com/drizzle-team/drizzle-orm-docs
```

## Rules

- Database schema is explicit, typed, and versioned through migrations.
- SQL shape should be understandable; do not hide complex data access behind vague generic repositories.
- Validate external input before persistence.
- Return domain types across application boundaries, not accidental raw DB row shapes.
- Keep transactions explicit and scoped.
- Drizzle table definitions live in infrastructure/persistence modules; domain code should not import them casually.
- Repositories/adapters implement Effect service interfaces where the app is Effect-first.
- Use typed query builders over handwritten string SQL by default; raw SQL is acceptable for database-specific features when wrapped, parameterized, and tested.
- Migrations must be reviewed and tested; never silently change destructive schema behavior.
- Define migration execution strategy per environment, including rollback/backfill/destructive-change policy.
- Manage connection pools through Effect `Layer`/`Scope` in Effect-first applications.
- Test database reset, fixtures, and transaction boundaries explicitly.
- Keep N+1 and pagination behavior explicit.

## Integration pattern

1. Domain type/schema defines business shape.
2. Drizzle schema defines storage shape.
3. Mapper functions translate DB rows ↔ domain values.
4. Repository adapter implements an Effect service port.
5. Connection pool/client is acquired and released through a Layer.
6. Migration and transaction strategy is documented for dev/test/staging/prod.
7. Application workflows depend on the service, not Drizzle directly.
