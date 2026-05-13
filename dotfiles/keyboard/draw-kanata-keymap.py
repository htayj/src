#!/usr/bin/env python3
"""Render Kanata keymaps with keymap-drawer.

This small converter reads a Kanata config, optionally reads an XKB snippet that
maps Kanata `arbitrary-code` outputs to keysyms, emits keymap-drawer YAML, and
can call `keymap draw` to produce an SVG.

It intentionally handles the Kanata subset used by these Kinesis configs:
`defsrc`, `deflayer`, `defalias` tap-holds/arbitrary-code, and `defchordsv2`.
"""

from __future__ import annotations

import argparse
import re
import shutil
import subprocess
import sys
from pathlib import Path
from typing import Any

import yaml


SPACE_CADET_ALIAS_LABELS = {
    "gr": "Greek",
    "top": "Top",
}


TOKEN_LABELS = {
    "bspc": "bspc",
    "ent": "ent",
    "esc": "esc",
    "lctl": "lctl",
    "rctl": "rctl",
    "lalt": "lalt",
    "ralt": "ralt",
    "lmet": "lmet",
    "rmet": "rmet",
    "lshift": "lshift",
    "rshift": "rshift",
    "grv": "grv",
    "lrld": "lrld",
    "spc": "spc",
}


class ConversionError(RuntimeError):
    pass


def strip_block_comments(text: str) -> str:
    return re.sub(r"#\|.*?\|#", "", text, flags=re.S)


def strip_line_comment(line: str) -> str:
    # Kanata comments in these files use `;;`. A lone `;` is also a key name.
    return line.split(";;", 1)[0]


def tokenize(text: str) -> list[str]:
    text = strip_block_comments(text)
    text = "\n".join(strip_line_comment(line) for line in text.splitlines())
    return re.findall(r"\(|\)|[^\s()]+", text)


def parse_sexps(text: str) -> list[Any]:
    tokens = tokenize(text)
    pos = 0

    def parse_one() -> Any:
        nonlocal pos
        if pos >= len(tokens):
            raise ConversionError("unexpected end of tokens")
        tok = tokens[pos]
        pos += 1
        if tok == "(":
            values = []
            while pos < len(tokens) and tokens[pos] != ")":
                values.append(parse_one())
            if pos >= len(tokens):
                raise ConversionError("unclosed list in Kanata config")
            pos += 1
            return values
        if tok == ")":
            raise ConversionError("unexpected ')' in Kanata config")
        return tok

    forms = []
    while pos < len(tokens):
        forms.append(parse_one())
    return forms


def top_forms(text: str, name: str) -> list[list[Any]]:
    return [f for f in parse_sexps(text) if isinstance(f, list) and f and f[0] == name]


def form_by_name(text: str, form_name: str, item_name: str | None = None) -> list[Any]:
    for form in top_forms(text, form_name):
        if item_name is None or (len(form) > 1 and form[1] == item_name):
            return form
    raise ConversionError(f"could not find ({form_name} {item_name or ''})")


def rows_from_form(form: list[Any], payload_start: int) -> list[list[str]]:
    rows: list[list[str]] = []
    current: list[str] = []
    for item in form[payload_start:]:
        if isinstance(item, list):
            # deflayer/defsrc should not contain nested lists in the key matrix.
            if current:
                rows.append(current)
                current = []
            continue
        current.append(item)
    if current:
        rows.append(current)
    return rows


def rows_from_raw_block(text: str, form_name: str, item_name: str | None = None) -> list[list[str]]:
    """Return visual rows from a simple matrix-like top-level form.

    S-expression parsing loses row boundaries, so this line-oriented extractor is
    used for `defsrc` and `deflayer` matrices.
    """
    cleaned = strip_block_comments(text)
    header_re = re.compile(r"^\s*\(" + re.escape(form_name) + r"(?:\s+" + (re.escape(item_name) if item_name else r"[^\s)]+") + r")?\b")
    lines = cleaned.splitlines()
    in_form = False
    rows: list[list[str]] = []
    depth = 0
    for line in lines:
        no_comment = strip_line_comment(line)
        if not in_form:
            if not header_re.search(no_comment):
                continue
            in_form = True
            depth = no_comment.count("(") - no_comment.count(")")
            rest = no_comment[no_comment.find("(") + 1 :]
            parts = rest.split(None, 2)
            if len(parts) >= (2 if item_name else 1) and len(parts) == 3:
                tokens = re.findall(r"[^\s()]+", parts[2])
                if tokens:
                    rows.append(tokens)
            continue

        depth += no_comment.count("(") - no_comment.count(")")
        before_close = no_comment.split(")", 1)[0]
        tokens = re.findall(r"[^\s()]+", before_close)
        if tokens:
            rows.append(tokens)
        if depth <= 0:
            break
    if not rows:
        raise ConversionError(f"could not extract rows for {form_name} {item_name or ''}")
    return rows


def parse_aliases(text: str) -> dict[str, Any]:
    aliases: dict[str, Any] = {}
    for form in top_forms(text, "defalias"):
        items = form[1:]
        if len(items) % 2:
            raise ConversionError("defalias contains an odd number of name/value entries")
        for name, expr in zip(items[0::2], items[1::2], strict=True):
            aliases[str(name)] = expr
    return aliases


def parse_chords(text: str) -> list[tuple[list[str], str]]:
    chords: list[tuple[list[str], str]] = []
    for form in top_forms(text, "defchordsv2"):
        items = form[1:]
        i = 0
        while i + 1 < len(items):
            trigger = items[i]
            output = items[i + 1]
            if isinstance(trigger, list):
                chords.append(([str(x) for x in trigger], str(output)))
            # Skip: trigger, output, timeout, mode, actions-list
            i += 5
    return chords


def parse_kanata_comment_keysyms(text: str) -> dict[int, dict[str, str]]:
    out: dict[int, dict[str, str]] = {}
    pattern = re.compile(r"([A-Za-z0-9_-]+)\s+\(arbitrary-code\s+(\d+)\)\s*;;\s*->\s*([A-Za-z0-9_]+)")
    for alias, code, keysym in pattern.findall(text):
        display = alias.removeprefix("sc-").replace("-", " ").title()
        out[int(code)] = {"keysym": keysym, "display": display}
    return out


def parse_xkb_keysyms(path: Path | None) -> dict[int, dict[str, str]]:
    if path is None:
        return {}
    text = path.read_text()
    keycodes: dict[str, int] = {}
    for name, code in re.findall(r"<([^>]+)>\s*=\s*(\d+)\s*;", text):
        keycodes[name] = int(code)

    out: dict[int, dict[str, str]] = {}
    for line in text.splitlines():
        body, _, comment = line.partition("//")
        match = re.search(r"key\s+<([^>]+)>\s*\{.*?\[\s*([^\],\s]+)", body)
        if not match:
            continue
        name, keysym = match.groups()
        code = keycodes.get(name)
        if code is None:
            # XKB's evdev aliases name high keycodes as <I120>, <I208>, ...
            # while Kanata arbitrary-code uses the Linux evdev code. X11's
            # evdev keycode is normally Linux code + 8, so convert back.
            match = re.fullmatch(r"I(\d+)", name)
            if match:
                code = int(match.group(1)) - 8
            elif name == "HELP":
                code = 138
            else:
                continue
        comment = comment.strip()
        display = comment.replace("-", " ").title() if comment else keysym
        out[code] = {"keysym": keysym.strip(), "display": display}
    return out


def expand_kinesis_rows(rows: list[list[str]]) -> list[str]:
    """Expand the visual Kinesis matrix to the existing QMK info.json order."""
    counts = [len(r) for r in rows]
    expected_prefixes = ([12, 12, 12, 12, 8, 4, 2, 6], [12, 14, 14, 12, 8, 4, 2, 6])
    if counts not in expected_prefixes:
        # Fall back to a simple flatten for other keyboards.
        return [key for row in rows for key in row]

    out: list[str] = []
    out.extend(rows[0])
    for row in rows[1:3]:
        if len(row) == 12:
            out.extend(row[:6] + ["", ""] + row[6:])
        else:
            out.extend(row)
    out.extend(rows[3])
    out.extend([""] + rows[4] + [""])
    out.extend(rows[5])
    mid = rows[6]
    bottom = rows[7]
    out.extend([bottom[0], bottom[1], mid[0], bottom[2], bottom[3], mid[1], bottom[4], bottom[5]])
    return out


def label_for_token(token: str, aliases: dict[str, Any], code_labels: dict[int, dict[str, str]]) -> Any:
    if token == "" or token == "_":
        return ""
    if token.startswith("@"):
        alias = token[1:]
        if alias not in aliases:
            return token
        return label_for_expr(alias, aliases[alias], aliases, code_labels)
    return TOKEN_LABELS.get(token, token)


def clean_layout_key(value: dict[str, str]) -> Any:
    cleaned = {k: v for k, v in value.items() if v}
    if set(cleaned) == {"t"}:
        return cleaned["t"]
    return cleaned


def label_for_expr(alias: str, expr: Any, aliases: dict[str, Any], code_labels: dict[int, dict[str, str]]) -> Any:
    alias_label = SPACE_CADET_ALIAS_LABELS.get(
        alias,
        alias.removeprefix("sc-").replace("-", " ").title() if alias.startswith("sc-") else alias,
    )
    if isinstance(expr, str):
        return label_for_token(expr, aliases, code_labels)
    if not isinstance(expr, list) or not expr:
        return alias_label

    op = str(expr[0])
    if op in {"tap-hold-release", "tap-hold-next-release"}:
        if len(expr) < 4:
            return alias_label
        # tap-hold-release delay tap-delay tap hold; tap-hold-next-release delay tap hold
        tap_i, hold_i = (3, 4) if op == "tap-hold-release" else (2, 3)
        tap = label_for_token(str(expr[tap_i]), aliases, code_labels)
        hold = label_for_token(str(expr[hold_i]), aliases, code_labels)
        return clean_layout_key({"t": str(tap), "h": str(hold)})

    if op == "arbitrary-code" and len(expr) >= 2:
        try:
            code = int(str(expr[1]))
        except ValueError:
            return alias_label
        mapped = code_labels.get(code)
        if mapped:
            display = mapped.get("display") or mapped.get("keysym") or alias_label
            keysym = mapped.get("keysym", "")
            if keysym and keysym != display:
                return clean_layout_key({"t": display, "h": keysym})
            return display
        return alias_label

    if op in {"layer-toggle", "layer-switch"} and len(expr) >= 2:
        return str(expr[1]).title()

    return alias_label


def build_keymap_yaml(
    kanata_path: Path,
    xkb_path: Path | None,
    qmk_info_json: Path,
    layer_name: str,
    yaml_path: Path,
) -> dict[str, Any]:
    text = kanata_path.read_text()
    aliases = parse_aliases(text)
    code_labels = parse_kanata_comment_keysyms(text)
    code_labels.update(parse_xkb_keysyms(xkb_path))

    src_rows = rows_from_raw_block(text, "defsrc")
    layer_rows = rows_from_raw_block(text, "deflayer", layer_name)
    src_keys = expand_kinesis_rows(src_rows)
    layer_keys = expand_kinesis_rows(layer_rows)
    if len(src_keys) != len(layer_keys):
        raise ConversionError(f"defsrc has {len(src_keys)} keys but layer {layer_name!r} has {len(layer_keys)}")

    layers = {layer_name: [label_for_token(k, aliases, code_labels) for k in layer_keys]}

    first_pos: dict[str, int] = {}
    for i, key in enumerate(src_keys):
        first_pos.setdefault(key, i)

    combos = []
    for triggers, output in parse_chords(text):
        try:
            positions = [first_pos[t] for t in triggers]
        except KeyError as exc:
            raise ConversionError(f"combo trigger {exc.args[0]!r} is not present in defsrc") from exc
        combos.append(
            {
                "p": positions,
                "k": label_for_token(output, aliases, code_labels),
                "l": [layer_name],
                "a": "top" if len(positions) == 2 and abs(positions[0] - positions[1]) == 1 else "mid",
                "o": 0.15,
            }
        )

    layout_path = Path(qmk_info_json)
    try:
        layout_ref = str(layout_path.resolve().relative_to(yaml_path.parent.resolve()))
    except ValueError:
        layout_ref = str(layout_path.resolve())

    return {
        "layout": {"qmk_info_json": layout_ref},
        "layers": layers,
        "combos": combos,
        "draw_config": {
            "combo_w": 72,
            "combo_h": 28,
            "arc_radius": 6,
        },
    }


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--kanata", required=True, type=Path, help="Kanata .kbd config to read")
    parser.add_argument("--xkb", type=Path, help="XKB snippet mapping arbitrary-code numbers to keysyms")
    parser.add_argument("--qmk-info-json", required=True, type=Path, help="keymap-drawer/QMK physical layout JSON")
    parser.add_argument("--layer", default="normal", help="Kanata deflayer to render (default: normal)")
    parser.add_argument("--output-yaml", required=True, type=Path, help="Generated keymap-drawer YAML path")
    parser.add_argument("--output-svg", type=Path, help="Generated SVG path; omitted means only YAML is written")
    parser.add_argument("--keymap", default=shutil.which("keymap") or "keymap", help="keymap-drawer executable")
    args = parser.parse_args()

    try:
        data = build_keymap_yaml(args.kanata, args.xkb, args.qmk_info_json, args.layer, args.output_yaml)
        args.output_yaml.parent.mkdir(parents=True, exist_ok=True)
        args.output_yaml.write_text(yaml.safe_dump(data, sort_keys=False, allow_unicode=True))
        if args.output_svg:
            args.output_svg.parent.mkdir(parents=True, exist_ok=True)
            subprocess.run([args.keymap, "draw", str(args.output_yaml), "-o", str(args.output_svg)], check=True)
    except (ConversionError, OSError, subprocess.CalledProcessError) as exc:
        print(f"draw-kanata-keymap.py: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
