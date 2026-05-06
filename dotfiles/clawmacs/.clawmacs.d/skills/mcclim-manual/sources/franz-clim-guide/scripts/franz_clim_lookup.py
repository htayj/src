#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

DOC = Path(__file__).resolve().parents[1] / "references" / "franz-clim-user-guide.md"


def load_lines() -> list[str]:
    try:
        return DOC.read_text(encoding="utf-8").splitlines()
    except FileNotFoundError:
        sys.exit(f"Missing reference file: {DOC}")


def heading_rows(lines: list[str]) -> list[tuple[int, int, str]]:
    rows = []
    for index, line in enumerate(lines):
        match = re.match(r"^(#{1,6})\s+(.+)$", line)
        if match:
            rows.append((index, len(match.group(1)), match.group(2).strip()))
    return rows


def print_slice(lines: list[str], start: int, end: int, max_lines: int) -> None:
    shown_end = min(end, start + max_lines)
    for offset in range(start, shown_end):
        print(f"L{offset + 1}: {lines[offset]}")
    if shown_end < end:
        print(f"... truncated {end - shown_end} lines; raise --max-lines for more")


def list_headings(lines: list[str]) -> None:
    for index, level, text in heading_rows(lines):
        indent = "  " * (level - 1)
        print(f"L{index + 1}: {indent}{text}")


def extract_section(lines: list[str], needle: str, max_lines: int) -> int:
    folded = needle.casefold()
    rows = heading_rows(lines)
    candidates = []
    for pos, (index, level, text) in enumerate(rows):
        if folded in text.casefold():
            end = len(lines)
            for next_index, next_level, _ in rows[pos + 1 :]:
                if next_level <= level:
                    end = next_index
                    break
            candidates.append((end - index, index, end))
    if candidates:
        _, index, end = max(candidates)
        print_slice(lines, index, end, max_lines)
        return 0
    print(f"No heading matched: {needle}", file=sys.stderr)
    return 1


def search(lines: list[str], query: str, context: int, max_matches: int) -> int:
    folded = query.casefold()
    hits = [index for index, line in enumerate(lines) if folded in line.casefold()]
    if not hits:
        print(f"No matches for: {query}", file=sys.stderr)
        return 1
    for count, index in enumerate(hits[:max_matches], 1):
        if count > 1:
            print("\n---")
        start = max(0, index - context)
        end = min(len(lines), index + context + 1)
        print_slice(lines, start, end, end - start)
    if len(hits) > max_matches:
        print(f"\n... {len(hits) - max_matches} more matches; raise --max-matches for more")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description="Search the Franz CLIM User Guide Markdown.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--query", help="case-insensitive text search")
    group.add_argument("--section", help="heading substring to extract")
    group.add_argument("--list-headings", action="store_true", help="print Markdown headings with line numbers")
    parser.add_argument("--context", type=int, default=4, help="context lines around search matches")
    parser.add_argument("--max-matches", type=int, default=8, help="maximum search matches to print")
    parser.add_argument("--max-lines", type=int, default=240, help="maximum section lines to print")
    args = parser.parse_args()

    lines = load_lines()
    if args.list_headings:
        list_headings(lines)
        return 0
    if args.query:
        return search(lines, args.query, args.context, args.max_matches)
    return extract_section(lines, args.section, args.max_lines)


if __name__ == "__main__":
    raise SystemExit(main())
