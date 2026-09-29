#!/usr/bin/env python3
"""Toggle a floating Kitty cheat sheet generated from the running Hyprland binds.

Rows come from `hyprctl -j binds`, so the help always matches the loaded config;
`bindd` descriptions label them. Alt is Mod1, i.e. physical RAlt on basedbox.
"""
import json
import os
import shutil
import subprocess
import sys

CLASS = "hypr-keybind-help"
MODS = ((64, "Super"), (4, "Ctrl"), (8, "Alt"), (1, "Shift"))
KEYS = {"slash": "/", "COMMA": ",", "RETURN": "Return", "SPACE": "Space", "PRINT": "Print",
        "mouse_down": "Wheel down", "mouse_up": "Wheel up",
        "mouse:272": "Left drag", "mouse:273": "Right drag"}


def hyprctl(*args):
    return subprocess.run(["hyprctl", *args], capture_output=True, text=True, check=True).stdout


def chord(bind):
    names = [name for bit, name in MODS if bind["modmask"] & bit]
    key = bind["key"]
    names.append(KEYS.get(key, key.upper() if len(key) == 1 else key))
    return "+".join(names)


def sections():
    groups = {}
    for bind in json.loads(hyprctl("-j", "binds")):
        action = bind["description"] or f"{bind['dispatcher']} {bind['arg']}".strip()
        row = (chord(bind), action)
        rows = groups.setdefault(bind["submap"], [])
        if row not in rows:  # Caelestia registers some global binds twice.
            rows.append(row)
    for submap, rows in groups.items():
        title = "Global" if not submap else f"Submap {submap} (after its prefix; Escape leaves)"
        yield title, rows


def render():
    width = shutil.get_terminal_size((160, 50)).columns
    lines = ["Hyprland keybindings (Alt = RAlt/Mod1; LAlt stays application Meta)",
             "q closes; / searches", ""]
    for title, rows in sections():
        key_width = max(len(key) for key, _ in rows)
        cells = [f"{key.ljust(key_width)}  {action}" for key, action in rows]
        cell_width = max(len(cell) for cell in cells) + 4
        columns = max(1, width // cell_width)
        height = -(-len(cells) // columns)
        lines += [title, "-" * len(title)]
        for row in range(height):
            lines.append("".join(cell.ljust(cell_width)
                                 for cell in cells[row::height]).rstrip())
        lines.append("")
    return "\n".join(lines)


def main():
    if sys.argv[1:] == ["--show"]:
        subprocess.run(["less", "-S", "-+F", "-+X"], input=render(), text=True)
        return 0
    if sys.argv[1:]:
        print("usage: keybind-help.py [--show]", file=sys.stderr)
        return 2
    # Toggle: close only this helper's own window if it is already open.
    if any(client["class"] == CLASS for client in json.loads(hyprctl("-j", "clients"))):
        hyprctl("dispatch", "closewindow", f"class:^{CLASS}$")
        return 0
    # No close confirmation: the pager is disposable, so the toggle closes at once.
    os.execvp("kitty", ["kitty", "--class", CLASS, "--title", "Keybindings",
                        "-o", "confirm_os_window_close=0",
                        sys.executable, os.path.abspath(__file__), "--show"])


if __name__ == "__main__":
    sys.exit(main())
