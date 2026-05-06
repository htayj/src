#!/usr/bin/env python3
"""Search and extract bounded sections from the bundled McCLIM manual."""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
MANUAL = ROOT / "references" / "mcclim-manual.md"


@dataclass(frozen=True)
class Heading:
    line_no: int
    level: int
    title: str


def read_lines() -> list[str]:
    try:
        return MANUAL.read_text(encoding="utf-8").splitlines()
    except FileNotFoundError:
        sys.exit(f"manual not found: {MANUAL}")


def clean_title(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\s+", " ", text).strip()


def normalized_title(text: str) -> str:
    text = clean_title(text).lower()
    return re.sub(r"^\d+(?:\.\d+)*\.?\s+", "", text)


def headings(lines: list[str]) -> list[Heading]:
    found: list[Heading] = []
    for idx, line in enumerate(lines, 1):
        match = re.match(r"^(#{1,6})\s+(.+?)\s*$", line)
        if not match:
            continue
        title = clean_title(match.group(2))
        if title == "Table of Contents":
            continue
        found.append(Heading(idx, len(match.group(1)), title))
    return found


def section_bounds(all_headings: list[Heading], selected: Heading, total_lines: int) -> tuple[int, int]:
    end = total_lines
    for candidate in all_headings:
        if candidate.line_no <= selected.line_no:
            continue
        if candidate.level <= selected.level:
            end = candidate.line_no - 1
            break
    return selected.line_no, end


def list_headings(all_headings: list[Heading]) -> None:
    for item in all_headings:
        indent = "  " * max(item.level - 1, 0)
        print(f"{item.line_no}: {indent}{item.title}")


def extract_section(lines: list[str], all_headings: list[Heading], selector: str, max_lines: int | None) -> None:
    selector_lc = selector.lower()
    selector_norm = normalized_title(selector)
    exact_matches = [
        item
        for item in all_headings
        if selector_lc == item.title.lower() or selector_norm == normalized_title(item.title)
    ]
    matches = exact_matches or [item for item in all_headings if selector_lc in item.title.lower()]
    if not matches:
        sys.exit(f"no heading matched: {selector}")
    selected = matches[0]
    start, end = section_bounds(all_headings, selected, len(lines))
    if max_lines is not None:
        end = min(end, start + max_lines - 1)
    for line_no in range(start, end + 1):
        print(f"{line_no}: {lines[line_no - 1]}")


def search(lines: list[str], query: str, context: int, limit: int, regex: bool) -> None:
    flags = re.IGNORECASE
    pattern = re.compile(query if regex else re.escape(query), flags)
    matches = [idx for idx, line in enumerate(lines, 1) if pattern.search(line)]
    if not matches:
        sys.exit(f"no matches for: {query}")

    printed_ranges: list[tuple[int, int]] = []
    for match_no, line_no in enumerate(matches[:limit], 1):
        start = max(1, line_no - context)
        end = min(len(lines), line_no + context)
        if printed_ranges and start <= printed_ranges[-1][1] + 1:
            start = printed_ranges[-1][1] + 1
        if start > end:
            continue
        printed_ranges.append((start, end))
        print(f"--- match {match_no}: line {line_no} ---")
        for current in range(start, end + 1):
            print(f"{current}: {lines[current - 1]}")


def write_index(lines: list[str], all_headings: list[Heading], output: Path) -> None:
    topic_hints = [
        ("Getting started", "Building McCLIM; The first application; Defining Application Frames; Executing the Application"),
        ("Application frames and panes", "Defining Application Frames; Panes and Gadgets; Panes; Creating panes; Pane names"),
        ("Commands and menus", "Using command tables; Using menu bar; Command Processing; Frame command table change"),
        ("Presentations and views", "Using presentation types; Using views; Extended blank area presentation type"),
        ("Redisplay and output", "Using incremental redisplay; Output Protocol; Incremental redisplay; Extended text formatting"),
        ("Drawing and media", "Concepts; Drawing functions; Raster Images; Drawing backends; Additional arguments to drawing functions"),
        ("Backends and ports", "Writing backends; Backend protocol; Event handling; Medium drawing; Port protocol"),
        ("Bundled applications", "Debugger; Inspector; Listener; manual-adjacent: Graphic Forms, Drei"),
        ("Extensions", "Frame redefinition semantics; Frame and sheet icons; Text editor substrate; Tab Layout; Fonts and Extended Text Styles"),
    ]
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", encoding="utf-8") as handle:
        handle.write("# McCLIM Manual Index\n\n")
        handle.write("Source URL: https://mcclim.common-lisp.dev/static/manual/mcclim.html\n\n")
        handle.write("Converted reference: `references/mcclim-manual.md`\n\n")
        handle.write("Conversion notes: generated from the upstream HTML with `pandoc --from html-native_divs-native_spans --to gfm-raw_html --wrap=none --markdown-headings=atx`, then Texinfo navigation lines were removed.\n\n")
        handle.write("Use this index before loading the full manual. Prefer the lookup script for bounded extracts:\n\n")
        handle.write("```bash\n")
        handle.write("python3 scripts/mcclim_manual_lookup.py --query \"incremental redisplay\"\n")
        handle.write("python3 scripts/mcclim_manual_lookup.py --section \"Raster Images\"\n")
        handle.write("python3 scripts/mcclim_manual_lookup.py --list-headings\n")
        handle.write("```\n\n")
        handle.write("## Topic Hints\n\n")
        for topic, hint in topic_hints:
            handle.write(f"- **{topic}**: {hint}\n")
        handle.write("\n## Section Map\n\n")
        for item in all_headings:
            indent = "  " * max(item.level - 1, 0)
            handle.write(f"- line {item.line_no}: {indent}{item.title}\n")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--query", help="case-insensitive text or regex to search for")
    group.add_argument("--section", help="extract first heading containing this text")
    group.add_argument("--list-headings", action="store_true", help="print heading map with line numbers")
    group.add_argument("--write-index", help="write a Markdown index to this path")
    parser.add_argument("--context", type=int, default=4, help="context lines around search matches")
    parser.add_argument("--limit", type=int, default=12, help="maximum search matches")
    parser.add_argument("--max-lines", type=int, default=220, help="maximum lines for --section output; use 0 for no cap")
    parser.add_argument("--regex", action="store_true", help="treat --query as a Python regular expression")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    lines = read_lines()
    all_headings = headings(lines)
    if args.list_headings:
        list_headings(all_headings)
    elif args.section:
        max_lines = None if args.max_lines == 0 else args.max_lines
        extract_section(lines, all_headings, args.section, max_lines)
    elif args.query:
        search(lines, args.query, args.context, args.limit, args.regex)
    elif args.write_index:
        write_index(lines, all_headings, Path(args.write_index))


if __name__ == "__main__":
    main()
