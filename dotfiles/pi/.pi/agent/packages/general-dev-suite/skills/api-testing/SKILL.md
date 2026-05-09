---
name: api-testing
description: Use when testing HTTP APIs locally or in staging. Covers discovering auth/base URLs, making safe requests, validating responses, and preserving secrets.
---
# API Testing

- Discover base URL and auth from docs/config/env examples; do not print secrets.
- Prefer project clients, generated SDKs, existing test helpers, or the `http_request` pi tool.
- Validate status, headers, response schema, body semantics, and side effects.
- Capture reproducible commands or tool calls, but redact credentials.
- For destructive calls, use disposable fixtures and confirm with the user if data loss is possible.
