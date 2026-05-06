#!/usr/bin/env python3
from __future__ import annotations

import argparse
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DOCS = {
    "synthesis": ROOT / "references" / "presentation-interface-model.md",
    "index": ROOT / "references" / "source-index.md",
    "ciccarelli": ROOT / "references" / "presentation-based-user-interfaces.md",
    "semantics": ROOT / "references" / "application-semantics-presentation-manager.md",
    "supplement": ROOT / "references" / "supplemental-presentation-types-note.md",
}


def load_doc(name: str) -> list[str]:
    path = DOCS[name]
    try:
        return path.read_text(encoding="utf-8").splitlines()
    except FileNotFoundError:
        sys.exit(f"Missing reference file: {path}")


def heading_rows(lines: list[str]) -> list[tuple[int, int, str]]:
    rows = []
    for index, line in enumerate(lines):
        match = re.match(r"^(#{1,6})\s+(.+)$", line)
        if match:
            rows.append((index, len(match.group(1)), match.group(2).strip()))
    return rows


def print_slice(lines: list[str], start: int, end: int, max_lines: int, label: str) -> None:
    shown_end = min(end, start + max_lines)
    print(f"## {label}")
    for offset in range(start, shown_end):
        print(f"L{offset + 1}: {lines[offset]}")
    if shown_end < end:
        print(f"... truncated {end - shown_end} lines; raise --max-lines for more")


def list_docs() -> None:
    for name, path in DOCS.items():
        print(f"{name}: {path.name}")


def list_headings(doc_names: list[str]) -> None:
    for name in doc_names:
        print(f"## {name}")
        for index, level, text in heading_rows(load_doc(name)):
            indent = "  " * (level - 1)
            print(f"L{index + 1}: {indent}{text}")


def extract_section(doc_names: list[str], needle: str, max_lines: int) -> int:
    folded = needle.casefold()
    candidates: list[tuple[int, str, list[str], int, int]] = []
    for name in doc_names:
        lines = load_doc(name)
        rows = heading_rows(lines)
        for pos, (index, level, text) in enumerate(rows):
            if folded in text.casefold():
                end = len(lines)
                for next_index, next_level, _ in rows[pos + 1 :]:
                    if next_level <= level:
                        end = next_index
                        break
                candidates.append((end - index, name, lines, index, end))
    if not candidates:
        print(f"No heading matched: {needle}", file=sys.stderr)
        return 1
    _, name, lines, start, end = max(candidates)
    print_slice(lines, start, end, max_lines, name)
    return 0


def search(doc_names: list[str], query: str, context: int, max_matches: int) -> int:
    folded = query.casefold()
    total = 0
    for name in doc_names:
        lines = load_doc(name)
        hits = [index for index, line in enumerate(lines) if folded in line.casefold()]
        if not hits:
            continue
        for index in hits[:max_matches]:
            if total:
                print("\n---")
            start = max(0, index - context)
            end = min(len(lines), index + context + 1)
            print_slice(lines, start, end, end - start, name)
            total += 1
        if len(hits) > max_matches:
            print(f"\n... {len(hits) - max_matches} more matches in {name}; use --doc {name} or raise --max-matches")
    if not total:
        print(f"No matches for: {query}", file=sys.stderr)
        return 1
    return 0


def selected_docs(doc: str | None) -> list[str]:
    if doc:
        if doc not in DOCS:
            sys.exit(f"Unknown --doc {doc}; use --list-docs")
        return [doc]
    return ["synthesis", "ciccarelli", "semantics", "supplement"]


def main() -> int:
    parser = argparse.ArgumentParser(description="Search presentation-based interface references.")
    group = parser.add_mutually_exclusive_group(required=True)
    group.add_argument("--query", help="case-insensitive text search")
    group.add_argument("--section", help="heading substring to extract")
    group.add_argument("--list-headings", action="store_true", help="print headings with line numbers")
    group.add_argument("--list-docs", action="store_true", help="print available document keys")
    parser.add_argument("--doc", choices=sorted(DOCS), help="limit search/section/list to one document")
    parser.add_argument("--context", type=int, default=4, help="context lines around search matches")
    parser.add_argument("--max-matches", type=int, default=8, help="maximum matches per document")
    parser.add_argument("--max-lines", type=int, default=220, help="maximum section lines to print")
    args = parser.parse_args()

    if args.list_docs:
        list_docs()
        return 0

    docs = selected_docs(args.doc)
    if args.list_headings:
        list_headings(docs)
        return 0
    if args.query:
        return search(docs, args.query, args.context, args.max_matches)
    return extract_section(docs, args.section, args.max_lines)


if __name__ == "__main__":
    raise SystemExit(main())
