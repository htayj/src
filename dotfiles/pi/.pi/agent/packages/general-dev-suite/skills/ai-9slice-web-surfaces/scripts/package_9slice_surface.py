#!/usr/bin/env python3
"""Package a source image as inspectable CSS/HTML 9-slice web-surface artifacts.

The standard path uses only Python's standard library. Optional --export-tiles
imports Pillow lazily, so --help, --dry-run, and --demo work without third-party
packages.
"""

from __future__ import annotations

import argparse
import html
import json
import os
import re
import shutil
from pathlib import Path
from typing import Any, Iterable, Sequence


DEFAULT_INSETS = (24, 24, 24, 24)
DEFAULT_SIZES = ((160, 48), (240, 64), (320, 96))

DEMO_THEMES: dict[str, dict[str, Any]] = {
    "neutral": {
        "title": "Neutral warm bevel plate",
        "styleFamily": "neutral",
        "materials": ["warm bevel", "smoky center", "soft rim light"],
        "textColor": "#fff5d6",
        "textShadow": "0 1px 1px rgb(0 0 0 / 0.55)",
        "pageBg": "#18120f",
        "pageColor": "#f7efe1",
        "checkerColor": "#2a2422",
        "checkerBorder": "#3c302b",
        "focusOutline": "CanvasText",
        "fallbackLayers": [
            "linear-gradient(180deg, rgb(70 48 35 / 0.92), rgb(30 20 18 / 0.96)) padding-box",
            "radial-gradient(circle at 50% 15%, rgb(255 229 160 / 0.22), transparent 58%) padding-box",
        ],
        "svg": {
            "edgeTop": "#ffd98a",
            "edgeMid": "#9f6426",
            "edgeBottom": "#3c2315",
            "centerTop": "#6f4a31",
            "centerBottom": "#2d1c17",
            "highlight": "#fff1b8",
            "shadow": "#120906",
            "accent": "#00d4ff",
            "accent2": "#d28b38",
            "rx": 24,
        },
    },
    "high-fantasy": {
        "title": "High-fantasy carved stone and gilt plate",
        "styleFamily": "high-fantasy",
        "materials": ["carved stone", "aged wood", "hammered gold", "invented rune-like geometry", "warm torch glow"],
        "textColor": "#ffe9a6",
        "textShadow": "0 2px 1px rgb(28 15 5 / 0.75)",
        "pageBg": "#1f160d",
        "pageColor": "#ffefc7",
        "checkerColor": "#33271a",
        "checkerBorder": "#5a4426",
        "focusOutline": "#ffe08a",
        "fallbackLayers": [
            "linear-gradient(180deg, rgb(96 64 30 / 0.92), rgb(45 29 18 / 0.96)) padding-box",
            "radial-gradient(circle at 50% 18%, rgb(255 211 102 / 0.24), transparent 58%) padding-box",
            "linear-gradient(90deg, rgb(33 24 16 / 0.36), transparent 22%, transparent 78%, rgb(33 24 16 / 0.36)) padding-box",
        ],
        "svg": {
            "edgeTop": "#f7cf73",
            "edgeMid": "#9a6b2e",
            "edgeBottom": "#3d2b1c",
            "centerTop": "#6d5030",
            "centerBottom": "#2f2519",
            "highlight": "#fff0a8",
            "shadow": "#160e08",
            "accent": "#ffb84f",
            "accent2": "#5f7684",
            "rx": 22,
        },
    },
    "dark-gothic": {
        "title": "Dark-gothic iron, bone, and ember plate",
        "styleFamily": "dark-gothic",
        "materials": ["blackened iron", "bone-colored trim", "cracked leather", "ember fissures", "smoky center"],
        "textColor": "#ffd8b0",
        "textShadow": "0 2px 2px rgb(0 0 0 / 0.85)",
        "pageBg": "#100c0d",
        "pageColor": "#f1d6c0",
        "checkerColor": "#221719",
        "checkerBorder": "#42272a",
        "focusOutline": "#ff7a3d",
        "fallbackLayers": [
            "linear-gradient(180deg, rgb(36 28 29 / 0.95), rgb(11 8 9 / 0.98)) padding-box",
            "radial-gradient(circle at 48% 85%, rgb(195 55 22 / 0.24), transparent 52%) padding-box",
            "linear-gradient(90deg, rgb(92 18 13 / 0.22), transparent 24%, transparent 76%, rgb(92 18 13 / 0.22)) padding-box",
        ],
        "svg": {
            "edgeTop": "#d5c3a6",
            "edgeMid": "#4c4240",
            "edgeBottom": "#141010",
            "centerTop": "#2f2425",
            "centerBottom": "#0e0b0c",
            "highlight": "#f2c28c",
            "shadow": "#050303",
            "accent": "#ff5b2e",
            "accent2": "#cbb89b",
            "rx": 14,
        },
    },
    "sci-fi": {
        "title": "Sci-fi segmented metal and energy plate",
        "styleFamily": "sci-fi",
        "materials": ["brushed gunmetal", "segmented plating", "smoky glass", "cool energy seams", "small bolt caps"],
        "textColor": "#d8fbff",
        "textShadow": "0 0 7px rgb(0 208 255 / 0.55), 0 1px 1px rgb(0 0 0 / 0.8)",
        "pageBg": "#071017",
        "pageColor": "#d9f9ff",
        "checkerColor": "#102331",
        "checkerBorder": "#1a4d63",
        "focusOutline": "#50eaff",
        "fallbackLayers": [
            "linear-gradient(180deg, rgb(23 42 51 / 0.94), rgb(5 12 19 / 0.98)) padding-box",
            "radial-gradient(circle at 50% 20%, rgb(45 221 255 / 0.22), transparent 55%) padding-box",
            "linear-gradient(90deg, rgb(0 170 210 / 0.18), transparent 28%, transparent 72%, rgb(0 170 210 / 0.18)) padding-box",
        ],
        "svg": {
            "edgeTop": "#a6c7d5",
            "edgeMid": "#315261",
            "edgeBottom": "#101923",
            "centerTop": "#183140",
            "centerBottom": "#071018",
            "highlight": "#9df7ff",
            "shadow": "#020609",
            "accent": "#1ee6ff",
            "accent2": "#7ea0ad",
            "rx": 10,
        },
    },
}


class CliError(ValueError):
    """User-facing CLI validation error."""


class SurfaceHelpFormatter(argparse.ArgumentDefaultsHelpFormatter):
    """Show defaults except for paired --fill/--no-fill toggles."""

    def _get_help_string(self, action: argparse.Action) -> str:
        if action.dest == "fill":
            return action.help or ""
        return super()._get_help_string(action)


def parse_box(values: Sequence[str], label: str) -> tuple[int, int, int, int]:
    if len(values) != 4:
        raise argparse.ArgumentTypeError(f"{label} needs four integers: TOP RIGHT BOTTOM LEFT")
    try:
        parsed = tuple(int(v) for v in values)
    except ValueError as exc:
        raise argparse.ArgumentTypeError(f"{label} values must be integers") from exc
    if any(v < 0 for v in parsed):
        raise argparse.ArgumentTypeError(f"{label} values must be non-negative")
    return parsed  # type: ignore[return-value]


def parse_sizes(raw: str) -> list[tuple[int, int]]:
    sizes: list[tuple[int, int]] = []
    for part in raw.split(","):
        part = part.strip().lower()
        if not part:
            continue
        match = re.fullmatch(r"(\d+)x(\d+)", part)
        if not match:
            raise argparse.ArgumentTypeError(
                f"invalid size {part!r}; expected comma-separated WIDTHxHEIGHT values"
            )
        width, height = (int(match.group(1)), int(match.group(2)))
        if width <= 0 or height <= 0:
            raise argparse.ArgumentTypeError("sizes must be positive")
        sizes.append((width, height))
    if not sizes:
        raise argparse.ArgumentTypeError("at least one size is required")
    return sizes


def sanitize_name(raw: str) -> str:
    value = re.sub(r"[^A-Za-z0-9_-]+", "-", raw.strip()).strip("-")
    return value or "surface"


def sanitize_class(raw: str | None, name: str) -> str:
    value = raw if raw else f"{name}-surface"
    value = value.strip().lstrip(".")
    value = re.sub(r"[^A-Za-z0-9_-]+", "-", value).strip("-")
    if not value:
        value = "surface"
    if not re.match(r"^[A-Za-z_-]", value):
        value = f"surface-{value}"
    return value


def css_url(path: str) -> str:
    escaped = path.replace("\\", "/").replace('"', r"\"")
    return f'url("{escaped}")'


def rel_url(target: Path, base_dir: Path) -> str:
    return Path(os.path.relpath(target, base_dir)).as_posix()


def theme(theme_key: str) -> dict[str, Any]:
    return DEMO_THEMES[theme_key]


def ensure_source(args: argparse.Namespace, out_dir: Path, name: str) -> tuple[Path, bool]:
    """Return source path and whether it is managed inside out_dir."""
    if args.demo:
        return out_dir / f"{name}.source.svg", True
    if not args.input:
        raise CliError("provide --input SOURCE or use --demo")
    source = Path(args.input).expanduser()
    if not source.exists():
        raise CliError(f"input does not exist: {source}")
    if not source.is_file():
        raise CliError(f"input is not a file: {source}")
    if args.copy_source:
        suffix = source.suffix or ".img"
        return out_dir / f"{name}.source{suffix}", True
    return source.resolve(), False


def theme_motif_svg(theme_key: str, svg: dict[str, str], insets: tuple[int, int, int, int]) -> str:
    top, right, bottom, left = insets
    w, h = 240, 96
    inner_w = max(1, w - left - right)
    inner_h = max(1, h - top - bottom)
    accent = svg["accent"]
    accent2 = svg["accent2"]
    highlight = svg["highlight"]
    shadow = svg["shadow"]
    if theme_key == "high-fantasy":
        diamonds = "\n".join(
            f'  <path d="M{x} 13 l6 6 -6 6 -6 -6 Z" fill="{accent}" opacity="0.72"/>'
            f'\n  <path d="M{x} 83 l6 -6 -6 -6 -6 6 Z" fill="{accent}" opacity="0.42"/>'
            for x in (72, 120, 168)
        )
        return f'''  <rect x="12" y="12" width="216" height="72" rx="18" fill="none" stroke="{accent2}" stroke-width="2" opacity="0.55"/>
  <circle cx="30" cy="26" r="7" fill="{accent}" opacity="0.76"/>
  <circle cx="210" cy="26" r="7" fill="{accent}" opacity="0.76"/>
  <circle cx="30" cy="70" r="7" fill="{accent2}" opacity="0.62"/>
  <circle cx="210" cy="70" r="7" fill="{accent2}" opacity="0.62"/>
{diamonds}
  <path d="M48 28 h12 v10 h-7 v8 h13" stroke="{highlight}" stroke-width="2" fill="none" opacity="0.42"/>
  <path d="M192 28 h-12 v10 h7 v8 h-13" stroke="{highlight}" stroke-width="2" fill="none" opacity="0.42"/>
  <path d="M58 73 C87 65, 107 79, 132 70 S180 69, 202 60" stroke="{shadow}" stroke-width="2" fill="none" opacity="0.22"/>'''
    if theme_key == "dark-gothic":
        spikes = "\n".join(
            f'  <path d="M{x} 10 l8 15 h-16 Z" fill="{shadow}" opacity="0.62"/>'
            f'\n  <path d="M{x} 86 l8 -15 h-16 Z" fill="{shadow}" opacity="0.70"/>'
            for x in (60, 96, 144, 180)
        )
        return f'''  <rect x="14" y="14" width="212" height="68" rx="10" fill="none" stroke="{accent2}" stroke-width="2.5" opacity="0.52"/>
{spikes}
  <path d="M{left + 8} {top + inner_h - 4} C70 55, 82 78, 111 59 S161 76, {w - right - 10} {top + inner_h - 8}" stroke="{accent}" stroke-width="2.2" fill="none" opacity="0.72"/>
  <path d="M46 31 l16 8 -13 7 18 8" stroke="{accent}" stroke-width="2" fill="none" opacity="0.54"/>
  <path d="M194 31 l-16 8 13 7 -18 8" stroke="{accent}" stroke-width="2" fill="none" opacity="0.54"/>
  <circle cx="30" cy="48" r="9" fill="{accent2}" opacity="0.70"/>
  <circle cx="210" cy="48" r="9" fill="{accent2}" opacity="0.70"/>'''
    if theme_key == "sci-fi":
        plates = "\n".join(
            f'  <rect x="{x}" y="12" width="26" height="10" rx="2" fill="{accent2}" opacity="0.54"/>'
            f'\n  <rect x="{x}" y="74" width="26" height="10" rx="2" fill="{accent2}" opacity="0.38"/>'
            for x in (50, 84, 118, 152)
        )
        bolts = "\n".join(
            f'  <circle cx="{x}" cy="{y}" r="4" fill="{highlight}" opacity="0.68"/>'
            for x in (26, 214)
            for y in (24, 72)
        )
        return f'''  <path d="M18 26 L40 12 H200 L222 26 V70 L200 84 H40 L18 70 Z" fill="none" stroke="{accent}" stroke-width="2.2" opacity="0.58"/>
{plates}
{bolts}
  <path d="M{left + 5} {top + 2} H{w - right - 5}" stroke="{accent}" stroke-width="2" opacity="0.70"/>
  <path d="M{left + 5} {h - bottom - 2} H{w - right - 5}" stroke="{accent}" stroke-width="2" opacity="0.34"/>
  <path d="M48 48 H85 M155 48 H192" stroke="{highlight}" stroke-width="2" opacity="0.55"/>
  <rect x="{left}" y="{top}" width="{inner_w}" height="{inner_h}" rx="6" fill="none" stroke="{accent}" stroke-width="1.5" opacity="0.30"/>'''
    return f'''  <path d="M28 14 H212" stroke="{highlight}" stroke-width="4" stroke-linecap="round" opacity="0.55"/>
  <path d="M30 82 H210" stroke="{shadow}" stroke-width="4" stroke-linecap="round" opacity="0.45"/>'''


def demo_svg(name: str, insets: tuple[int, int, int, int], theme_key: str) -> str:
    top, right, bottom, left = insets
    selected = theme(theme_key)
    svg = selected["svg"]
    rx = int(svg["rx"])
    motif = theme_motif_svg(theme_key, svg, insets)
    title = html.escape(str(selected["title"]))
    safe_name = html.escape(name)
    # A deterministic vector plate with visible corner/edge/interior zones.
    return f'''<svg xmlns="http://www.w3.org/2000/svg" width="240" height="96" viewBox="0 0 240 96" role="img" aria-label="{safe_name} {title} demo 9-slice source" data-demo-theme="{html.escape(theme_key)}">
  <defs>
    <linearGradient id="edge" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="{svg["edgeTop"]}"/>
      <stop offset="0.48" stop-color="{svg["edgeMid"]}"/>
      <stop offset="1" stop-color="{svg["edgeBottom"]}"/>
    </linearGradient>
    <linearGradient id="center" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="{svg["centerTop"]}"/>
      <stop offset="1" stop-color="{svg["centerBottom"]}"/>
    </linearGradient>
    <filter id="shadow" x="-10%" y="-20%" width="120%" height="140%">
      <feDropShadow dx="0" dy="4" stdDeviation="3" flood-color="{svg["shadow"]}" flood-opacity="0.48"/>
    </filter>
  </defs>
  <rect x="6" y="6" width="228" height="84" rx="{rx}" fill="url(#edge)" filter="url(#shadow)"/>
  <rect x="{left}" y="{top}" width="{max(1, 240 - left - right)}" height="{max(1, 96 - top - bottom)}" rx="{max(4, min(rx - 4, 12))}" fill="url(#center)" opacity="0.95"/>
{motif}
  <rect x="0.5" y="0.5" width="239" height="95" fill="none" stroke="{svg["accent"]}" stroke-dasharray="4 4" opacity="0.25"/>
  <path d="M{left} 0 V96 M{240 - right} 0 V96 M0 {top} H240 M0 {96 - bottom} H240" stroke="{svg["accent"]}" stroke-width="1.5" stroke-dasharray="3 3" opacity="0.58"/>
</svg>
'''


def fallback_background_css(selected: dict[str, Any]) -> str:
    return "\n  background:\n    " + ",\n    ".join(selected["fallbackLayers"]) + ";"


def write_css(
    path: Path,
    class_name: str,
    source_ref: str,
    insets: tuple[int, int, int, int],
    border_width: tuple[int, int, int, int],
    repeat: str,
    fill: bool,
    theme_key: str,
) -> None:
    selected = theme(theme_key)
    top, right, bottom, left = insets
    bw_top, bw_right, bw_bottom, bw_left = border_width
    fill_token = " fill" if fill else ""
    image_value = (
        f"{css_url(source_ref)} {top} {right} {bottom} {left}{fill_token} / "
        f"{bw_top}px {bw_right}px {bw_bottom}px {bw_left}px / 0 {repeat}"
    )
    no_fill_value = (
        f"{css_url(source_ref)} {top} {right} {bottom} {left} / "
        f"{bw_top}px {bw_right}px {bw_bottom}px {bw_left}px / 0 {repeat}"
    )
    fallback_background = fallback_background_css(selected)
    base_background = fallback_background if not fill else ""
    content = f"""/* Generated 9-slice surface CSS. Source: {source_ref}; demo theme: {theme_key} */
.{class_name} {{
  --surface-border-image: {css_url(source_ref)};
  --surface-slice: {top} {right} {bottom} {left};
  --surface-border-width: {bw_top}px {bw_right}px {bw_bottom}px {bw_left}px;
  box-sizing: border-box;
  border-style: solid;
  border-width: var(--surface-border-width);
  border-image: {image_value};
  min-inline-size: 10rem;
  min-block-size: 3rem;
  display: inline-grid;
  place-items: center;
  padding: 0.35rem 0.75rem;
  color: {selected["textColor"]};
  font: 600 16px/1.2 system-ui, -apple-system, Segoe UI, sans-serif;
  text-shadow: {selected["textShadow"]};{base_background}
}}

.{class_name}[data-fill="off"] {{
  border-image: {no_fill_value};{fallback_background}
}}

.{class_name}:hover {{ filter: brightness(1.08) saturate(1.05); }}
.{class_name}:active {{ transform: translateY(1px); filter: brightness(0.92); }}
.{class_name}:focus-visible {{ outline: 3px solid {selected["focusOutline"]}; outline-offset: 3px; }}
.{class_name}[aria-disabled="true"],
.{class_name}:disabled {{ filter: grayscale(0.65) opacity(0.68); }}
"""
    path.write_text(content, encoding="utf-8")


def style_for_size(width: int, height: int) -> str:
    return f"inline-size: {width}px; block-size: {height}px;"


def write_html(
    path: Path,
    css_file: str,
    class_name: str,
    name: str,
    sizes: Iterable[tuple[int, int]],
    theme_key: str,
) -> None:
    selected = theme(theme_key)
    cards = []
    for width, height in sizes:
        label = f"{width}×{height}"
        cards.append(
            f'''      <button class="{html.escape(class_name)}" style="{style_for_size(width, height)}">{html.escape(label)}</button>
      <button class="{html.escape(class_name)}" data-fill="off" style="{style_for_size(width, height)}">no-fill {html.escape(label)}</button>'''
        )
    body = "\n".join(cards)
    materials = ", ".join(selected["materials"])
    content = f"""<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>{html.escape(name)} 9-slice surface demo</title>
  <link rel="stylesheet" href="{html.escape(css_file)}" />
  <style>
    body {{
      margin: 2rem;
      color: {selected["pageColor"]};
      background: {selected["pageBg"]};
      font-family: system-ui, -apple-system, Segoe UI, sans-serif;
    }}
    .grid {{ display: grid; gap: 1rem; align-items: start; justify-items: start; }}
    .checker {{
      padding: 1rem;
      background-image:
        linear-gradient(45deg, {selected["checkerColor"]} 25%, transparent 25%),
        linear-gradient(-45deg, {selected["checkerColor"]} 25%, transparent 25%),
        linear-gradient(45deg, transparent 75%, {selected["checkerColor"]} 75%),
        linear-gradient(-45deg, transparent 75%, {selected["checkerColor"]} 75%);
      background-size: 24px 24px;
      background-position: 0 0, 0 12px, 12px -12px, -12px 0;
      border: 1px solid {selected["checkerBorder"]};
    }}
    code {{ color: {selected["textColor"]}; }}
  </style>
</head>
<body>
  <h1>{html.escape(name)} 9-slice surface demo</h1>
  <p>Theme: <code>{html.escape(theme_key)}</code> — {html.escape(str(selected["title"]))}.</p>
  <p>Material cues: {html.escape(materials)}. Inspect corners, seams, repeat/stretch behavior, center readability, and focus/hover/active states.</p>
  <div class="checker">
    <div class="grid">
{body}
    </div>
  </div>
</body>
</html>
"""
    path.write_text(content, encoding="utf-8")


def write_manifest(
    path: Path,
    name: str,
    class_name: str,
    source_ref: str,
    insets: tuple[int, int, int, int],
    border_width: tuple[int, int, int, int],
    repeat: str,
    fill: bool,
    sizes: Sequence[tuple[int, int]],
    outputs: dict[str, str],
    theme_key: str,
) -> None:
    selected = theme(theme_key)
    manifest = {
        "name": name,
        "cssClass": class_name,
        "source": source_ref,
        "demoTheme": theme_key,
        "styleFamily": selected["styleFamily"],
        "materials": selected["materials"],
        "ipSafety": {
            "mode": "generic-inspired-material-language",
            "forbiddenInGeneratedAssets": [
                "logos",
                "faction emblems",
                "named characters",
                "exact UI screenshots",
                "trademarks",
                "readable text or letters",
            ],
        },
        "insets": dict(zip(("top", "right", "bottom", "left"), insets)),
        "borderWidthPx": dict(zip(("top", "right", "bottom", "left"), border_width)),
        "repeat": repeat,
        "fill": fill,
        "sizes": [{"width": width, "height": height} for width, height in sizes],
        "outputs": outputs,
        "validation": [
            "Open the HTML artifact and test narrow, normal, wide, short, and tall sizes.",
            "Check corner preservation, edge seams, center readability, and state consistency.",
            "Confirm the style family reads through generic materials, not protected logos or copied layouts.",
            "Screenshot the demo and use an image model to critique seams, contrast, theme fit, and IP safety if needed.",
        ],
    }
    path.write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")


def export_tiles(
    source: Path,
    out_dir: Path,
    name: str,
    insets: tuple[int, int, int, int],
) -> list[Path]:
    try:
        from PIL import Image  # type: ignore
    except ImportError as exc:  # pragma: no cover - optional dependency path
        raise CliError("--export-tiles requires Pillow (`python3 -m pip install Pillow`)") from exc

    top, right, bottom, left = insets
    try:
        image = Image.open(source)
    except OSError as exc:
        raise CliError(f"cannot export tiles from unsupported image file: {source}") from exc
    width, height = image.size
    if left + right >= width or top + bottom >= height:
        raise CliError(
            f"insets {insets} leave no center for image size {width}x{height}"
        )
    boxes = {
        "top-left": (0, 0, left, top),
        "top": (left, 0, width - right, top),
        "top-right": (width - right, 0, width, top),
        "left": (0, top, left, height - bottom),
        "center": (left, top, width - right, height - bottom),
        "right": (width - right, top, width, height - bottom),
        "bottom-left": (0, height - bottom, left, height),
        "bottom": (left, height - bottom, width - right, height),
        "bottom-right": (width - right, height - bottom, width, height),
    }
    tile_dir = out_dir / f"{name}-tiles"
    tile_dir.mkdir(parents=True, exist_ok=True)
    outputs: list[Path] = []
    for tile_name, box in boxes.items():
        target = tile_dir / f"{name}-{tile_name}.png"
        image.crop(box).save(target)
        outputs.append(target)
    return outputs


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description="Generate CSS/HTML/manifest artifacts for a 9-slice web button or surface.",
        formatter_class=SurfaceHelpFormatter,
    )
    source = parser.add_mutually_exclusive_group()
    source.add_argument("--input", help="source image path (PNG, WebP, SVG, etc.)")
    source.add_argument("--demo", action="store_true", help="create and package a synthetic SVG source")
    parser.add_argument(
        "--demo-theme",
        choices=tuple(DEMO_THEMES.keys()),
        default="neutral",
        help="deterministic demo style family; non-neutral themes require --demo",
    )
    parser.add_argument("--out-dir", default="./9slice-surface", help="output directory")
    parser.add_argument("--name", help="artifact base name; defaults from input or demo-plate")
    parser.add_argument(
        "--insets",
        nargs=4,
        metavar=("TOP", "RIGHT", "BOTTOM", "LEFT"),
        default=tuple(str(v) for v in DEFAULT_INSETS),
        help="source slice insets in pixels/coordinates",
    )
    parser.add_argument(
        "--class",
        dest="css_class",
        help="CSS class name to generate; defaults to <name>-surface",
    )
    parser.add_argument(
        "--border-width",
        nargs=4,
        metavar=("TOP", "RIGHT", "BOTTOM", "LEFT"),
        help="rendered CSS border widths in px; defaults to --insets",
    )
    parser.add_argument(
        "--repeat",
        choices=("stretch", "repeat", "round", "space"),
        default="stretch",
        help="CSS border-image repeat mode",
    )
    fill_group = parser.add_mutually_exclusive_group()
    fill_group.add_argument("--fill", dest="fill", action="store_true", default=True, help="include border-image fill")
    fill_group.add_argument("--no-fill", dest="fill", action="store_false", help="omit border-image fill and use layered background fallback")
    parser.add_argument(
        "--sizes",
        default=",".join(f"{w}x{h}" for w, h in DEFAULT_SIZES),
        help="comma-separated rendered demo sizes",
    )
    parser.add_argument("--copy-source", action="store_true", help="copy --input into the output directory")
    parser.add_argument("--export-tiles", action="store_true", help="optionally crop nine PNG tiles; requires Pillow")
    parser.add_argument("--dry-run", action="store_true", help="print planned outputs without writing files")
    return parser


def plan_outputs(out_dir: Path, name: str, source_path: Path) -> dict[str, Path]:
    return {
        "source": source_path,
        "css": out_dir / f"{name}.css",
        "html": out_dir / f"{name}.html",
        "manifest": out_dir / f"{name}.manifest.json",
    }


def run(argv: Sequence[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    try:
        insets = parse_box(args.insets, "--insets")
        border_width = parse_box(args.border_width, "--border-width") if args.border_width else insets
        sizes = parse_sizes(args.sizes)
        if args.demo_theme != "neutral" and not args.demo:
            raise CliError("non-neutral --demo-theme values require --demo")
        if args.export_tiles and args.demo and not args.dry_run:
            raise CliError("--export-tiles is not supported with the SVG --demo source; use a raster --input image")
        default_name = "demo-plate" if args.demo else Path(args.input or "surface").stem
        name = sanitize_name(args.name or default_name)
        class_name = sanitize_class(args.css_class, name)
        out_dir = Path(args.out_dir).expanduser().resolve()
        source_path, managed_source = ensure_source(args, out_dir, name)
        outputs = plan_outputs(out_dir, name, source_path)

        if args.dry_run:
            print("DRY RUN: would generate 9-slice web surface artifacts")
            print(f"name: {name}")
            print(f"class: .{class_name}")
            print(f"demo theme: {args.demo_theme}")
            print(f"insets: {insets}")
            print(f"border width: {border_width}")
            print(f"repeat: {args.repeat}; fill: {args.fill}")
            for key, value in outputs.items():
                print(f"{key}: {value}")
            if args.export_tiles:
                print(f"tiles: {out_dir / f'{name}-tiles'} (requires Pillow when not dry-running)")
            return 0

        out_dir.mkdir(parents=True, exist_ok=True)
        if args.demo:
            source_path.write_text(demo_svg(name, insets, args.demo_theme), encoding="utf-8")
        elif args.copy_source and managed_source:
            shutil.copy2(Path(args.input).expanduser(), source_path)

        source_ref = rel_url(source_path, out_dir)
        css_ref = rel_url(outputs["css"], out_dir)
        write_css(outputs["css"], class_name, source_ref, insets, border_width, args.repeat, args.fill, args.demo_theme)
        write_html(outputs["html"], css_ref, class_name, name, sizes, args.demo_theme)

        tile_paths: list[Path] = []
        if args.export_tiles:
            tile_paths = export_tiles(source_path, out_dir, name, insets)

        manifest_outputs = {key: rel_url(value, out_dir) for key, value in outputs.items()}
        if tile_paths:
            manifest_outputs["tiles"] = rel_url(tile_paths[0].parent, out_dir)
        write_manifest(
            outputs["manifest"],
            name,
            class_name,
            source_ref,
            insets,
            border_width,
            args.repeat,
            args.fill,
            sizes,
            manifest_outputs,
            args.demo_theme,
        )

        print("Generated 9-slice web surface artifacts:")
        for key, value in outputs.items():
            print(f"{key}: {value}")
        if tile_paths:
            print(f"tiles: {tile_paths[0].parent}")
        return 0
    except (CliError, argparse.ArgumentTypeError) as exc:
        parser.error(str(exc))
        return 2


if __name__ == "__main__":
    raise SystemExit(run())
