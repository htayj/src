#!/usr/bin/env python3
"""Guix Caelestia shell 2.5.0 lifecycle, scoped to one Hyprland session (no systemd).

Owns only its Caelestia shell, persistent service panes, ephemeral clipboard watcher
and polkit-gnome agent; owned process groups stop when this compositor exits.
"""
import fcntl
import json
import os
from pathlib import Path
import signal
import socket as unix_socket
import subprocess
import sys
import time

HOME = Path.home()
RUNTIME = Path(os.environ.get("XDG_RUNTIME_DIR", f"/run/user/{os.getuid()}"))
STATE = RUNTIME / "caelestia-hyprland.json"
LOCK = RUNTIME / "caelestia-hyprland.lock"
CLIPBOARD_DB = RUNTIME / "caelestia-clipboard.db"
CONFIG_DIR = Path(os.environ.get("XDG_CONFIG_HOME", str(HOME / ".config"))) / "caelestia"
LOG_DIR = Path(os.environ.get("XDG_STATE_HOME", str(HOME / ".local/state"))) / "caelestia"
PROFILES = (HOME / ".guix-profile", HOME / ".guix-home/profile")
REQUIRED = ("bin/caelestia-shell", "bin/caelestia", "bin/caelestia-panes",
            "bin/wl-paste", "bin/cliphist", "libexec/polkit-gnome-authentication-agent-1")
# Mutable config seeded once from the tracked *.seed.json links; never overwritten.
SEEDS = ("cli.json", "shell.json", "monitors/HDMI-A-1/shell.json")
# Every CLI theme target; each must be explicitly false so scheme/wallpaper changes
# never rewrite GTK, Qt, Hyprland, terminal or other application settings.
THEME_FLAGS = ("enableTerm", "enableHypr", "enableDiscord", "enableSpicetify", "enablePandora",
               "enableFuzzel", "enableBtop", "enableNvtop", "enableHtop", "enableGtk", "enableQt",
               "enableWarp", "enableChromium", "enableZed", "enableCava")
STOP = False


def fail(message):
    print(f"Caelestia session: {message}", file=sys.stderr)
    return 1


def binary(relative):
    for profile in PROFILES:
        path = profile / relative
        if os.access(path, os.X_OK):
            return str(path)
    return None


def session_env():
    env = os.environ.copy()
    env["QT_QPA_PLATFORMTHEME"] = "qt6ct"
    # Shared by the watcher and every picker; never the persistent cliphist DB.
    env.update(CLIPHIST_DB_PATH=str(CLIPBOARD_DB), CLIPHIST_MAX_ITEMS="50")
    for key, directory in (("PATH", "bin"), ("XDG_DATA_DIRS", "share"),
                           ("QT_PLUGIN_PATH", "lib/qt6/plugins")):
        paths = [str(profile / directory) for profile in PROFILES]
        paths.extend(env.get(key, "").split(":"))
        env[key] = ":".join(dict.fromkeys(path for path in paths if path))
    # The profile's plain quickshell QML modules would shadow the wrapper's
    # quickshell-for-caelestia build; the wrapper sets its own import path.
    env.pop("QML2_IMPORT_PATH", None)
    env.pop("QML_IMPORT_PATH", None)
    return env


def shell_state():
    try:
        state = json.loads(STATE.read_text())
    except (OSError, ValueError):
        return None, fail("shell is not running; start caelestia-session.py run")
    if state.get("instance") != os.environ.get("HYPRLAND_INSTANCE_SIGNATURE"):
        return None, fail("shell belongs to another Hyprland session")
    return state, 0


def ipc(args):
    state, status = shell_state()
    if state is None:
        return status
    shell = binary("bin/caelestia-shell")
    if shell is None:
        return fail("caelestia-shell is missing from the Guix profiles")
    return subprocess.call([shell, "ipc", "--pid", str(state["shell"]), "call", *args], env=session_env())


def clipboard():
    state, status = shell_state()
    if state is None:
        return status
    cli = binary("bin/caelestia")
    if cli is None:
        return fail("caelestia CLI is missing from the Guix profiles")
    return subprocess.call([cli, "clipboard"], env=session_env())


def lock():
    # Manual action only: Caelestia authenticates through Guix's existing login PAM service.
    return ipc(["lock", "lock"])


def seed_config():
    for name in SEEDS:
        destination = CONFIG_DIR / name
        seed = destination.with_name(destination.stem + ".seed.json")
        if seed.is_file() and not os.path.lexists(destination):
            destination.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
            try:
                with os.fdopen(os.open(destination, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600), "w") as output:
                    output.write(seed.read_text())
            except FileExistsError:
                pass  # Created concurrently; preserve it.


def theming_disabled():
    try:
        theme = json.loads((CONFIG_DIR / "cli.json").read_text()).get("theme")
    except (OSError, ValueError, AttributeError):
        return False
    return isinstance(theme, dict) and all(theme.get(flag) is False for flag in THEME_FLAGS)


def terminate(child, process_group=True):
    # Only children we spawned are signalled. Panes owns its terminal children;
    # never group-signal it, which could also signal a user-owned rbw agent.
    if child.poll() is not None:
        return
    try:
        if process_group:
            os.killpg(child.pid, signal.SIGTERM)
        else:
            child.terminate()
    except ProcessLookupError:
        return
    try:
        child.wait(timeout=5)
    except subprocess.TimeoutExpired:
        try:
            if process_group:
                os.killpg(child.pid, signal.SIGKILL)
            else:
                child.kill()
        except ProcessLookupError:
            pass
        child.wait()


def compositor_alive(path):
    try:
        with unix_socket.socket(unix_socket.AF_UNIX) as connection:
            connection.settimeout(1)
            connection.connect(str(path))
        return True
    except OSError:
        return False


def panes_ready(child, command, env, compositor):
    # A live PID or elapsed sleep is not readiness: require a successful reply
    # from the companion's private control socket, while our serve child lives.
    deadline = time.monotonic() + 10
    while not STOP and child.poll() is None and compositor_alive(compositor):
        remaining = deadline - time.monotonic()
        if remaining <= 0:
            break
        try:
            result = subprocess.run([command, "status"], env=env,
                                    stdin=subprocess.DEVNULL, capture_output=True,
                                    text=True, timeout=min(3, remaining))
            status = json.loads(result.stdout) if result.returncode == 0 else None
            if (isinstance(status, dict) and status.get("ok") is True
                    and status.get("pid") == child.pid and child.poll() is None):
                return True
        except (OSError, ValueError, subprocess.TimeoutExpired):
            pass
        time.sleep(min(0.1, max(0, deadline - time.monotonic())))
    return False


def run():
    global STOP
    instance = os.environ.get("HYPRLAND_INSTANCE_SIGNATURE", "")
    socket = RUNTIME / "hypr" / instance / ".socket.sock"
    if not instance or not socket.is_socket():
        return fail("requires a running Hyprland instance")
    binaries = {relative: binary(relative) for relative in REQUIRED}
    missing = [relative for relative, path in binaries.items() if path is None]
    if missing:
        return fail("Guix profiles are missing " + ", ".join(missing))
    RUNTIME.mkdir(mode=0o700, parents=True, exist_ok=True)
    with LOCK.open("a") as guard:
        try:
            fcntl.flock(guard, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            return 0  # An existing supervisor owns this user's shell.
        seed_config()
        # The shell runs `caelestia wallpaper` when no wallpaper is set; refuse
        # to start unless every CLI theme target is explicitly disabled.
        if not theming_disabled():
            return fail(f"{CONFIG_DIR / 'cli.json'} must set every theme.enable* flag to false")
        owner = subprocess.run([
            "dbus-send", "--session", "--print-reply", "--reply-timeout=3000",
            "--dest=org.freedesktop.DBus", "/org/freedesktop/DBus",
            "org.freedesktop.DBus.NameHasOwner", "string:org.freedesktop.Notifications"
        ], capture_output=True, text=True)
        if owner.returncode:
            return fail("session bus unavailable; use ~/start-hyprland.sh from a local TTY")
        if "boolean true" in owner.stdout:
            return fail("notification bus already owned; will not replace/kill Dunst or another shell")
        # The daemon's flock and same-owner refused-connection check recover a
        # stale socket without replacing a live companion. Readiness below must
        # report our spawned child's PID; never adopt or signal another daemon.
        env = session_env()
        CLIPBOARD_DB.unlink(missing_ok=True)
        children = []
        panes = None
        def stop(_signum, _frame):
            global STOP
            STOP = True
        signal.signal(signal.SIGTERM, stop)
        signal.signal(signal.SIGINT, stop)
        LOG_DIR.mkdir(mode=0o700, parents=True, exist_ok=True)
        try:
            with (LOG_DIR / "hyprland-session.log").open("a") as log:
                def spawn(*command):
                    child = subprocess.Popen(command, env=env, stdin=subprocess.DEVNULL,
                                             stdout=log, stderr=log, start_new_session=True)
                    children.append(child)
                    return child
                panes = spawn(binaries["bin/caelestia-panes"], "serve")
                watcher = spawn(binaries["bin/wl-paste"], "--watch", binaries["bin/cliphist"], "store")
                polkit = spawn(binaries["libexec/polkit-gnome-authentication-agent-1"])
                if not panes_ready(panes, binaries["bin/caelestia-panes"], env, socket):
                    print("Caelestia session: optional service panes did not become ready; "
                          "continuing without panes; inspect hyprland-session.log", file=log, flush=True)
                    terminate(panes, process_group=False)
                    panes = None
                def write_state(shell):
                    STATE.write_text(json.dumps({"instance": instance, "pid": os.getpid(),
                                                 "shell": shell.pid,
                                                 "panes": panes.pid if panes is not None else None}))
                    STATE.chmod(0o600)
                def start_shell():
                    child = spawn(binaries["bin/caelestia-shell"], "-n")
                    write_state(child)
                    return child
                shell = start_shell()
                while not STOP and compositor_alive(socket):
                    if panes is not None and panes.poll() is not None:
                        print(f"Caelestia session: optional service panes exited ({panes.returncode}); "
                              "continuing without panes; inspect hyprland-session.log", file=log, flush=True)
                        panes = None
                        write_state(shell)
                    if watcher.poll() is not None:
                        return fail("clipboard watcher exited; inspect hyprland-session.log")
                    if polkit.poll() is not None:
                        return fail("polkit agent exited; inspect hyprland-session.log")
                    if shell.poll() is not None:
                        # Quickshell exit/restart is not logout. Keep pane widgets,
                        # glirc, capture drafts and reader state in the same daemon.
                        children.remove(shell)
                        shell = start_shell()
                    time.sleep(1)
                return 0
        finally:
            for child in reversed(children):
                terminate(child, process_group=child is not panes)
            STATE.unlink(missing_ok=True)
            CLIPBOARD_DB.unlink(missing_ok=True)


def main():
    if len(sys.argv) < 2:
        return fail("usage: caelestia-session.py run | ipc TARGET FUNCTION [ARGS] | clipboard | lock")
    action, *args = sys.argv[1:]
    if action == "run" and not args:
        return run()
    if action == "ipc" and len(args) >= 2:
        return ipc(args)
    if action == "clipboard" and not args:
        return clipboard()
    if action == "lock" and not args:
        return lock()
    return fail("invalid action")


if __name__ == "__main__":
    sys.exit(main())
