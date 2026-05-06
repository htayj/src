---
name: lispworks-clim-guide
description: "Use when users need LispWorks CLIM documentation from the Common Lisp Interface Manager User Guide: LispWorks CLIM concepts, setup, drawing, drawing environment, text styles, colors/designs/inks, presentations, frames, panes, gadgets, commands, menus/dialogs, streams, redisplay, input editing, sheets, ports, grafts, CAPI integration, Liquid CLIM, Motif, or Windows implementation notes."
---

# LispWorks CLIM Guide

## Purpose

Use this skill for LispWorks CLIM 2.0 documentation. It complements `clim-spec`, `mcclim-manual`, and `franz-clim-guide`: use the CLIM spec for portable normative behavior, McCLIM docs for McCLIM-specific behavior, and this guide for LispWorks wording, examples, CAPI integration, and implementation notes.

## Progressive Disclosure

Start with the index and a bounded lookup. Do not load the full guide unless the query needs broad adjacent context.

1. Read `references/lispworks-clim-user-guide-index.md` for routing, topic map, and heading line numbers.
2. Use `scripts/lispworks_clim_lookup.py` to search or extract the smallest relevant section.
3. Read `references/lispworks-clim-user-guide.md` only when lookup output is not enough.

Common commands from this skill directory:

```bash
python3 scripts/lispworks_clim_lookup.py --query "CAPI gadgets"
python3 scripts/lispworks_clim_lookup.py --query "ports grafts mirrored sheets"
python3 scripts/lispworks_clim_lookup.py --section "Chapter 5"
python3 scripts/lispworks_clim_lookup.py --section "Appendix D"
python3 scripts/lispworks_clim_lookup.py --list-headings
```

## When To Use This Guide

- LispWorks CLIM behavior, examples, implementation specifics, CAPI integration, Liquid CLIM/Motif notes, Windows details, and CLIM-SYS material.
- Conceptual CLIM explanations with LispWorks examples: drawing, mediums, transformations, text styles, colors/designs, presentations, frames, panes, commands, formatted output, streams, sheets, ports, grafts, and mirrored sheets.
- Vendor comparison questions where LispWorks behavior or wording may differ from McCLIM or Franz.

## Prefer Another Skill When

- Use `clim-spec` for portable, normative CLIM 2 API semantics.
- Use `mcclim-manual` for McCLIM extensions, backends, examples, Drei, ESA, Clouseau, Listener, Graphic Forms, or McCLIM implementation details.
- Use `franz-clim-guide` for Allegro CLIM setup, Motif/X11 notes, dynamic/layered colors, Silica notes, or Franz-specific documentation wording.

## Resource Map

- `references/lispworks-clim-user-guide-index.md`: first stop; chapter map and generated heading index.
- `references/lispworks-clim-user-guide.md`: full Markdown conversion of the mirrored LispWorks CLIM guide HTML.
- `scripts/lispworks_clim_lookup.py`: bounded query, heading listing, and section extraction.
- External preserved source: `/home/tay/reference/external_docs/lispworks-clim-user-guide/source/html/`
- External Markdown copy: `/home/tay/reference/external_docs/lispworks-clim-user-guide/markdown/lispworks-clim-user-guide.md`

## Answering Guidance

- Cite the LispWorks guide section names you used.
- Say when advice is LispWorks-specific rather than portable CLIM.
- Cross-check with `clim-spec` when the answer depends on standard behavior.
- Cross-check with `mcclim-manual` before applying LispWorks-specific setup or implementation details to McCLIM.
