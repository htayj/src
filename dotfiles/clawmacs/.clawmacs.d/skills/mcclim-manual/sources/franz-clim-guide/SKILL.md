---
name: franz-clim-guide
description: "Use when users need Franz/Allegro CLIM documentation from the CLIM 2.2 User Guide: Allegro CLIM setup, Motif/X11 notes, drawing, colors, designs/inks, text styles, presentations, frames, commands, formatted output, redisplay, gadgets, input editing, streams, Silica, or vendor-specific CLIM behavior."
---

# Franz CLIM Guide

## Purpose

Use this skill for Franz/Allegro CLIM 2.2 documentation. It complements `clim-spec`, `mcclim-manual`, and `lispworks-clim-guide`: use the CLIM spec for portable normative behavior, McCLIM docs for McCLIM-specific behavior, and this guide for Allegro CLIM wording, setup, examples, and implementation notes.

## Progressive Disclosure

Start with the index and a bounded lookup. Do not load the full guide unless the query needs broad adjacent context.

1. Read `references/franz-clim-user-guide-index.md` for routing, topic map, and heading line numbers.
2. Use `scripts/franz_clim_lookup.py` to search or extract the smallest relevant section.
3. Read `references/franz-clim-user-guide.md` only when lookup output is not enough.

Common commands from this skill directory:

```bash
python3 scripts/franz_clim_lookup.py --query "dynamic colors"
python3 scripts/franz_clim_lookup.py --query "define-application-frame"
python3 scripts/franz_clim_lookup.py --section "Chapter 7"
python3 scripts/franz_clim_lookup.py --section "8.7 Presentation translators"
python3 scripts/franz_clim_lookup.py --list-headings
```

## When To Use This Guide

- Allegro CLIM setup, loading, server paths, Motif/window-manager behavior, X resources, patches, and demos.
- Conceptual CLIM explanations with Franz examples: drawing, mediums, transformations, colors, designs, presentations, frames, commands, formatted output, redisplay, input editing, gadgets, streams, and Silica.
- Vendor comparison questions where Franz behavior or wording may differ from McCLIM or LispWorks.

## Prefer Another Skill When

- Use `clim-spec` for portable, normative CLIM 2 API semantics.
- Use `mcclim-manual` for McCLIM extensions, backends, examples, Drei, ESA, Clouseau, Listener, Graphic Forms, or McCLIM implementation details.
- Use `lispworks-clim-guide` for LispWorks CLIM behavior, CAPI integration, Liquid CLIM/Motif, or LispWorks implementation specifics.

## Resource Map

- `references/franz-clim-user-guide-index.md`: first stop; chapter map and generated heading index.
- `references/franz-clim-user-guide.md`: full Markdown conversion of the Franz CLIM 2.2 User Guide PDF.
- `scripts/franz_clim_lookup.py`: bounded query, heading listing, and section extraction.
- External preserved source: `/home/tay/reference/external_docs/franz-clim-user-guide/source/clim-ug.pdf`
- External Markdown copy: `/home/tay/reference/external_docs/franz-clim-user-guide/markdown/franz-clim-user-guide.md`

## Answering Guidance

- Cite the Franz guide section names you used.
- Say when advice is Allegro/Franz-specific rather than portable CLIM.
- Cross-check with `clim-spec` when the answer depends on standard behavior.
- Cross-check with `mcclim-manual` before applying Franz-specific setup or implementation details to McCLIM.
