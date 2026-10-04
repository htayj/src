#!/usr/bin/env python3
"""Toggle a transient Quickshell cheat sheet from the running Hyprland binds.

`bindd` descriptions take precedence. Alt is Mod1 (physical RAlt on basedbox).
The renderer requests --data; the default invocation toggles only this QML file.
"""
import fcntl
import json
import os
from pathlib import Path
import re
import select
import signal
import subprocess
import sys

HOME = Path.home()
QML = HOME / ".config/hypr/keybind-help.qml"
PROFILES = (HOME / ".guix-profile", HOME / ".guix-home/profile")
MODS = ((64, "Super"), (4, "Ctrl"), (8, "Alt"), (1, "Shift"))
KEYS = {"slash": "/", "COMMA": ",", "RETURN": "Return", "SPACE": "Space", "PRINT": "Print",
        "mouse_down": "Wheel down", "mouse_up": "Wheel up",
        "mouse:272": "Left drag", "mouse:273": "Right drag"}
DIRECTIONS = {"l": "left", "r": "right", "u": "up", "d": "down"}
CATEGORIES = ("Applications & shell", "Windows & focus", "Workspaces",
              "Window layouts", "Window groups", "Audio & media", "Session & system", "Other")


def hyprctl(*args):
    return subprocess.run(["hyprctl", *args], capture_output=True, text=True, check=True).stdout


def chord(bind):
    names = [name for bit, name in MODS if bind["modmask"] & bit]
    key = bind["key"]
    if not key and bind.get("keycode"):
        key = f"code:{bind['keycode']}"
    names.append(KEYS.get(key, key.upper() if len(key) == 1 else key))
    return "+".join(names)


def action_label(bind):
    if bind["description"]:
        return bind["description"]
    dispatcher, arg = bind["dispatcher"], bind["arg"]
    labels = {"killactive": "Close focused window", "togglefloating": "Toggle floating",
              "pseudo": "Toggle pseudo-tiling", "exit": "Exit Hyprland",
              "togglegroup": "Toggle window group", "moveoutofgroup": "Remove window from group",
              "togglesplit": "Toggle split direction",
              "resizewindow": "Resize window", "fullscreen": "Toggle fullscreen"}
    if dispatcher in labels:
        return labels[dispatcher] + (f" ({arg})" if arg else "")
    if dispatcher == "mouse":
        return {"movewindow": "Move window", "resizewindow": "Resize window"}.get(arg, f"Mouse: {arg}")
    if dispatcher in ("movefocus", "movewindow", "moveintogroup") and arg in DIRECTIONS:
        verb = {"movefocus": "Focus", "movewindow": "Move", "moveintogroup": "Move into group"}[dispatcher]
        return f"{verb} {DIRECTIONS[arg]}"
    if dispatcher == "movewindow":
        return f"Move window {arg}".strip()
    if dispatcher == "changegroupactive":
        return {"f": "Next window in group", "b": "Previous window in group"}.get(arg, f"Select group window {arg}")
    if dispatcher == "workspace":
        return {"e+1": "Next existing workspace", "e-1": "Previous existing workspace"}.get(arg, f"Switch to workspace {arg}")
    if dispatcher in ("movetoworkspace", "movetoworkspacesilent"):
        suffix = " (without following)" if dispatcher.endswith("silent") else ""
        return f"Move window to workspace {arg}{suffix}"
    if dispatcher == "togglespecialworkspace":
        return f"Toggle scratchpad {arg}".strip()
    if dispatcher == "submap":
        return "Leave prefix menu" if arg == "reset" else f"Open {arg} prefix menu"
    if dispatcher == "global":
        if arg == "caelestia:refreshDevices":
            return "Refresh keyboard lock indicators"
        return f"Shell shortcut: {arg}"
    if dispatcher == "exec":
        apps = {"kitty": "Terminal", "thunar": "File manager", "emacs": "Emacs"}
        if arg in apps:
            return apps[arg]
        if arg.startswith("wpctl set-volume @DEFAULT_AUDIO_SINK@ ") and arg.endswith(("+", "-")):
            return "Volume up" if arg.endswith("+") else "Volume down"
        if arg == "wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle":
            return "Toggle speaker mute"
        if arg == "wpctl set-mute @DEFAULT_AUDIO_SOURCE@ toggle":
            return "Toggle microphone mute"
        return f"Run: {arg}"
    # Preserve unknown dispatchers and their arguments rather than hide live binds.
    name = re.sub(r"(?<=[a-z])(?=[A-Z])", " ", dispatcher).replace("_", " ")
    return f"{name.capitalize()}: {arg}" if arg else name.capitalize()


def category(bind, action):
    dispatcher, arg = bind["dispatcher"], bind["arg"]
    if dispatcher in ("workspace", "movetoworkspace", "movetoworkspacesilent", "togglespecialworkspace"):
        return "Workspaces"
    if "group" in dispatcher:
        return "Window groups"
    if action.startswith(("Focus ", "Move ", "Close focused", "Toggle floating", "Toggle pseudo")) or dispatcher in ("mouse", "movefocus", "movewindow", "resizewindow", "fullscreen"):
        return "Windows & focus"
    if "layout-controls.py" in arg or dispatcher in ("togglesplit", "layoutmsg"):
        return "Window layouts"
    if bind["key"].startswith("XF86") or arg.startswith("wpctl "):
        return "Audio & media"
    if dispatcher in ("exit", "global", "submap") or action == "Lock screen":
        return "Session & system"
    if dispatcher == "exec":
        return "Applications & shell"
    return "Other"


def compact(rows):
    """Collapse only complete, exact live families, leaving partial/custom ones intact."""
    replacements = {}
    consumed = set()
    families = {}
    for index, (bind, key, action) in enumerate(rows):
        # Numeric keys must map exactly to 1..10; arbitrary/named workspaces stay separate.
        if not bind["description"] and bind["dispatcher"] in ("workspace", "movetoworkspace", "movetoworkspacesilent") and bind["key"] in "1234567890" and bind["key"]:
            target = "10" if bind["key"] == "0" else bind["key"]
            if bind["arg"] == target:
                family = (bind["modmask"], bind["dispatcher"])
                families.setdefault(family, {})[bind["key"]] = index
    for (mask, dispatcher), members in families.items():
        if set(members) != set("1234567890"):
            continue
        indexes = set(members.values())
        first = min(indexes)
        prefix = chord({"modmask": mask, "key": "1–9 / 0"})
        label = "Switch to workspace 1–10" if dispatcher == "workspace" else "Move window to workspace 1–10"
        if dispatcher.endswith("silent"):
            label += " (without following)"
        replacements[first] = (prefix, label + " (0 = 10)")
        consumed.update(indexes - {first})
    for verb in ("Focus", "Move", "Move into group"):
        families = {}
        expected = {"H": "left", "J": "down", "K": "up", "L": "right"}
        for index, (bind, key, action) in enumerate(rows):
            letter = bind["key"].upper()
            if letter in expected and action == f"{verb} {expected[letter]}":
                families.setdefault(bind["modmask"], {})[letter] = index
        for mask, members in families.items():
            if set(members) != set(expected):
                continue
            indexes = set(members.values())
            first = min(indexes)
            replacements[first] = (chord({"modmask": mask, "key": "H/J/K/L"}),
                                   f"{verb} left/down/up/right")
            consumed.update(indexes - {first})
    return [{"keys": replacements.get(index, (key, action))[0],
             "description": replacements.get(index, (key, action))[1]}
            for index, (_, key, action) in enumerate(rows) if index not in consumed]


def sections():
    groups = {}
    seen = set()
    for bind in json.loads(hyprctl("-j", "binds")):
        action, key = action_label(bind), chord(bind)
        submap = bind["submap"]
        identity = (submap, key, action)
        if identity in seen:  # Caelestia can register global binds more than once.
            continue
        seen.add(identity)
        title = f"Submap {submap} (release prefix; Escape leaves)" if submap else category(bind, action)
        groups.setdefault(title, []).append((bind, key, action))
    order = [title for title in CATEGORIES if title in groups]
    order += [title for title in groups if title not in CATEGORIES]
    return [{"title": title, "rows": compact(groups[title])} for title in order]


def data():
    monitors = json.loads(hyprctl("-j", "monitors"))
    focused = next((monitor for monitor in monitors if monitor.get("focused")), None)
    if focused is None:
        raise RuntimeError("Hyprland has no focused monitor")
    return {"screen": focused["name"], "sections": sections()}


def runtime():
    """Resolve the pinned Quickshell dependency of the installed Caelestia wrapper."""
    wrapper = next((profile / "bin/caelestia-shell" for profile in PROFILES
                    if (profile / "bin/caelestia-shell").is_file()), None)
    if wrapper is None:
        raise RuntimeError("caelestia-shell is missing from the Guix profiles")
    references = re.findall(r'/gnu/store/[^\s"\':$}]+', wrapper.read_text())
    candidates = {Path(path) / "qs" for path in references
                  if Path(path).name == "bin" and "-quickshell-for-caelestia-" in Path(path).parent.name}
    candidates = [path for path in candidates if path.is_file() and os.access(path, os.X_OK)]
    if len(candidates) != 1:
        raise RuntimeError(f"expected one Quickshell dependency in {wrapper}, found {len(candidates)}")
    env = os.environ.copy()
    env["QT_QPA_PLATFORMTHEME"] = "qt6ct"
    env.pop("QML2_IMPORT_PATH", None)
    env.pop("QML_IMPORT_PATH", None)
    fonts = [path for path in references if Path(path).name == "share" and "-font-" in Path(path).parent.name]
    for key, paths in (("PATH", [str(profile / "bin") for profile in PROFILES]),
                       ("XDG_DATA_DIRS", fonts + [str(profile / "share") for profile in PROFILES])):
        paths.extend(env.get(key, "").split(":"))
        env[key] = ":".join(dict.fromkeys(path for path in paths if path))
    return str(candidates[0]), env


def toggle(dismiss_pid=None):
    qs, env = runtime()
    runtime_dir = Path(env.get("XDG_RUNTIME_DIR", f"/run/user/{os.getuid()}"))
    # Serialize toggles without a stale PID file; qs scopes listing to this config
    # and this Wayland display. Never address another config or Caelestia.
    with (runtime_dir / "keybind-help.lock").open("a") as lock:
        os.chmod(lock.name, 0o600)
        fcntl.flock(lock, fcntl.LOCK_EX)
        listing = subprocess.run([qs, "list", "-j", "-p", str(QML)],
                                 env=env, capture_output=True, text=True, check=True).stdout
        # Quickshell 0.3.1 emits a human diagnostic instead of JSON for no match.
        absent = f'No running instances for "{QML}"\nUse --all to list all instances.'
        instances = [] if listing.strip() == absent else json.loads(listing)
        if dismiss_pid is not None:
            instances = [instance for instance in instances if instance["pid"] == dismiss_pid]
        if instances:
            for instance in instances:
                if instance["config_path"] != str(QML):
                    raise RuntimeError("Quickshell listed a different configuration")
                pid = instance["pid"]
                try:
                    descriptor = os.pidfd_open(pid)
                except ProcessLookupError:
                    continue
                try:
                    # Verify the live process after obtaining its stable pidfd, so
                    # a stale instance record cannot signal an unrelated reused PID.
                    process = Path(f"/proc/{pid}")
                    command = process.joinpath("cmdline").read_bytes().split(b"\0")
                    config_argument = [b"-p", os.fsencode(QML)]
                    matches = any(command[index:index + 2] == config_argument
                                  for index in range(len(command) - 1))
                    executable = process.joinpath("exe").resolve()
                    if process.stat().st_uid != os.getuid() or not matches or executable.parent != Path(qs).parent:
                        raise RuntimeError("help instance process identity changed")
                    # This build hangs in Qt teardown after qs kill/Qt.quit, but
                    # SIGTERM exits cleanly without leaving an invisible instance.
                    signal.pidfd_send_signal(descriptor, signal.SIGTERM)
                    exited = select.poll()
                    exited.register(descriptor, select.POLLIN)
                    if not exited.poll(2000):
                        raise RuntimeError("help instance did not terminate after SIGTERM")
                except (ProcessLookupError, FileNotFoundError):
                    pass
                finally:
                    os.close(descriptor)
            return 0
        if dismiss_pid is not None:
            return 0
        return subprocess.call([qs, "-n", "-d", "-p", str(QML)], env=env)


def main():
    try:
        if len(sys.argv) == 3 and sys.argv[1] == "--dismiss":
            return toggle(dismiss_pid=int(sys.argv[2]))
        if sys.argv[1:] == ["--data"]:
            print(json.dumps(data(), ensure_ascii=False))
            return 0
        if sys.argv[1:]:
            print("usage: keybind-help.py [--data | --dismiss PID]", file=sys.stderr)
            return 2
        return toggle()
    except (OSError, ValueError, RuntimeError, subprocess.CalledProcessError) as error:
        print(f"keybind-help: {error}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    sys.exit(main())
