---
name: presentation-based-interfaces
description: "Use when users want to understand, design, compare, or implement presentation-based user interfaces: semantic object-to-display links, typed presentations, presentation databases, presenters, recognizers, presentation editors, input contexts, presentation type lattices, translators, command objects, nested presentations, mixed keyboard/pointer interaction, or alternatives to widget/callback and active-region UI models."
---

# Presentation-Based Interfaces

## Purpose

Use this skill for presentation-based UI architecture as a general design model. It is not a McCLIM skill, although one supplemental McCLIM-origin note is included for terminology around presentation types.

The core model: visible text or graphics are presentations of semantic application objects. The UI records object, type, and display representation so user actions can be interpreted as operations on domain objects instead of raw events, coordinates, callbacks, or widget IDs.

## Progressive Disclosure

Start with the synthesis, then use bounded source lookup.

1. Read `references/presentation-interface-model.md` for the synthesized model and design checklist.
2. Read `references/source-index.md` to choose a source reference.
3. Use `scripts/presentation_interface_lookup.py` to search or extract narrow sections.
4. Open full source Markdown only when the synthesis and lookup snippets are not enough.

Common commands from this skill directory:

```bash
python3 scripts/presentation_interface_lookup.py --query "input context"
python3 scripts/presentation_interface_lookup.py --query "recognizer" --doc ciccarelli
python3 scripts/presentation_interface_lookup.py --section "Typed Presentation Model"
python3 scripts/presentation_interface_lookup.py --section "Type Coercion" --doc semantics
python3 scripts/presentation_interface_lookup.py --list-docs
```

## Resource Map

- `references/presentation-interface-model.md`: synthesized explanation of how presentation-based UIs work.
- `references/source-index.md`: routing guide and generated heading index.
- `references/presentation-based-user-interfaces.md`: Ciccarelli 1984 thesis; broad presentation-system architecture, presenter/editor/recognizer loop, PSBase, interface-style independence.
- `references/application-semantics-presentation-manager.md`: McKay/York/McMahon 1989 paper; Dynamic Windows, typed presentations, input contexts, translators, commands, nested presentations, comparison with widgets.
- `references/supplemental-presentation-types-note.md`: optional implementation-oriented terminology; use only as supplemental context.
- `scripts/presentation_interface_lookup.py`: bounded search and section extraction across the synthesis and source references.

## When To Use Each Source

- For conceptual explanations or design advice, start with `presentation-interface-model.md`.
- For architecture terms like application database, presentation database, presenter, recognizer, presentation editor, planned database, command database, or style packages, use the Ciccarelli thesis.
- For typed output/input, presentation records, presentation type lattices, input contexts, translators, logical gestures, command objects, and comparison to widgets, use the Dynamic Windows paper.
- For CLIM-style terms like presentation type categories, presentation generic functions, presentation methods, highlighting, or refined position tests, use the supplemental note, then keep the answer implementation-neutral.

## Answering Guidance

- Keep the subject implementation-neutral unless the user asks about a specific toolkit.
- Distinguish three layers: domain objects, presentation metadata, and visual style.
- Explain user actions as semantic recognition or translation, not just event dispatch.
- Cite source section names used.
- Do not turn answers into McCLIM guidance unless the user explicitly asks for McCLIM.
