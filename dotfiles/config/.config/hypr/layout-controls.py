#!/usr/bin/env python3
"""Switch only the focused workspace and route navigation to its layout."""
import argparse
import fcntl
import json
import os
from pathlib import Path
import selectors
import signal
import socket
import subprocess
import sys
import tempfile
import time


def ctl(*args, query=False):
    result = subprocess.run(["hyprctl", *args], capture_output=True, text=True,
                            timeout=5, check=True)
    text = result.stdout.strip()
    if query:
        return json.loads(text)
    if text != "ok":
        raise RuntimeError(text or result.stderr.strip() or "Hyprland rejected the command")


def active_workspace():
    monitor = next(m for m in ctl("-j", "monitors", query=True) if m["focused"])
    selected = monitor["specialWorkspace"]
    if not selected["id"]:
        selected = monitor["activeWorkspace"]
    return next(w for w in ctl("-j", "workspaces", query=True)
                if w["id"] == selected["id"])


def notify(message):
    subprocess.run(["hyprctl", "notify", "-1", "3500", "rgb(9ad6cc)", message],
                   capture_output=True, timeout=5)


def menu():
    """Keep one non-grabbing card alive for exactly this layouts session."""
    runtime_dir = Path(os.environ.get("XDG_RUNTIME_DIR", f"/run/user/{os.getuid()}"))
    with (runtime_dir / "layout-help.lock").open("a") as lock:
        os.chmod(lock.name, 0o600)
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return  # Repeated invocation retains the existing card and mode.

        import importlib.util
        # Guix Home stores files separately; the script realpath has no sibling helpers.
        helper = Path.home() / ".config/hypr/keybind-help.py"
        spec = importlib.util.spec_from_file_location("keybind_help", helper)
        help_module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(help_module)
        qs, env = help_module.runtime()
        monitor = next(m for m in ctl("-j", "monitors", query=True) if m["focused"])
        rows = [{"keys": help_module.chord(bind),
                 "description": help_module.action_label(bind)}
                for bind in ctl("-j", "binds", query=True) if bind["submap"] == "layouts"]
        if not rows:
            raise RuntimeError("The layouts submap has no bindings")
        namespace = f"hypr-layout-help-{os.getpid()}"
        env["HYPR_LAYOUT_HELP"] = json.dumps({"screen": monitor["name"], "rows": rows})
        env["HYPR_LAYOUT_NAMESPACE"] = namespace
        qml = Path.home() / ".config/hypr/layout-help.qml"
        events_path = runtime_dir / "hypr" / os.environ["HYPRLAND_INSTANCE_SIGNATURE"] / ".socket2.sock"
        child = None
        descriptor = None
        previous_handlers = {}
        activated = False

        def interrupted(signum, frame):
            raise RuntimeError(f"Layout card interrupted by signal {signum}")

        try:
            for signum in (signal.SIGTERM, signal.SIGINT, signal.SIGHUP):
                previous_handlers[signum] = signal.signal(signum, interrupted)
            with socket.socket(socket.AF_UNIX) as events, selectors.DefaultSelector() as watcher, tempfile.TemporaryFile() as log:
                # Subscribe BEFORE starting the surface or changing the submap.
                events.connect(str(events_path))
                watcher.register(events, selectors.EVENT_READ, "events")
                child = subprocess.Popen([qs, "-n", "-p", str(qml)], env=env,
                                         stdin=subprocess.DEVNULL, stdout=log, stderr=log)
                descriptor = os.pidfd_open(child.pid)
                watcher.register(descriptor, selectors.EVENT_READ, "child")
                deadline = time.monotonic() + 15
                buffered = b""
                while True:
                    remaining = None if activated else max(0, deadline - time.monotonic())
                    ready = watcher.select(remaining)
                    if not ready:
                        raise RuntimeError("Layout card did not map; layouts mode was not entered")
                    for key, _ in ready:
                        if key.data == "child":
                            child.wait()
                            log.seek(0)
                            detail = log.read().decode(errors="replace").strip()
                            raise RuntimeError(f"Layout card exited ({child.returncode}): {detail}")
                        chunk = events.recv(65536)
                        if not chunk:
                            raise RuntimeError("Hyprland event connection closed")
                        buffered += chunk
                        while b"\n" in buffered:
                            line, buffered = buffered.split(b"\n", 1)
                            event, _, value = line.decode(errors="replace").partition(">>")
                            if event == "openlayer" and value == namespace and not activated:
                                # onMap is posted only after Hyprland receives a surface
                                # buffer: the card is present before keys enter the mode.
                                ctl("dispatch", "submap", "layouts")
                                activated = True
                                if ctl("-j", "submap", query=True) != "layouts":
                                    return
                            elif event == "submap" and value != "layouts":
                                return  # Selection, Escape, or an external mode change.
                            elif event == "configreloaded":
                                # 0.55.4 reload does NOT reset its live submap. Reset in
                                # finally, rather than leave an invisible layouts mode.
                                return
                            elif event == "closelayer" and value == namespace:
                                raise RuntimeError("Layout card surface closed")
        finally:
            try:
                if ctl("-j", "submap", query=True) == "layouts":
                    ctl("dispatch", "submap", "reset")
            finally:
                if child is not None:
                    # Direct foreground child + pidfd: never qs kill/Qt.quit, which
                    # hang in this runtime, or a broad process-name kill.
                    if descriptor is not None and child.poll() is None:
                        signal.pidfd_send_signal(descriptor, signal.SIGTERM)
                    elif child.poll() is None:
                        child.terminate()
                    try:
                        child.wait(timeout=2)
                    except subprocess.TimeoutExpired:
                        if descriptor is not None:
                            signal.pidfd_send_signal(descriptor, signal.SIGKILL)
                        else:
                            child.kill()
                        child.wait()
                if descriptor is not None:
                    os.close(descriptor)
                for signum, handler in previous_handlers.items():
                    signal.signal(signum, handler)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    commands = parser.add_subparsers(dest="action", required=True)
    commands.add_parser("menu")
    commands.add_parser("master")
    commands.add_parser("parent")
    commands.add_parser("child")
    commands.add_parser("tabs")
    commands.add_parser("equalize")
    commands.add_parser("split")
    commands.add_parser("set").add_argument("value", choices=("dwindle", "master", "dualmaster", "scrolling", "hy3"))
    for name in ("focus", "move"):
        commands.add_parser(name).add_argument("value", choices=("l", "r", "u", "d"))
    commands.add_parser("group").add_argument("value", choices=("h", "v", "tab"))
    commands.add_parser("width").add_argument("value", choices=("next", "prev"))
    args = parser.parse_args()
    if args.action == "menu":
        try:
            menu()
        except Exception:
            # Dependency/data failures can precede the child lifecycle guard.
            # Never retain an already-entered layouts mode without its card.
            if ctl("-j", "submap", query=True) == "layouts":
                ctl("dispatch", "submap", "reset")
            raise
        return
    workspace = active_workspace()
    layout = workspace["tiledLayout"]
    if args.action == "set":
        if args.value in ("hy3", "dualmaster") and not any(p["name"] == args.value for p in ctl("-j", "plugin", "list", query=True)):
            raise RuntimeError(f"{args.value} is not loaded; check its package and compositor ABI")
        name = workspace["name"]
        selector = name if name.startswith("special:") else (
            "name:" + name if workspace["id"] < 0 else str(workspace["id"]))
        ctl("keyword", "workspace", f"{selector},layout:{args.value}")
        notify(f"Workspace {name}: {args.value} (until config reload)")
    elif args.action in ("focus", "move"):
        dispatcher = "movefocus" if args.action == "focus" else "movewindow"
        ctl("dispatch", ("hy3:" if layout == "hy3" else "") + dispatcher, args.value)
    elif args.action == "width" and layout == "scrolling":
        ctl("dispatch", "layoutmsg", "colresize " + ("+conf" if args.value == "next" else "-conf"))
    elif args.action == "master" and layout in ("master", "dualmaster"):
        ctl("dispatch", "layoutmsg", "swapwithmaster")
    elif args.action == "split" and layout == "dwindle":
        ctl("dispatch", "layoutmsg", "togglesplit")
    elif layout == "hy3" and args.action in ("group", "parent", "child", "tabs", "equalize", "split"):
        dispatcher, value = {
            "group": ("makegroup", getattr(args, "value", "")),
            "parent": ("changefocus", "raise"),
            "child": ("changefocus", "lower"),
            "tabs": ("changegroup", "toggletab"),
            "equalize": ("equalize", ""),
            "split": ("changegroup", "opposite"),
        }[args.action]
        ctl("dispatch", "hy3:" + dispatcher, value)
    else:
        raise RuntimeError(f"{args.action} is not available in {layout}")


if __name__ == "__main__":
    try:
        main()
    except (OSError, RuntimeError, subprocess.SubprocessError, ValueError, KeyError, StopIteration) as error:
        message = str(error) or "No focused workspace"
        print(message, file=sys.stderr)
        notify(message)
        sys.exit(1)
