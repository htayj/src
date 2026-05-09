---
name: frontend-design
description: Use for frontend UI implementation or review. Covers accessibility, responsive layout, component boundaries, forms, loading/error/empty states, and design-system consistency.
---
# Frontend Design

- Follow the project's design system and existing component patterns.
- Build accessible interactions: labels, roles, focus management, keyboard support, contrast.
- Cover loading, empty, error, disabled, permission-denied, and long-content states.
- Keep state ownership clear; avoid prop drilling if local patterns use context/store/hooks.
- For forms, preserve validation, dirty state, submit disablement, cancellation, and server errors.
- Use stable test IDs only where accessibility selectors are insufficient.
