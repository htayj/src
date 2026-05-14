---
name: tanstack-form-functional-forms
description: Use when building forms with TanStack Form, typed form state, field validation, submission workflows, React form UX, schema integration, dirty/touched/submitting state, or functional form composition.
---
# TanStack Form Functional Forms

Use this skill for forms in the functional TypeScript stack. Forms are explicit state machines at the UI boundary: parse user input, validate, submit through Effect/TanStack Query, and render all states.

## Local references

```bash
rg '<term>' ~/reference/external_docs/tanstack/form-docs ~/reference/external_src/github.com/TanStack/form
```

## Rules

- Form state is local UI state until submitted; durable state belongs to server/database.
- Keep field definitions, defaults, and validation typed and colocated.
- Validate at the client for UX and at the server for truth.
- Prefer schema-derived or shared validation where practical; Effect Schema is preferred in Effect-first projects.
- Submission is an explicit workflow: validate → submit mutation/Effect → handle success/error → invalidate/update cache → navigate/reset if needed.
- Render dirty, touched, invalid, submitting, disabled, server-error, and success states.
- Avoid uncontrolled ad hoc form state scattered across components.
- Do not duplicate query/server data into form defaults after initialization without a deliberate reset policy.
- Keep field components presentational; form container owns form API/state.

## Testing

- Test validation and submission behavior through user interactions.
- Use accessible labels/roles so Testing Library tests mirror real use.
- Cover server errors, cancellation, disabled submit, and dirty reset behavior.
