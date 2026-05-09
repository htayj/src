---
name: add-rest-endpoint
description: Use when adding or changing REST/HTTP API endpoints. Covers schema/contract-first design, routing, handlers, auth, validation, tests, and docs in a generic codebase.
---
# Add or Modify a REST Endpoint

1. Find the API contract source: OpenAPI, JSON schema, route table, decorators, generated client, or docs.
2. Update the contract first: method, path, params, query, body, response, errors.
3. Run codegen if the repo uses generated routes/clients/types.
4. Implement the handler with validation, authorization, idempotency, error mapping, and logging consistent with nearby endpoints.
5. Add tests: contract/schema, handler/unit, integration/API as appropriate.
6. Update docs/examples and client usage.
7. Verify with build/codegen/tests and a real request against a dev instance if practical.
