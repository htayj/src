---
name: radix-shadcn-accessible-components
description: Use when building accessible React component primitives or shadcn/Radix-based dialogs, menus, popovers, selects, tooltips, tabs, accordions, focus management, portals, compound components, or copyable stylable UI building blocks.
---
# Radix/shadcn Accessible Components

Use this skill when a component needs accessibility behavior that is easy to get wrong: dialogs, menus, popovers, selects, tabs, accordions, roving focus, portals, focus traps, dismissal layers, or compound component APIs. Pair with `react-stateless-components` and `tailwind-component-styling`.

## Local references

```bash
rg '<term>' ~/reference/external_src/github.com/radix-ui/primitives ~/reference/external_src/github.com/shadcn-ui/ui ~/reference/external_docs/shadcn-ui/content
```

## Rules

- Prefer proven headless primitives for complex interactive widgets instead of recreating ARIA behavior.
- Preserve keyboard behavior, focus management, labeling, roles, and escape/outside-click semantics from the primitive.
- Wrap primitives with typed, stylable components; do not hide essential accessibility props.
- Expose semantic variants, not implementation-specific class internals.
- Keep controlled/uncontrolled behavior explicit.
- Portals must still fit app layout, z-index, scroll locking, and test strategy.
- Do not add effects that fight the primitive's state machine.
- Keep generated/copied shadcn components owned by the app: refactor for project conventions, strict TypeScript, and tests.
- Verify with Testing Library and, for critical flows, Playwright.

## Checklist

- Is the trigger labeled?
- Is focus restored on close?
- Does keyboard navigation work?
- Is content reachable by screen readers?
- Are disabled/loading/error states clear?
- Can the component be styled without forking behavior?
