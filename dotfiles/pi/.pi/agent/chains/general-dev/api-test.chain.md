---
name: general-dev-api-test
description: "Discover API test context, exercise HTTP/API behavior, and report results."
---

## scout
output: api-context.md
outputMode: file-only
skills: api-testing, build-test-procedures

Gather API testing context for:

{task}

Find API contracts, base URL/auth docs, project helpers, fixtures, and relevant existing tests. Do not edit files.

## api-tester
output: api-test-report.md
outputMode: inline
reads: api-context.md
skills: api-testing, api-tester

Run the API test scenario for:

{task}

Use the context from {previous}. Prefer project helpers or http_request. Do not edit files or perform destructive actions without explicit approval.
