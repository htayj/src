#!/usr/bin/env python3
"""G9-only SDR-in-HDR controls; apply writes the dedicated monitor file."""
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile

import gi
gi.require_version("Gtk", "4.0")
from gi.repository import Gtk

CONFIG = Path.home() / ".config/hypr/g9-hdr.conf"
FIELDS = (
    ("sdr_max_luminance", "SDR white (nits)", 80, 300, 5, 0),
    ("sdr_min_luminance", "SDR black (nits)", 0, 0.2, 0.001, 3),
    ("sdrbrightness", "SDR brightness multiplier", 0.5, 1.5, 0.05, 2),
    ("sdrsaturation", "SDR saturation", 0.8, 1.2, 0.01, 2),
)


def ctl(*args):
    result = subprocess.run(["hyprctl", *args], text=True, capture_output=True, timeout=10)
    if result.returncode:
        raise RuntimeError(result.stderr.strip() or result.stdout.strip())
    return result.stdout.strip()


def command(*args):
    result = ctl(*args)
    if result != "ok":
        raise RuntimeError(result)


def value(text, key):
    matches = re.findall(r"^\s*" + re.escape(key) + r"\s*=\s*(\S+)\s*$", text, re.M)
    if len(matches) != 1:
        raise ValueError(f"Expected exactly one {key} in {CONFIG}")
    return matches[0]


def replace_value(text, key, new):
    value(text, key)
    return re.sub(r"(^\s*" + re.escape(key) + r"\s*=\s*)\S+(\s*$)",
                  lambda m: m[1] + str(new) + m[2], text, flags=re.M)


def atomic_write(path, text):
    path = path.resolve(strict=True)  # Home seeds a writable regular settings file.
    fd, temporary = tempfile.mkstemp(prefix=".g9-hdr-", dir=path.parent)
    try:
        with os.fdopen(fd, "w") as stream:
            stream.write(text)
        os.chmod(temporary, path.stat().st_mode & 0o777)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


class Controls(Gtk.ApplicationWindow):
    def __init__(self, app):
        super().__init__(application=app, title="G9 HDR controls")
        self.set_default_size(760, 650)
        self.initial = self.expected = CONFIG.read_text()
        if value(self.expected, "output") != "DP-1":
            raise ValueError("This control panel requires the G9 on DP-1")
        box = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=16)
        for setter in (box.set_margin_top, box.set_margin_bottom,
                       box.set_margin_start, box.set_margin_end):
            setter(24)
        self.set_child(box)
        heading = Gtk.Label(label="Samsung G95SC · SDR appearance in HDR", xalign=0)
        heading.add_css_class("title-2")
        box.append(heading)
        explanation = Gtk.Label(xalign=0, wrap=True, label=(
            "Tune gray backgrounds and text while comparing your normal terminals. "
            "These are visual adjustments, not measured calibration. HDR peak metadata, "
            "resolution, VRR and the CRT are not adjusted here."))
        box.append(explanation)
        self.hdr = Gtk.CheckButton(label="HDR enabled (uncheck for an SDR comparison)")
        box.append(self.hdr)
        self.adjustments = {}
        for key, title, low, high, step, digits in FIELDS:
            row = Gtk.Box(orientation=Gtk.Orientation.VERTICAL, spacing=5)
            row.append(Gtk.Label(label=title, xalign=0))
            adjustment = Gtk.Adjustment(lower=low, upper=high, step_increment=step,
                                        page_increment=step * 5)
            self.adjustments[key] = adjustment
            controls = Gtk.Box(spacing=12)
            scale = Gtk.Scale(orientation=Gtk.Orientation.HORIZONTAL, adjustment=adjustment)
            scale.set_hexpand(True)
            scale.set_draw_value(False)
            controls.append(scale)
            spin = Gtk.SpinButton(adjustment=adjustment, climb_rate=step, digits=digits)
            spin.set_width_chars(7)
            controls.append(spin)
            row.append(controls)
            box.append(row)
        self.load_values(self.initial)
        buttons = Gtk.Box(spacing=12)
        self.apply_button = Gtk.Button(label="Apply & save")
        self.apply_button.add_css_class("suggested-action")
        self.apply_button.connect("clicked", self.apply_clicked)
        buttons.append(self.apply_button)
        restore = Gtk.Button(label="Restore starting settings")
        restore.connect("clicked", self.restore_clicked)
        buttons.append(restore)
        box.append(buttons)
        self.status = Gtk.Label(xalign=0, wrap=True, selectable=True, label=(
            "Sliders do nothing until Apply & save. Applies a config reload, not a session restart. "
            "Closing leaves the last applied settings in place. Restore undoes this session's changes."))
        box.append(self.status)

    def load_values(self, text):
        self.hdr.set_active(value(text, "cm") == "hdr")
        for key, adjustment in self.adjustments.items():
            adjustment.set_value(float(value(text, key)))

    def proposed(self):
        text = self.expected
        for key, adjustment in self.adjustments.items():
            text = replace_value(text, key, f"{adjustment.get_value():.3f}".rstrip("0").rstrip("."))
        text = replace_value(text, "cm", "hdr" if self.hdr.get_active() else "srgb")
        return replace_value(text, "bitdepth", "10" if self.hdr.get_active() else "8")

    def apply_text(self, text):
        if CONFIG.read_text() != self.expected:
            raise RuntimeError("Settings changed outside this panel. Reopen it before applying.")
        monitors = json.loads(ctl("-j", "monitors"))
        target = next((m for m in monitors if m["name"] == "DP-1"), None)
        if not target or target.get("model") != "Odyssey G95SC":
            raise RuntimeError("The expected G95SC is not connected on DP-1.")
        errors = ctl("configerrors")
        if errors:
            raise RuntimeError("Existing config errors; fix before applying: " + errors)
        # A full reload is required for monitorv2 on this installed Hyprland.
        # Preserve the user's runtime-only SDR transfer-curve comparison.
        gamma = json.loads(ctl("-j", "getoption", "render:cm_sdr_eotf"))["str"]
        old = self.expected
        try:
            atomic_write(CONFIG, text)
            command("reload")
            command("keyword", "render:cm_sdr_eotf", gamma)
            errors = ctl("configerrors")
            if errors:
                raise RuntimeError(errors)
        except Exception as error:
            atomic_write(CONFIG, old)
            try:
                command("reload")
                command("keyword", "render:cm_sdr_eotf", gamma)
            except Exception as rollback:
                raise RuntimeError(f"Apply failed: {error}; rollback reload failed: {rollback}") from error
            raise
        self.expected = text
        self.status.set_text("Applied and saved for DP-1. SDR curve retained: " + gamma +
                             ". Judge the physical display; a screenshot cannot calibrate HDR.")

    def apply_clicked(self, _button):
        try:
            self.apply_text(self.proposed())
        except Exception as error:
            self.status.set_text("Not applied: " + str(error))

    def restore_clicked(self, _button):
        try:
            self.apply_text(self.initial)
            self.load_values(self.initial)
        except Exception as error:
            self.status.set_text("Restore failed: " + str(error))


class Application(Gtk.Application):
    def __init__(self):
        super().__init__(application_id="local.g9.HdrControls")

    def do_activate(self):
        window = self.get_active_window()
        if window is None:
            window = Controls(self)
        window.present()


if __name__ == "__main__":
    raise SystemExit(Application().run())
