---
name: tailwind-component-styling
description: Use when styling React components with Tailwind CSS, utility classes, responsive layouts, design tokens, variants, class composition, dark mode, interaction states, or scalable component visual structure.
---
# Tailwind Component Styling

Use this skill for scalable, readable, utility-first styling. It complements `react-stateless-components` by keeping visual variants semantic and component boundaries clean.

## Local references

```bash
rg '<term>' ~/reference/external_docs/tailwindcss/docs ~/reference/external_src/github.com/tailwindlabs/tailwindcss ~/reference/external_src/github.com/tailwindlabs/tailwindcss.com
```

## Rules

- Use Tailwind utilities for layout, spacing, typography, color, responsive behavior, and interaction states.
- Prefer design tokens/theme values over arbitrary one-off values.
- Extract repeated visual patterns into components or variant helpers.
- Components accept semantic variants (`intent="danger"`, `size="sm"`), not arbitrary class soup as the main API.
- Keep class construction pure and deterministic.
- Do not encode business logic in class names.
- Group classes for readability: layout → spacing → sizing → typography → color → border/shadow → state/responsive.
- Include focus-visible, disabled, loading, error, selected, and reduced-motion states where relevant.
- Avoid over-abstracting tiny one-off layouts.
- Use responsive constraints and long-content behavior by default.

## Component styling boundary

- Presentation components may accept a narrow `className` escape hatch, but core variants should be typed.
- Prefer composition for complex layouts instead of giant prop matrices.
- Accessibility is styling-critical: visible focus, contrast, hit targets, and motion preferences.
