#!/usr/bin/env python3
"""Translate pinky Super only in focused Tern; preserve other apps' chords."""
import json
import os
from pathlib import Path
import socket
import sys


SHORTCUTS = {
    ("SHIFT", "U"), ("SHIFT", "A"),
    ("NONE", "H"), ("NONE", "L"), ("NONE", "J"), ("NONE", "K"),
    ("NONE", "N"), ("NONE", "P"), ("CTRL", "N"), ("CTRL", "P"),
}


def request(command):
    runtime = Path(os.environ.get("XDG_RUNTIME_DIR", f"/run/user/{os.getuid()}"))
    endpoint = runtime / "hypr" / os.environ["HYPRLAND_INSTANCE_SIGNATURE"] / ".socket.sock"
    with socket.socket(socket.AF_UNIX) as connection:
        connection.settimeout(5)
        connection.connect(str(endpoint))
        connection.sendall(command.encode())
        chunks = []
        while chunk := connection.recv(65536):
            chunks.append(chunk)
    return b"".join(chunks).decode().strip()


def main():
    shortcut = tuple(sys.argv[1:])
    if shortcut not in SHORTCUTS:
        raise ValueError("Expected a configured modifier (NONE/SHIFT/CTRL) and key")
    modifier, key = shortcut
    window = json.loads(request("j/activewindow"))
    if not window.get("address"):
        return
    if window.get("class") == "so.stencil.tern":
        mods = "CTRL ALT" if modifier == "CTRL" else "CTRL ALT SHIFT"
    else:
        # An exec helper cannot safely use pass: its last-event state may have
        # changed. Replay the original chord to this specific non-Tern window.
        mods = "SUPER" + (" " + modifier if modifier != "NONE" else "")
    result = request(f"dispatch sendshortcut {mods}, {key}, address:{window['address']}")
    if result != "ok":
        raise RuntimeError(result)


if __name__ == "__main__":
    try:
        main()
    except (OSError, KeyError, ValueError, RuntimeError) as error:
        print(f"tern-pinky: {error}", file=sys.stderr)
        sys.exit(1)
