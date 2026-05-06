# Merged McCLIM Skill Source Map

This skill is the single McCLIM working skill. The original CLIM/McCLIM-related skill folders are retained in place and complete copies are also bundled here under `sources/` so a future agent can use one progressive-disclosure entry point without losing any old reference material.

## Contents

- [Priority Order](#priority-order)
- [Top-Level McCLIM References](#top-level-mcclim-references)
- [Copied Source Bundles](#copied-source-bundles)
- [When To Use Each Corpus](#when-to-use-each-corpus)
- [Lookup Commands](#lookup-commands)
- [External Preserved Sources](#external-preserved-sources)

## Priority Order

1. Use `references/mcclim-application-guide.md` for architectural choices and canonical McCLIM practice.
2. Use `references/manual-index.md` and bounded manual lookups for McCLIM manual facts.
3. Use `references/documentation-modules-index.md` for McCLIM source Documentation modules: Drei, ESA, Guided Tour, Notes, bundled CLIM spec, and historical docs.
4. Use the copied `sources/clim-spec/` corpus for portable CLIM 2 semantics and example maps.
5. Use copied Franz and LispWorks guides for CLIM 2.2 wording, conceptual explanations, and vendor comparison.
6. Use copied presentation-interface sources for the design lineage and general presentation-based UI model.
7. Inspect a local McCLIM checkout only when bundled docs do not document an implementation-specific API or application.

## Top-Level McCLIM References

- `SKILL.md`: progressive-disclosure workflow and high-value lookup routing.
- `references/mcclim-application-guide.md`: canonical McCLIM application-building guide.
- `references/manual-index.md`: generated index for the McCLIM User's Manual.
- `references/mcclim-manual.md`: full Markdown conversion of the McCLIM User's Manual.
- `references/documentation-modules-index.md`: generated index for McCLIM source Documentation modules.
- `references/modules/documentation-drei.md`: Drei editor substrate manual.
- `references/modules/documentation-esa.md`: ESA Emacs-style application library manual.
- `references/modules/documentation-guided-tour.md`: tutorial article with application examples.
- `references/modules/documentation-notes.md`: implementation notes on input, layout, presentation types, regions, and sheet geometry.
- `references/modules/documentation-specification.md`: Markdown conversion of the CLIM II spec source bundled in McCLIM.
- `references/modules/documentation-historical.md`: historical release and project notes.
- `source/mcclim.html`: downloaded upstream HTML source for the manual conversion.

## Copied Source Bundles

Each copied folder keeps the original skill file layout, including references, scripts, agents metadata, examples, and mirrors where present.

- `sources/clim-spec/`
  - `SKILL.md`
  - `references/building-with-mcclim.md`
  - `references/full-spec-feature-map.md`
  - `references/mcclim-example-map.md`
  - `examples/*.lisp`
  - `mirror/bauhh.dyndns.org:8000/clim-spec/`
  - `scripts/clim_spec_lookup.py`
- `sources/franz-clim-guide/`
  - `SKILL.md`
  - `references/franz-clim-user-guide-index.md`
  - `references/franz-clim-user-guide.md`
  - `scripts/franz_clim_lookup.py`
- `sources/lispworks-clim-guide/`
  - `SKILL.md`
  - `references/lispworks-clim-user-guide-index.md`
  - `references/lispworks-clim-user-guide.md`
  - `scripts/lispworks_clim_lookup.py`
- `sources/presentation-based-interfaces/`
  - `SKILL.md`
  - `references/presentation-interface-model.md`
  - `references/source-index.md`
  - `references/presentation-based-user-interfaces.md`
  - `references/application-semantics-presentation-manager.md`
  - `references/supplemental-presentation-types-note.md`
  - `scripts/presentation_interface_lookup.py`

## When To Use Each Corpus

Use `references/mcclim-application-guide.md` when deciding how to build:

- frame/pane architecture
- commands versus gadgets versus presentations
- redisplay strategy
- when to use sheets, ESA, Drei, or McCLIM extensions
- when to deviate from portable CLIM practice

Use `references/mcclim-manual.md` when checking McCLIM-specific behavior:

- building/running McCLIM
- the first app and core examples
- panes and sheet hierarchy details
- output protocol and incremental redisplay
- command processing in McCLIM
- extensions such as frame/sheet names, tabs, fonts, raster images, drawing backends, gestures
- Debugger, Clouseau/Inspector, and Listener

Use `references/modules/documentation-drei.md` for:

- Drei editor substrate
- buffers, marks, views, syntax modules, units, undo, kill rings
- Drei commands and command tables
- input editor, text gadget, and editor pane behavior

Use `references/modules/documentation-esa.md` for:

- Emacs-style CLIM applications
- ESA frame, pane, and buffer mixins
- minibuffer and info pane
- multi-keystroke command invocation, `M-x`, keyboard macros, and file/buffer I/O

Use `references/modules/documentation-guided-tour.md` for:

- tutorial-quality examples
- custom panes and drawing
- file browser and scheduler examples
- layered explanation of CLIM facilities

Use `references/modules/documentation-notes.md` for:

- implementation-level reasoning
- extended stream input
- layout protocol
- presentation type internals
- regions and sheet geometry

Use `sources/clim-spec/` for:

- portable CLIM 2 semantics
- full feature coverage across the CLIM specification
- minimal application examples and example maps
- precise spec lookups via `scripts/clim_spec_lookup.py`

Use `sources/franz-clim-guide/` for:

- CLIM 2.2 user guide wording
- Allegro/Franz examples and explanations
- drawing, colors, designs/inks, text styles, presentations, frames, commands, formatted output, redisplay, gadgets, input editing, streams, Silica
- vendor comparison, not unverified McCLIM behavior

Use `sources/lispworks-clim-guide/` for:

- LispWorks CLIM explanations and examples
- setup, drawing, sheets, ports, grafts, mirrored sheets
- CAPI integration, Liquid CLIM, Motif, Windows notes
- vendor comparison, not unverified McCLIM behavior

Use `sources/presentation-based-interfaces/` for:

- semantic object-to-display UI design
- typed presentations, presentation databases, input contexts, translators, command objects, nested presentations
- alternatives to widget/callback and raw active-region UI models

## Lookup Commands

Run commands from the `mcclim-manual` skill directory unless a copied source bundle's script is explicitly used.

Unified McCLIM/documentation lookup:

```bash
python3 scripts/mcclim_docs_lookup.py --list-docs
python3 scripts/mcclim_docs_lookup.py --doc app-guide --query "Drei"
python3 scripts/mcclim_docs_lookup.py --doc source-map --query "Franz"
python3 scripts/mcclim_docs_lookup.py --doc presentation-model --section "Dynamic Windows Typed Presentation Model"
python3 scripts/mcclim_docs_lookup.py --doc portable-guide --query "presentations"
python3 scripts/mcclim_docs_lookup.py --all-docs --query "input context"
```

Manual-only lookup:

```bash
python3 scripts/mcclim_manual_lookup.py --section "The first application"
python3 scripts/mcclim_manual_lookup.py --query "incremental redisplay"
```

Copied source bundle lookups:

```bash
python3 sources/clim-spec/scripts/clim_spec_lookup.py --query "presentation translator"
python3 sources/franz-clim-guide/scripts/franz_clim_lookup.py --section "Chapter 8"
python3 sources/lispworks-clim-guide/scripts/lispworks_clim_lookup.py --query "ports grafts mirrored sheets"
python3 sources/presentation-based-interfaces/scripts/presentation_interface_lookup.py --query "input context"
```

## External Preserved Sources

These external copies were retained when the standalone skills were created:

- `/home/tay/reference/external_docs/franz-clim-user-guide/source/clim-ug.pdf`
- `/home/tay/reference/external_docs/franz-clim-user-guide/markdown/franz-clim-user-guide.md`
- `/home/tay/reference/external_docs/lispworks-clim-user-guide/source/html/`
- `/home/tay/reference/external_docs/lispworks-clim-user-guide/markdown/lispworks-clim-user-guide.md`
- `/home/tay/reference/external_docs/presentation-based-interfaces/source/presentation-user-interfaces.pdf`
- `/home/tay/reference/external_docs/presentation-based-interfaces/source/73660.73678.pdf`
- `/home/tay/reference/external_docs/presentation-based-interfaces/markdown/`
