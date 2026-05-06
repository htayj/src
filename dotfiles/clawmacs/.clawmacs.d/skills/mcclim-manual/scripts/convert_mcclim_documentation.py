#!/usr/bin/env python3
"""Convert McCLIM Documentation/ modules into skill Markdown references."""

from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import tempfile
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
DEFAULT_SOURCE = Path("/home/tay/reference/external_src/mcclim/Documentation")
OUT_DIR = ROOT / "references" / "modules"
DOCS_INDEX = ROOT / "references" / "documentation-modules-index.md"


MODULES = {
    "drei": {
        "title": "Drei Editor Substrate",
        "file": "documentation-drei.md",
        "when": "Use for McCLIM's editor substrate: buffers, marks, views, undo, kill ring, syntax modules, redisplay, editor commands, and input/editor-pane/gadget variants.",
    },
    "esa": {
        "title": "ESA Emacs-Style Applications",
        "file": "documentation-esa.md",
        "when": "Use for Emacs-style CLIM application structure: ESA frame/pane/buffer mixins, minibuffer/info panes, M-x, command tables, keyboard macros, and buffer file I/O.",
    },
    "guided-tour": {
        "title": "Guided Tour",
        "file": "documentation-guided-tour.md",
        "when": "Use for tutorial-style CLIM application examples: hello world, custom panes, drawing, command definitions, file browser, scheduler, and layered CLIM concepts.",
    },
    "notes": {
        "title": "Implementation Notes",
        "file": "documentation-notes.md",
        "when": "Use for McCLIM implementation/design notes on presentation types, extended stream input, regions, sheet geometry, and layout protocol.",
    },
    "specification": {
        "title": "Bundled CLIM II Specification Source",
        "file": "documentation-specification.md",
        "when": "Use for the CLIM II specification copy bundled in the McCLIM source tree. Prefer the separate clim-spec skill for exact section lookup when available.",
    },
    "historical": {
        "title": "Historical Documents",
        "file": "documentation-historical.md",
        "when": "Use for old release notes, historical project notes, and context about older McCLIM changes.",
    },
}


SIMPLE_MACROS = {
    "CLIM": "CLIM",
    "CLOS": "CLOS",
    "mcclim": "McCLIM",
    "sysname": "ESA",
    "mop": "MOP",
    "bs": "\\\\",
    "optional": "&optional ",
    "rest": "&rest ",
    "key": "&key ",
    "allow": "&allow-other-keys ",
    "body": "&body ",
    "AbstractClass": "This class is an abstract class, intended only to be subclassed, not instantiated. ",
    "Mutable": "Members of this class are mutable. ",
    "Immutable": "Members of this class are immutable. ",
    "UncapturedInputs": "This function does not capture any of its mutable inputs. ",
}

INLINE_CODE_MACROS = {
    "cl",
    "class",
    "code",
    "constant",
    "function",
    "kbd",
    "keyword",
    "lispobj",
    "macro",
    "method",
    "syntax",
    "variable",
}

INLINE_EMPH_MACROS = {"arg", "concept", "metavar", "term"}

DEF_TWO_ARG = {
    "Callback": "Callback Generic Function",
    "callback": "Callback Generic Function",
    "Defaftermethod": ":After Method",
    "Defaroundmethod": ":Around Method",
    "Defcommand": "Command",
    "Defdp": "Server Path",
    "Defgeneric": "Generic Function",
    "Defmacro": "Macro",
    "Defmethod": "Method",
    "Defpredicate": "Protocol Predicate",
    "Defptype": "Presentation Type",
    "DefptypeAbbrev": "Presentation Type Abbreviation",
    "Defun": "Function",
    "defgeneric": "Generic Function",
    "defmacro": "Macro",
    "defmethod": "Method",
    "defpredicate": "Protocol Predicate",
    "defun": "Function",
}

DEF_ONE_ARG = {
    "Defclass": "Class",
    "Defcommandtable": "Command Table",
    "Defcondition": "Condition",
    "Defconst": "Constant",
    "Deferror": "Error Condition",
    "Defgadget": "Abstract Gadget",
    "Definitarg": "Initarg",
    "Deflpane": "Layout Pane",
    "Defoption": "Option",
    "Defprotoclass": "Protocol Class",
    "Defrestart": "Restart",
    "Defspane": "Service Pane",
    "Deftype": "Type",
    "Defvar": "Variable",
    "defclass": "Class",
    "defconst": "Constant",
    "defgadget": "Abstract Gadget",
    "definitarg": "Initarg",
    "deflpane": "Layout Pane",
    "defoption": "Option",
    "defprotoclass": "Protocol Class",
    "defspane": "Service Pane",
    "deftype": "Type",
    "defvar": "Variable",
}


def run(cmd: list[str], cwd: Path | None = None) -> None:
    subprocess.run(cmd, cwd=cwd, check=True)


def ensure_tools() -> None:
    for tool in ("pandoc", "makeinfo"):
        if shutil.which(tool) is None:
            raise SystemExit(f"required tool not found: {tool}")


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8", errors="replace")


def write(path: Path, text: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(text, encoding="utf-8")


def clean_markdown(text: str) -> str:
    lines: list[str] = []
    nav = re.compile(r"^(?:Next|Previous|Up): .*(?:\[Contents\]|\[Index\])")
    for line in text.replace("\u00a0", " ").splitlines():
        if line == "------------------------------------------------------------------------":
            continue
        if nav.match(line):
            continue
        if line.strip() in {"\\", "{}"}:
            continue
        had_pilcrow = bool(re.search(r"\s*\[¶\]\(#.*?\)\s*$", line))
        line = re.sub(r"\s*\[¶\]\(#.*?\)\s*$", "", line)
        if had_pilcrow and not line.startswith("#"):
            numbered = re.match(r"^(\d+(?:\.\d+)*)\s+(.+)$", line.strip())
            if numbered:
                level = min(6, 1 + numbered.group(1).count("."))
                line = f"{'#' * level} {numbered.group(1)} {numbered.group(2)}"
            elif line.strip().startswith("**"):
                line = line.strip()
            elif line.strip():
                line = f"# {line.strip()}"
        line = re.sub(r"<span class=\"smallcaps\">([^<]+)</span>", lambda m: m.group(1).upper(), line)
        line = re.sub(r"<[^>]+>", "", line)
        lines.append(line.rstrip())

    compact: list[str] = []
    blank_count = 0
    for line in lines:
        if line:
            blank_count = 0
            compact.append(line)
        else:
            blank_count += 1
            if blank_count <= 2:
                compact.append("")
    return "\n".join(compact).strip() + "\n"


def pandoc_to_markdown(input_path: Path, output_path: Path, from_format: str, cwd: Path | None = None) -> None:
    with tempfile.NamedTemporaryFile(suffix=".md", delete=False) as tmp:
        tmp_path = Path(tmp.name)
    try:
        run(
            [
                "pandoc",
                "--from",
                from_format,
                "--to",
                "gfm-raw_html",
                "--wrap=none",
                "--markdown-headings=atx",
                str(input_path),
                "-o",
                str(tmp_path),
            ],
            cwd=cwd,
        )
        write(output_path, clean_markdown(read(tmp_path)))
    finally:
        tmp_path.unlink(missing_ok=True)


def crude_latex_markdown(text: str) -> str:
    text = re.sub(r"\\chapter\s*\{([^{}]*)\}", r"# \1", text)
    text = re.sub(r"\\section\s*\{([^{}]*)\}", r"## \1", text)
    text = re.sub(r"\\subsection\s*\{([^{}]*)\}", r"### \1", text)
    text = re.sub(r"\\subsubsection\s*\{([^{}]*)\}", r"#### \1", text)
    text = re.sub(r"\\paragraph\s*\{([^{}]*)\}", r"#### \1", text)
    text = text.replace("\\begin{verbatim}", "\n```text\n")
    text = text.replace("\\end{verbatim}", "\n```\n")
    text = re.sub(r"\\begin\{[^{}]*\}", "", text)
    text = re.sub(r"\\end\{[^{}]*\}", "", text)
    old = None
    while old != text:
        old = text
        text = re.sub(r"\\[A-Za-z@]+\*?\s*\{([^{}]*)\}", r"\1", text)
    text = re.sub(r"\\[A-Za-z@]+\*?", "", text)
    text = text.replace("~", " ")
    text = text.replace("\\_", "_").replace("\\%", "%").replace("\\&", "&")
    text = re.sub(r"[{}]", "", text)
    return clean_markdown(text)


def latex_text_to_markdown(text: str, cwd: Path) -> str:
    with tempfile.NamedTemporaryFile("w", suffix=".tex", delete=False, encoding="utf-8") as src:
        src.write("\\documentclass{report}\n\\begin{document}\n")
        src.write(text)
        src.write("\n\\end{document}\n")
        src_path = Path(src.name)
    with tempfile.NamedTemporaryFile(suffix=".md", delete=False) as dst:
        dst_path = Path(dst.name)
    try:
        result = subprocess.run(
            [
                "pandoc",
                "--from",
                "latex",
                "--to",
                "gfm-raw_html",
                "--wrap=none",
                "--markdown-headings=atx",
                str(src_path),
                "-o",
                str(dst_path),
            ],
            cwd=cwd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
        )
        if result.returncode == 0:
            return clean_markdown(read(dst_path))
        return crude_latex_markdown(text)
    finally:
        src_path.unlink(missing_ok=True)
        dst_path.unlink(missing_ok=True)


def texinfo_to_markdown(main: Path, includes: list[Path], output_path: Path, cwd: Path) -> None:
    with tempfile.TemporaryDirectory() as tmp_dir:
        html_path = Path(tmp_dir) / "out.html"
        cmd = ["makeinfo", "--html", "--no-split", "--no-headers"]
        for include in includes:
            cmd.extend(["-I", str(include)])
        cmd.extend(["-o", str(html_path), str(main)])
        run(cmd, cwd=cwd)
        pandoc_to_markdown(html_path, output_path, "html-native_divs-native_spans", cwd=cwd)


def replace_one_arg_macro(text: str, name: str, repl) -> str:
    pattern = re.compile(rf"\\{name}\s*\{{([^{{}}]*)\}}")
    old = None
    while old != text:
        old = text
        text = pattern.sub(repl, text)
    return text


def replace_two_arg_macro(text: str, name: str, repl) -> str:
    pattern = re.compile(rf"\\{name}\s*\{{([^{{}}]*)\}}\s*\{{([^{{}}]*)\}}")
    old = None
    while old != text:
        old = text
        text = pattern.sub(repl, text)
    return text


def preprocess_latex(text: str, module: str) -> str:
    text = re.sub(r"(?<!\\)%.*", "", text)
    text = re.sub(r"\\begin\{figure\*?\}.*?\\end\{figure\*?\}", "", text, flags=re.DOTALL)
    text = re.sub(r"\\begin\{picture\}.*?\\end\{picture\}", "", text, flags=re.DOTALL)

    for name, value in SIMPLE_MACROS.items():
        text = re.sub(rf"\\{name}\s*\{{\}}", value, text)
        text = re.sub(rf"\\{name}(?![A-Za-z])", value, text)

    for name in INLINE_CODE_MACROS:
        text = replace_one_arg_macro(text, name, lambda m: rf"\texttt{{{m.group(1)}}}")

    for name in INLINE_EMPH_MACROS:
        text = replace_one_arg_macro(text, name, lambda m: rf"\emph{{{m.group(1)}}}")

    for name, kind in DEF_TWO_ARG.items():
        text = replace_two_arg_macro(
            text,
            name,
            lambda m, kind=kind: rf"\paragraph{{\texttt{{{m.group(1).strip()}}} \emph{{{m.group(2).strip()}}} [{kind}]}}",
        )

    for name, kind in DEF_ONE_ARG.items():
        text = replace_one_arg_macro(
            text,
            name,
            lambda m, kind=kind: rf"\paragraph{{\texttt{{{m.group(1).strip()}}} [{kind}]}}",
        )

    text = re.sub(r"\\Issue\s*\{([^{}]*)\}\s*\{([^{}]*)\}", r"**Major issue:** \2 -- \1", text)
    text = re.sub(r"\\issue\s*\{([^{}]*)\}\s*\{([^{}]*)\}", r"**Minor issue:** \2 -- \1", text)
    text = re.sub(r"\\(index|label|cite|nocite)\s*\{[^{}]*\}", "", text)
    text = re.sub(r"\\bibliographystyle\s*\{[^{}]*\}", "", text)
    text = re.sub(r"\\bibliography\s*\{[^{}]*\}\s*\{[^{}]*\}", "", text)
    text = re.sub(r"\\inputfig\s*\{[^{}]*\}", "", text)
    text = re.sub(r"\\caption\s*\{[^{}]*(?:\{[^{}]*\}[^{}]*)*\}", "", text)
    text = re.sub(r"\\(begin|end)\{figure\*?\}", "", text)
    text = re.sub(r"^[ \t]*\{[A-Za-z0-9_.:-]+\}\}[ \t]*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"^[ \t]*\}+[ \t]*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"^[ \t]*\\def\\[A-Za-z@]+.*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"^[ \t]*\\newcommand\s*\\?[A-Za-z@]+.*$", "", text, flags=re.MULTILINE)
    text = re.sub(r"\\inputal\s*\{([^{}]*)\}", r"\\input{\1}", text)
    text = re.sub(r"\\inputcode\s*\{([^{}]*)\}", r"\\input{\1}", text)
    text = re.sub(r"\\inputtex\s*\{([^{}]*)\}", r"\\input{\1}", text)
    text = text.replace("\\begin{smalltt}", "\\begin{verbatim}")
    text = text.replace("\\end{smalltt}", "\\end{verbatim}")
    text = text.replace("\\begin{itemize0}", "\\begin{itemize}")
    text = text.replace("\\end{itemize0}", "\\end{itemize}")
    text = text.replace("\\begin{enumerate0}", "\\begin{enumerate}")
    text = text.replace("\\end{enumerate0}", "\\end{enumerate}")
    return text


def expand_latex_inputs(path: Path, root: Path, include_predicate=None, seen: set[Path] | None = None) -> str:
    if seen is None:
        seen = set()
    path = path.resolve()
    if path in seen:
        return ""
    seen.add(path)
    text = read(path)

    def repl(match: re.Match[str]) -> str:
        name = match.group(2)
        if not name.endswith(".tex"):
            name += ".tex"
        target = root / name
        if include_predicate and not include_predicate(target):
            return f"\n% skipped include {name}\n"
        if not target.exists():
            return f"\n% missing include {name}\n"
        return "\n" + expand_latex_inputs(target, root, include_predicate, seen) + "\n"

    return re.sub(r"\\(input|include|inputtex)\s*\{?([^{}\s]+)\}?", repl, text)


def convert_esa(source: Path) -> None:
    esa = source / "ESA"
    chapters = ["chap-intro.tex", "chap-package.tex", "chap-basic-use.tex", "chap-input-output.tex"]
    parts = ["\\documentclass{book}", "\\begin{document}"]
    parts.extend(read(esa / chapter) for chapter in chapters)
    parts.append("\\end{document}")
    text = "\n\n".join(parts)
    text = preprocess_latex(text, "esa")
    with tempfile.NamedTemporaryFile("w", suffix=".tex", delete=False, encoding="utf-8") as tmp:
        tmp.write(text)
        tmp_path = Path(tmp.name)
    try:
        out = OUT_DIR / MODULES["esa"]["file"]
        pandoc_to_markdown(tmp_path, out, "latex", cwd=esa)
        content = read(out)
        if not content.startswith("# ESA"):
            write(out, "# ESA Emacs-Style Applications\n\n" + content)
    finally:
        tmp_path.unlink(missing_ok=True)


def convert_guided_tour(source: Path) -> None:
    guided = source / "Guided-Tour"
    with tempfile.TemporaryDirectory() as tmp_dir:
        tmp = Path(tmp_dir) / "Guided-Tour"
        shutil.copytree(guided, tmp)
        for lisp in ["hello-world.lisp", "draw-frame.lisp", "file-browser.lisp", "scheduler.lisp"]:
            active = None
            for line in read(tmp / lisp).splitlines():
                if "LTAG-end" in line:
                    active = None
                if active:
                    with (tmp / f"{active}.cut").open("a", encoding="utf-8") as handle:
                        handle.write(line + "\n")
                if "LTAG-start" in line:
                    active = line.split("LTAG-start:", 1)[1].strip().split()[0]
        (tmp / "techno-dep.pstex_t").write_text("", encoding="utf-8")
        out = OUT_DIR / MODULES["guided-tour"]["file"]
        pandoc_to_markdown(tmp / "guided-tour.tex", out, "latex", cwd=tmp)
        content = read(out)
        if not content.startswith("# Guided Tour"):
            write(out, "# Guided Tour\n\n" + content)


def convert_specification(source: Path) -> None:
    spec = source / "Specification"
    chapter_names = [
        "acknowledgments.tex",
        "overview.tex",
        "conventions.tex",
        "regions.tex",
        "bboxes.tex",
        "transforms.tex",
        "silica.tex",
        "drawing-options.tex",
        "text-styles.tex",
        "graphics.tex",
        "colors.tex",
        "designs.tex",
        "extended-output.tex",
        "output-recording.tex",
        "table-formatting.tex",
        "graph-formatting.tex",
        "bordered-output.tex",
        "text-formatting.tex",
        "redisplay.tex",
        "extended-input.tex",
        "presentation-types.tex",
        "input-editing.tex",
        "menus.tex",
        "dialogs.tex",
        "frames.tex",
        "panes.tex",
        "gadgets.tex",
        "commands.tex",
        "gray-streams.tex",
        "encapsulating-streams.tex",
        "clim-sys.tex",
        "extensions.tex",
        "glossary.tex",
        "changes.tex",
    ]
    chunks = [
        "# Bundled CLIM II Specification Source",
        "",
        "Conversion note: this is converted from the LaTeX source in McCLIM's `Documentation/Specification` directory. Some old TeX figures and specification macros are simplified. Prefer the separate `clim-spec` skill for exact section lookup when available.",
        "",
    ]
    for name in chapter_names:
        target = spec / name
        if target.exists():
            chapter = expand_latex_inputs(target, spec, lambda p: p.name in chapter_names)
            chapter = preprocess_latex(chapter, "specification")
            chunks.append(latex_text_to_markdown(chapter, spec))
    write(OUT_DIR / MODULES["specification"]["file"], clean_markdown("\n".join(chunks)))


def convert_drei(source: Path) -> None:
    drei = source / "Drei"
    texinfo_to_markdown(
        drei / "drei.texi",
        [drei / "docstrings"],
        OUT_DIR / MODULES["drei"]["file"],
        drei,
    )


def convert_notes(source: Path) -> None:
    notes = source / "Notes"
    chunks = ["# McCLIM Implementation Notes\n"]
    for org_file in sorted(notes.glob("*.org")):
        with tempfile.NamedTemporaryFile(suffix=".md", delete=False) as tmp:
            tmp_path = Path(tmp.name)
        try:
            pandoc_to_markdown(org_file, tmp_path, "org", cwd=notes)
            title = org_file.stem.replace("-", " ").title()
            chunks.append(f"\n# {title}\n\n")
            chunks.append(read(tmp_path))
        finally:
            tmp_path.unlink(missing_ok=True)
    write(OUT_DIR / MODULES["notes"]["file"], clean_markdown("\n".join(chunks)))


def convert_historical(source: Path) -> None:
    hist = source / "historical-documents"
    chunks = ["# McCLIM Historical Documents\n"]
    for item in sorted(path for path in hist.iterdir() if path.is_file()):
        chunks.append(f"\n## {item.name}\n\n")
        chunks.append("```text\n")
        chunks.append(read(item).rstrip())
        chunks.append("\n```\n")
    write(OUT_DIR / MODULES["historical"]["file"], "\n".join(chunks).strip() + "\n")


def headings(markdown: str) -> list[tuple[int, str]]:
    result: list[tuple[int, str]] = []
    for idx, line in enumerate(markdown.splitlines(), 1):
        match = re.match(r"^(#{1,6})\s+(.+?)\s*$", line)
        if match:
            result.append((idx, "  " * (len(match.group(1)) - 1) + match.group(2)))
    return result


def write_index(source: Path = DEFAULT_SOURCE) -> None:
    lines = [
        "# McCLIM Documentation Modules Index",
        "",
        f"Source directory: `{source}`",
        "",
        "Use this index before loading module references. Prefer bounded lookups:",
        "",
        "```bash",
        "python3 scripts/mcclim_docs_lookup.py --list-docs",
        "python3 scripts/mcclim_docs_lookup.py --doc drei --query \"syntax module\"",
        "python3 scripts/mcclim_docs_lookup.py --doc guided-tour --section \"Our first application\"",
        "python3 scripts/mcclim_docs_lookup.py --all-docs --query \"minibuffer\"",
        "```",
        "",
        "## Module Routing",
        "",
    ]
    for key, info in MODULES.items():
        path = OUT_DIR / info["file"]
        lines.append(f"- **{key}** (`references/modules/{info['file']}`): {info['when']}")
        if path.exists():
            wc = len(read(path).split())
            lines.append(f"  Word count: {wc}")
    lines.append("")
    lines.append("## Section Maps")
    for key, info in MODULES.items():
        path = OUT_DIR / info["file"]
        if not path.exists():
            continue
        lines.append("")
        lines.append(f"### {key}: {info['title']}")
        for line_no, title in headings(read(path)):
            lines.append(f"- line {line_no}: {title}")
    write(DOCS_INDEX, "\n".join(lines) + "\n")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, default=DEFAULT_SOURCE, help="McCLIM Documentation directory")
    parser.add_argument("--only", choices=sorted(MODULES), action="append", help="Convert only selected module(s)")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    source = args.source
    if not source.exists():
        raise SystemExit(f"source Documentation directory not found: {source}")
    ensure_tools()
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    converters = {
        "drei": convert_drei,
        "esa": convert_esa,
        "guided-tour": convert_guided_tour,
        "notes": convert_notes,
        "specification": convert_specification,
        "historical": convert_historical,
    }
    selected = args.only or list(converters)
    for key in selected:
        converters[key](source)
    write_index(source)


if __name__ == "__main__":
    main()
