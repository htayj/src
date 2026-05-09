---
name: mcclim-manual
description: "Use when users want to design, write, extend, or debug McCLIM applications with good CLIM practice: application frames, panes, sheets, streams, mediums, ports/grafts/mirrors, commands, command tables, presentations, presentation-based interfaces, translators, views, gadgets, formatted output, drawing, ink/designs/text styles, redisplay/output records, input editing/completion, ESA, Drei, Clouseau, Listener, Graphic Forms, McCLIM extensions/backends, or CLIM spec/vendor-guide comparisons."
---

# McCLIM Application Skill

## Purpose

Use this as the single progressive-disclosure skill for building McCLIM applications. It merges the McCLIM manual skill, the CLIM spec skill, the Franz and LispWorks CLIM guide skills, and the presentation-based interface skill into one McCLIM-focused workflow.

The default stance: build in CLIM style first, use McCLIM docs for concrete behavior, use the CLIM spec for portable semantics, use vendor guides only as comparison or clarification, and use the presentation-interface sources to design semantic object-oriented interaction.

## Progressive Disclosure

Start with the smallest resource that answers the question. Do not load full manuals unless bounded lookup is not enough.

1. Read `references/mcclim-application-guide.md` for architecture, canonical mechanisms, and when to deviate.
2. Read `references/mcclim-application-source-repos.md` when you need concrete implementation patterns from real McCLIM applications or when manual guidance is too abstract.
3. Read `references/merged-source-map.md` to choose the right corpus.
4. Use `scripts/mcclim_docs_lookup.py` for bounded search or section extraction across the unified corpus.
5. Use `references/manual-index.md` and `references/documentation-modules-index.md` for detailed McCLIM manual/module routing.
6. Use copied source-bundle scripts under `sources/` only when a specialized lookup is better than the unified lookup.
7. Open full reference files directly only when a bounded extract does not provide enough context.

Common commands from the skill directory:

```bash
python3 scripts/mcclim_docs_lookup.py --list-docs
python3 scripts/mcclim_docs_lookup.py --doc app-guide --query "presentations"
python3 scripts/mcclim_docs_lookup.py --doc source-map --query "LispWorks"
python3 scripts/mcclim_docs_lookup.py --doc presentation-model --section "Dynamic Windows Typed Presentation Model"
python3 scripts/mcclim_docs_lookup.py --doc portable-guide --query "gadget"
python3 scripts/mcclim_docs_lookup.py --all-docs --query "input context"

python3 scripts/mcclim_manual_lookup.py --query "incremental redisplay"
python3 scripts/mcclim_manual_lookup.py --section "The first application"
python3 scripts/mcclim_manual_lookup.py --section "Raster Images" --max-lines 120

python3 scripts/mcclim_docs_lookup.py --doc drei --query "syntax module"
python3 scripts/mcclim_docs_lookup.py --all-docs --query "minibuffer"

python3 sources/clim-spec/scripts/clim_spec_lookup.py --query "presentation translator"
python3 sources/franz-clim-guide/scripts/franz_clim_lookup.py --section "Chapter 8"
python3 sources/lispworks-clim-guide/scripts/lispworks_clim_lookup.py --query "ports grafts mirrored sheets"
python3 sources/presentation-based-interfaces/scripts/presentation_interface_lookup.py --query "input context"
```

## Resource Map

- `references/mcclim-application-guide.md`: first stop for building well-formed McCLIM applications; includes concepts, canonical choices, presentation-interface design, and deviation rules.
- `references/mcclim-application-source-repos.md`: local map of cloned real-world McCLIM applications and reusable components under `~/reference/external_src/`; use for concrete patterns and examples.
- `references/merged-source-map.md`: first stop for deciding which retained corpus to use.
- `references/manual-index.md`: first stop for routing a task to the right manual section.
- `references/documentation-modules-index.md`: first stop for routing a task to source `Documentation/` modules.
- `references/mcclim-manual.md`: full Markdown conversion of the McCLIM User's Manual.
- `references/modules/documentation-drei.md`: Drei editor substrate manual.
- `references/modules/documentation-esa.md`: ESA Emacs-style application library manual.
- `references/modules/documentation-guided-tour.md`: tutorial article with CLIM/McCLIM application examples.
- `references/modules/documentation-notes.md`: implementation notes from `Documentation/Notes`.
- `references/modules/documentation-specification.md`: Markdown conversion of the bundled CLIM II spec source; prefer `sources/clim-spec/` for exact portable spec lookup.
- `references/modules/documentation-historical.md`: historical release/project notes.
- `scripts/mcclim_manual_lookup.py`: bounded search, heading listing, and section extraction.
- `scripts/mcclim_docs_lookup.py`: bounded search and section extraction across the unified corpus.
- `scripts/convert_mcclim_documentation.py`: rebuilds source `Documentation/` module Markdown from a local McCLIM checkout.
- `source/mcclim.html`: downloaded upstream HTML used to produce the Markdown conversion.
- `sources/clim-spec/`: retained CLIM spec skill, full spec feature map, McCLIM example map, examples, and CLIM spec mirror.
- `sources/franz-clim-guide/`: retained Franz/Allegro CLIM 2.2 guide, index, and lookup script.
- `sources/lispworks-clim-guide/`: retained LispWorks CLIM guide, index, and lookup script.
- `sources/presentation-based-interfaces/`: retained presentation-interface synthesis and primary-source conversions.

## Workflow

1. Classify the request:
   - **app architecture**: frame, panes, layouts, commands, state ownership, command loop
   - **semantic interaction**: presentation types, typed output/input, translators, command arguments, input contexts
   - **controls/forms**: gadgets, accepting values, menus, dialogs, input editing/completion
   - **structured output**: tables, graphs, output records, bordered/text formatting
   - **graphics**: drawing functions, ink/designs, text styles, transformations, raster images
   - **dynamic UI**: redisplay, `updating-output`, output record ownership, pane invalidation
   - **substrate/internal**: sheets, mediums, ports, grafts, mirrors, events, repaint, backend work
   - **editor/app frameworks**: ESA, Drei, Listener, Clouseau, Debugger, Graphic Forms
   - **application source examples**: real-world McCLIM application frame/pane/command/presentation patterns from local reference repositories
   - **comparison/portability**: CLIM spec, Franz guide, LispWorks guide, McCLIM-specific divergence
2. Read the application guide for the canonical starting point.
3. Search or extract the smallest relevant source section.
4. Choose the CLIM mechanism that matches the task:
   - commands for actions;
   - presentations for semantic objects on screen;
   - gadgets for conventional controls;
   - formatted output for tables/graphs/reports;
   - drawing functions for custom graphics;
   - output records/incremental redisplay for dynamic views;
   - sheets/ports/grafts/mirrors only for lower-level pane/backend/event work;
   - ESA for Emacs-style buffer/window/minibuffer apps;
   - Drei for text editing substrate work.
5. Cross-check portable CLIM semantics with the CLIM spec corpus when behavior is not purely McCLIM-specific.
6. Use McCLIM manual, source modules, and examples for concrete implementation details.
7. Search local application source references in `~/reference/external_src/` when you need a concrete pattern from a working app; start with `references/mcclim-application-source-repos.md`.
8. Use Franz and LispWorks guides as supplemental wording or vendor comparison, not as proof of McCLIM behavior.
9. Use presentation-interface sources to design semantic UI structure, then express it with McCLIM presentations/translators/commands.
10. State whether advice or code is portable CLIM, McCLIM-specific, vendor-specific, or inferred from implementation notes.

## High-Value Lookups

- Real application source map: read `references/mcclim-application-source-repos.md`
- Search application frames in references: `rg "define-application-frame" ~/reference/external_src/codeberg.org/McCLIM/McCLIM ~/reference/external_src/github.com ~/reference/external_src/codeberg.org ~/reference/external_src/gitlab.com`
- Search presentations/commands in references: `rg "define-presentation|define-.*-command|define-command" ~/reference/external_src/codeberg.org/McCLIM/McCLIM ~/reference/external_src/github.com ~/reference/external_src/codeberg.org ~/reference/external_src/gitlab.com`
- Canonical application guide: `python3 scripts/mcclim_docs_lookup.py --doc app-guide --section "Canonical Concepts"`
- Unified source map: `python3 scripts/mcclim_docs_lookup.py --doc source-map --section "When To Use Each Corpus"`
- First app: `--section "The first application"`
- Application frames: `--query "define-application-frame"`
- Panes/gadgets: `--section "Panes"` or `--query "make-pane"`
- Incremental redisplay: `--section "Using incremental redisplay"` and `--section "Incremental redisplay"`
- Presentations: `--section "Using presentation types"`
- Presentation-interface model: `python3 scripts/mcclim_docs_lookup.py --doc presentation-model --query "input context"`
- Command tables/menus: `--section "Using command tables"` and `--section "Using menu bar"`
- Drawing: `--section "Drawing functions"` and `--section "Additional arguments to drawing functions"`
- Ink/designs/colors: `python3 scripts/mcclim_docs_lookup.py --doc feature-map --query "Drawing in Color"`
- Text styles/faces: `python3 scripts/mcclim_docs_lookup.py --doc specification --query "text-face"`
- Sheets/ports/grafts/mirrors: `python3 scripts/mcclim_docs_lookup.py --doc feature-map --query "Ports, Grafts"`
- Raster images: `--section "Raster Images"`
- Backends: `--section "Writing backends"` or `--query "Port protocol"`
- Inspector/Clouseau: `--section "Inspector"`
- Listener: `--section "Listener"`
- Drei/text editing substrate: `--section "Text editor substrate"` and `--query "Drei"`
- Graphic Forms: `--query "Graphic Forms"` first; if absent, inspect the local McCLIM checkout or examples rather than inventing APIs from the manual
- Drei editor internals: `python3 scripts/mcclim_docs_lookup.py --doc drei --query "buffer protocol"`
- ESA/Emacs-style apps: `python3 scripts/mcclim_docs_lookup.py --doc esa --query "command table"`
- Tutorial examples: `python3 scripts/mcclim_docs_lookup.py --doc guided-tour --section "Our first application"`
- Implementation notes: `python3 scripts/mcclim_docs_lookup.py --doc notes --query "presentation types"`
- Bundled CLIM specification source: `python3 scripts/mcclim_docs_lookup.py --doc specification --query "medium-ink"`
- Historical context: `python3 scripts/mcclim_docs_lookup.py --doc historical --query "release"`
- CLIM full feature map: `python3 scripts/mcclim_docs_lookup.py --doc feature-map --query "Chapter 23"`
- McCLIM example map: `python3 scripts/mcclim_docs_lookup.py --doc example-map --query "simple-spreadsheet"`
- Franz guide: `python3 scripts/mcclim_docs_lookup.py --doc franz-guide --query "Presentation translators"`
- LispWorks guide: `python3 scripts/mcclim_docs_lookup.py --doc lispworks-guide --query "Mediums, Sheets, and Streams"`

## Answering Guidance

When using this skill:

- cite the section names or reference files used;
- include Common Lisp/McCLIM code only after checking a nearby manual/source/example pattern when one is available;
- distinguish portable CLIM, McCLIM extensions, vendor-specific guide wording, historical notes, and internal developer protocols;
- keep application logic, presentation semantics, and visual style separate in explanations and code;
- prefer command/presentation-oriented designs for semantic UIs instead of raw callbacks and coordinate hit tests;
- use gadgets and callbacks when the problem really is a conventional control surface;
- say when a topic is manual-adjacent or undocumented, especially Graphic Forms or backend internals;
- keep snippets focused and mention any unverified local runtime assumptions.

## Implementation Contract

For application-building tasks, the final answer or code should make clear:

1. the chosen application style;
2. the frame, pane, and layout structure;
3. which CLIM mechanisms are being used and why;
4. which data is application state versus presentation metadata versus visual style;
5. where presentations, translators, commands, gadgets, output records, or redisplay enter;
6. what is portable CLIM and what is McCLIM-specific;
7. which references or examples grounded the decision.
