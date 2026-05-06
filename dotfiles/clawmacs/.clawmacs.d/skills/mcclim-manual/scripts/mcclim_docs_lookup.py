#!/usr/bin/env python3
"""Search and extract bounded sections from bundled McCLIM docs."""

from __future__ import annotations

import argparse
import re
import sys
from dataclasses import dataclass
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

DOCS = {
    "app-guide": ROOT / "references" / "mcclim-application-guide.md",
    "source-map": ROOT / "references" / "merged-source-map.md",
    "manual": ROOT / "references" / "mcclim-manual.md",
    "drei": ROOT / "references" / "modules" / "documentation-drei.md",
    "esa": ROOT / "references" / "modules" / "documentation-esa.md",
    "guided-tour": ROOT / "references" / "modules" / "documentation-guided-tour.md",
    "notes": ROOT / "references" / "modules" / "documentation-notes.md",
    "specification": ROOT / "references" / "modules" / "documentation-specification.md",
    "historical": ROOT / "references" / "modules" / "documentation-historical.md",
    "portable-guide": ROOT / "sources" / "clim-spec" / "references" / "building-with-mcclim.md",
    "feature-map": ROOT / "sources" / "clim-spec" / "references" / "full-spec-feature-map.md",
    "example-map": ROOT / "sources" / "clim-spec" / "references" / "mcclim-example-map.md",
    "franz-index": ROOT / "sources" / "franz-clim-guide" / "references" / "franz-clim-user-guide-index.md",
    "franz-guide": ROOT / "sources" / "franz-clim-guide" / "references" / "franz-clim-user-guide.md",
    "lispworks-index": ROOT / "sources" / "lispworks-clim-guide" / "references" / "lispworks-clim-user-guide-index.md",
    "lispworks-guide": ROOT / "sources" / "lispworks-clim-guide" / "references" / "lispworks-clim-user-guide.md",
    "presentation-model": ROOT / "sources" / "presentation-based-interfaces" / "references" / "presentation-interface-model.md",
    "presentation-index": ROOT / "sources" / "presentation-based-interfaces" / "references" / "source-index.md",
    "presentation-ciccarelli": ROOT / "sources" / "presentation-based-interfaces" / "references" / "presentation-based-user-interfaces.md",
    "presentation-semantics": ROOT / "sources" / "presentation-based-interfaces" / "references" / "application-semantics-presentation-manager.md",
    "presentation-supplement": ROOT / "sources" / "presentation-based-interfaces" / "references" / "supplemental-presentation-types-note.md",
}


@dataclass(frozen=True)
class Heading:
    line_no: int
    level: int
    title: str


def read_doc(doc: str) -> list[str]:
    path = DOCS[doc]
    if not path.exists():
        sys.exit(f"doc not found: {doc} -> {path}")
    return path.read_text(encoding="utf-8").splitlines()


def clean_title(text: str) -> str:
    text = re.sub(r"<[^>]+>", "", text)
    return re.sub(r"\s+", " ", text).strip()


def normalized_title(text: str) -> str:
    text = clean_title(text).lower()
    return re.sub(r"^\d+(?:\.\d+)*\.?\s+", "", text)


def headings(lines: list[str]) -> list[Heading]:
    result: list[Heading] = []
    for idx, line in enumerate(lines, 1):
        match = re.match(r"^(#{1,6})\s+(.+?)\s*$", line)
        if match:
            title = clean_title(match.group(2))
            if title != "Table of Contents":
                result.append(Heading(idx, len(match.group(1)), title))
    return result


def section_bounds(all_headings: list[Heading], selected: Heading, total_lines: int) -> tuple[int, int]:
    end = total_lines
    for candidate in all_headings:
        if candidate.line_no <= selected.line_no:
            continue
        if candidate.level <= selected.level:
            end = candidate.line_no - 1
            break
    return selected.line_no, end


def list_docs() -> None:
    for name, path in DOCS.items():
        status = "ok" if path.exists() else "missing"
        print(f"{name}\t{status}\t{path.relative_to(ROOT)}")


def list_headings(doc: str) -> None:
    for item in headings(read_doc(doc)):
        indent = "  " * max(item.level - 1, 0)
        print(f"{doc}:{item.line_no}: {indent}{item.title}")


def extract_section(doc: str, selector: str, max_lines: int | None) -> None:
    lines = read_doc(doc)
    all_headings = headings(lines)
    selector_lc = selector.lower()
    selector_norm = normalized_title(selector)
    exact = [
        item
        for item in all_headings
        if selector_lc == item.title.lower() or selector_norm == normalized_title(item.title)
    ]
    matches = exact or [item for item in all_headings if selector_lc in item.title.lower()]
    if not matches:
        sys.exit(f"no heading matched in {doc}: {selector}")
    selected = matches[0]
    start, end = section_bounds(all_headings, selected, len(lines))
    if max_lines is not None:
        end = min(end, start + max_lines - 1)
    for line_no in range(start, end + 1):
        print(f"{doc}:{line_no}: {lines[line_no - 1]}")


def search_one(doc: str, query: str, context: int, limit: int, regex: bool) -> int:
    lines = read_doc(doc)
    flags = re.IGNORECASE
    pattern = re.compile(query if regex else re.escape(query), flags)
    matches = [idx for idx, line in enumerate(lines, 1) if pattern.search(line)]
    for match_no, line_no in enumerate(matches[:limit], 1):
        start = max(1, line_no - context)
        end = min(len(lines), line_no + context)
        print(f"--- {doc} match {match_no}: line {line_no} ---")
        for current in range(start, end + 1):
            print(f"{doc}:{current}: {lines[current - 1]}")
    return len(matches)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    doc_group = parser.add_mutually_exclusive_group()
    doc_group.add_argument("--doc", choices=sorted(DOCS), default="manual")
    doc_group.add_argument("--all-docs", action="store_true")
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument("--query")
    action.add_argument("--section")
    action.add_argument("--list-docs", action="store_true")
    action.add_argument("--list-headings", action="store_true")
    parser.add_argument("--context", type=int, default=4)
    parser.add_argument("--limit", type=int, default=12)
    parser.add_argument("--max-lines", type=int, default=220, help="0 disables cap for --section")
    parser.add_argument("--regex", action="store_true")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    if args.list_docs:
        list_docs()
        return

    docs = list(DOCS) if args.all_docs else [args.doc]
    if args.list_headings:
        for doc in docs:
            list_headings(doc)
        return

    if args.section:
        if len(docs) != 1:
            sys.exit("--section requires a single --doc")
        max_lines = None if args.max_lines == 0 else args.max_lines
        extract_section(docs[0], args.section, max_lines)
        return

    total = 0
    for doc in docs:
        total += search_one(doc, args.query, args.context, args.limit, args.regex)
    if total == 0:
        sys.exit(f"no matches for: {args.query}")


if __name__ == "__main__":
    main()
