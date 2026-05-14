---
name: react-stateless-components
description: Use when building or refactoring React web/TypeScript components, hooks, TSX, props, render state, memoization, effects, forms, UI composition, styling boundaries, accessibility, or performance-sensitive React code.
---
# React Stateless Components

Use this skill for React web components in TypeScript. The default component is a pure render function. State is owned by the right layer: derived render values in render, URL state in TanStack Router, server state in TanStack Query, side-effectful workflows in Effect, and durable data in the backend/database.

## Local references

Search official React docs/source before relying on memory:

```bash
rg '<term>' ~/reference/external_docs/react ~/reference/external_src/github.com/reactjs/react.dev ~/reference/external_src/github.com/facebook/react
```

## Strict React rules

- Components are pure render functions by default.
- Do not mirror props, query data, route data, or derived values into local state.
- Prefer plain derived constants first; use `useMemo` only for expensive calculations or referential stability that actually matters.
- Never use `useEffect + setState` merely to compute render data.
- `useEffect` is for synchronizing with external systems: subscriptions, imperative DOM/browser APIs, timers, analytics, non-React widgets, or manual network APIs not handled elsewhere.
- Server/remote data belongs to TanStack Query, not `useState`.
- URL/shareable state belongs to TanStack Router search params/params, not duplicate component state.
- Local React state is for ephemeral UI: input draft, open/closed, focus, hover/drag, uncontrolled browser interaction, optimistic temporary UI.
- Keep render deterministic; avoid hidden module mutable state.
- Prefer event handlers that call pure helpers or Effect/TanStack boundaries.

## Component boundaries

- Split data boundaries from presentation: route/page/query component composes pure child components.
- Presentational components receive values and callbacks, not services.
- Components accept semantic props/variants; do not expose internal implementation state.
- Prefer composition over configuration objects with dozens of flags.
- Extract reusable hooks only when they represent a real reusable state/effect boundary.
- Avoid prop drilling by improving component boundaries first; use context only for cross-cutting stable concerns.

## Performance rules

- First fix ownership and unnecessary state; memoization is second.
- Use stable keys and avoid remounting expensive subtrees.
- Use `React.memo` only where prop stability is maintained and renders are costly.
- Keep list rendering virtualized/paginated when data can grow large.
- Avoid expensive className/object construction in hot lists; memoize or precompute if measured.
- Profile or reason from concrete render paths before adding complexity.

## Styling/accessibility

- Pair with `tailwind-component-styling` for utility-class and variant decisions.
- Pair with `radix-shadcn-accessible-components` for dialogs, menus, popovers, selects, focus management, and compound accessible primitives.
- Every interactive component needs keyboard behavior, focus state, labels/names, disabled/loading/error states, and responsive behavior.
