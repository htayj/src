# Dotfiles

This tree is the standalone GNU Stow source for user dotfiles in `/home/tay`.
It is intentionally separate from `/home/tay/src/guix-config/dotfiles`.

Install all packages:

```sh
stow -d ~/src/dotfiles -t ~ home x11 stumpwm sway emacs config keyboard claude
```

Install one package:

```sh
stow -d ~/src/dotfiles -t ~ emacs
```

On a new Guix host, the small core Home configuration provisions the shared
files without building the full application profile:

```sh
guix home reconfigure -L ~/src/guix-config/modules \
  ~/src/guix-config/home-core-configuration.scm
```

Once bootstrap is complete, apply the full workstation profile:

```sh
~/.config/guix/current/bin/guix home reconfigure \
  -L ~/src/guix-config/modules \
  ~/src/guix-config/home-workstation-configuration.scm
```

On `basedbox`, `rbh` runs that Home command and `rbs` runs the System
reconfiguration with the same pinned Guix.  Run `guix pull` only when
`guix-config/channels.scm` changes; reconfiguring after ordinary configuration
edits does not require `guix time-machine` or a separate root pull.

`guix-config/modules/tay/home-common.scm` owns shared Guile values such as
`%primary-font`, generates `~/.stumpwmrc`, and replaces the Fedora systemd
Kanata units with user Shepherd services. The full Home configuration extends
the same packages and services with the workstation application profile. The
older `home-configuration.scm` remains available as a legacy reference but is
not the active configuration target.

Managed packages:

- `home`: shell and top-level user config files.
- `x11`: X resources, X init, GTK 2, and screen layout scripts.
- `stumpwm`: the live StumpWM rc file.
- `sway`: the Sway session — compositor config (`~/.config/sway`, split into
  numbered `config.d` fragments plus a per-host output fragment), the supporting
  app configs it owns (`waybar`, `swaylock`, `mako`, `fuzzel`, `kanshi`,
  `xdg-desktop-portal-wlr`), and its helper scripts in `~/.local/bin`. Bindings
  are sway's shipped defaults (the i3 vocabulary) on top of the Space Cadet
  keymap, where `$mod`/Mod3 is RALT — held on either Kinesis thumb key. Parallel
  to `x11`+`stumpwm` rather than replacing them; both sessions coexist and SDDM
  offers each. Design notes and rationale live in `sway-plan.md`; the package
  list is in `sway-install.md`.
- `emacs`: selected editable Emacs config files inside `~/.emacs.d`.
- `config`: selected editable XDG config under `~/.config`, including shell,
  desktop, terminal, GTK, KDE/LXQt, keyboard, and small tool config.
- `keyboard`: keyboard setup scripts and Kinesis layout files. The Space
  Cadet-inspired Kanata/XKB assets live in the
  `keyboard/manna-cadet` submodule and are symlinked into the package
  for stow compatibility.
- `clawmacs`: Clawmacs user config and installed skills under `~/.clawmacs.d`.
- `claude`: curated Claude Code config under `~/.claude` (CLAUDE.md,
  settings.json, keybindings.json, hooks, statusline, safer-curl wrapper).
  Per-host and per-project overrides go in `~/.claude/.claude/settings.local.json`
  (untracked) per Claude Code's override convention.

Pi configuration is now a separate Git repository directly at `~/.pi/agent`.
Edit it there; it is not managed by Guix Home or GNU Stow. Auth, sessions,
caches, downloaded packages, and other runtime data remain untracked.

## `capture` (Second Brain inbox)

`home/.local/bin/capture` is a small curses editor that saves one note as a
PRIVATE memo in Memos (`https://elitedesk.tail53428b.ts.net:8443`, tailnet
only). Hermes then files it into the Second Brain wiki. A new memo is captured
but not filed yet. Install just this file:

```sh
ln -s ~/src/dotfiles/home/.local/bin/capture ~/.local/bin/capture
```

When it starts, it runs `rbw get "Kubernetes / memos / tay-workstation-capture"`
before opening the editor, so rbw asks for the master password. The vault must
already be unlocked; `capture` never locks or unlocks it. Keys: arrows,
Home/End (Ctrl-A/E), PgUp/PgDn, Backspace/Delete, Enter for a new line, Ctrl-S
to submit, and Ctrl-Q or Ctrl-C to save the draft and quit. The draft is
`~/.local/state/memos-capture/draft.txt` (file 0600, directory 0700). It is
autosaved, kept after any failure, and deleted only after Memos returns the
new memo's name. `capture` never retries a failed submit. If the result is
uncertain, check Memos before you resend so you don't create a duplicate.

You can also run it remotely with `ssh -t basedbox capture`. TLS is always
verified. If neither `SSL_CERT_FILE` nor `SSL_CERT_DIR` is set, which happens
in a non-login SSH session, and Python's built-in CA store is empty, `capture`
uses the Guix system bundle under `/run/current-system/profile/etc/ssl/certs`
(or `/etc/ssl/certs`). If either variable is set, it is always used.

## Tern pinky Super bridge (basedbox)

`config/.config/hypr/tern-pinky.py` ports the EndeavourOS G3's Tern-only
bridge to Hyprland's legacy configuration. Local Space Cadet puts pinky
`Super_L` on Mod4 (`SUPER`), unlike the laptop's Mod3. Alt desktop shortcuts
and Super+Alt group shortcuts are unchanged. With `so.stencil.tern` focused:

| Pinky chord | Tern action | Forwarded chord |
| --- | --- | --- |
| Super+Shift+U | Toggle Usage Monitor | Ctrl+Alt+Shift+U |
| Super+Shift+A | New agent tab (pinky-navigation plugin) | Ctrl+Alt+Shift+A |
| Super+H / L | Previous / next tab | Ctrl+Alt+Shift+H / L |
| Super+J / K | Next / previous session | Ctrl+Alt+Shift+J / K |
| Super+N / P | Next / previous pane | Ctrl+Alt+Shift+N / P |
| Super+Ctrl+N | New note | Ctrl+Alt+N |
| Super+Ctrl+P | Picture in picture | Ctrl+Alt+P |

The helper uses the invoking compositor's Unix IPC socket, snapshots the
focused window and targets its address explicitly. Outside Tern it resends
the original Super chord to that window, rather than translating it or
using the asynchronous `pass` dispatcher's mutable last-key state. No daemon,
extra input-injection dependency, keymap change or application restart is
needed. Deploy `tern-pinky.py` and `tern-pinky.conf` under `~/.config/hypr/`;
Guix Home's existing `config` stow package includes both. The bindings are
sourced exactly once through the mutable `g9-hdr.conf`, which is already
included by both the running immutable main config and the tracked main.
This small compatibility entrypoint preserves bindings across normal reloads
without modifying Guix store files or restarting the session. Monitor values
are unchanged; `g9-hdr-controls` preserves the include when saving individual
HDR settings. The tracked `g9-hdr.conf` seed carries the same include for
future Home activations. The live main-config link also points to tracked
source; neither it nor a future login adds a second copy of the bindings.

On local Tern 0.9.2, `pinky-navigation` registers the agent chord itself;
there is no missing built-in binding to add to settings. Its `SettingsCx:get`,
`Launch.command` and `LayoutCx:new_tab` calls match the locally emitted plugin
types. An isolated real-window check on 2026-10-22 ran a harmless `sleep 180`
agent command: the installed Shift+A bridge created a new active tab in the
focused pane's directory. No plugin compatibility patch or settings rewrite
was needed. Earlier no-op smoke attempts were not reproduced; a command that
exits immediately is unsuitable for checking that a tab remains open.
For developer control, preserve scenario quoting inside the shell argument:
`tern ctl --control EP agent-command '"sleep 180"'`. This is test-only setup,
not the user's agent configuration or evidence of provider authentication.


## Hyprland keybinding help (basedbox)

**Right Alt+Shift+/** (**RAlt+?**) keeps its existing binding and opens a
transient Quickshell overlay, not a terminal pager. A centered card appears on
the monitor focused at open time; the other monitors dim and intercept input.
The single exclusive keyboard grab and shortcut inhibitor follow Hyprland's
focused monitor if it changes, while the card stays on its initial monitor.
The card reads `hyprctl -j binds` on each opening, organizes the loaded
bindings into categories and submaps, and uses `bindd` descriptions when present.
Complete repeated families (such as workspace numbers) are compacted without
hiding partial/custom bindings. Colors follow Caelestia's live
`$XDG_STATE_HOME/caelestia/scheme.json` (default `~/.local/state/caelestia/`).

Any **new key or mouse-button press** dismisses the card. The overlay consumes
the matching release before exiting, so dismissal does not trigger a desktop
shortcut or click through to an application; releasing the opening chord and
held-key autorepeat do not dismiss it. The mouse wheel scrolls long lists
without closing them. Reinvoking the helper closes only this overlay. After
the release, QML calls the helper's internal `--dismiss PID` path: it validates
the configuration, process owner and executable and uses pidfd-scoped SIGTERM.
This avoids the installed Qt runtime's hanging `Qt.quit()` teardown without
leaking an invisible overlay or terminating an unrelated shell.

Deploy both `config/.config/hypr/keybind-help.py` and `keybind-help.qml` into
`~/.config/hypr/`. The helper resolves the exact `qs` dependency from the
installed Guix `caelestia-shell` wrapper, using its matching runtime rather than
an arbitrary `qs` on `PATH`. It launches a standalone QML instance on demand;
no persistent daemon, Caelestia IPC target, new package or terminal window rule
is needed. Errors go to stderr rather than falling back to terminal help.

2026-09-30 live smoke: real QML `grabToImage` captures showed readable grouped,
themed keycaps without clipping on the G9 (2100×1392 card) and CRT (752×552,
with a scroll affordance). Injected Escape dismissed the overlay and its
process exited; right-click on the displayed monitor and middle-click on the
other monitor also dismissed it. Caelestia PID 7291 stayed unchanged.
**Limits:** compositor `grim` captures excluded the overlay, so these are QML
render captures, not physical-desktop screenshot proof. Physical RAlt+? and
wheel scrolling were not exercised in this smoke; the captures show the small
screen's scrolling affordance, not an input-scroll test.
This exclusion is a historical limit of that smoke; the fresh `grim` capture
proof below supersedes the current capture-path failure, not the earlier
help-card's QML-only visual evidence.

**Screenshot shortcuts (2026-10-02):** physical **Right Alt+G** captures an
area; **Right Alt+Shift+G** captures the full desktop. These replace the
former Print-key chords for keyboards without Print. The commands remain
`sh ~/.config/hypr/screenshot.sh area` and `sh ~/.config/hypr/screenshot.sh full`.
The preserved `bindd` descriptions, **Screenshot area** and **Screenshot full
desktop**, appear in the dynamic live-binding help above. The shortcut-change
check verified live G mappings and no configuration errors; it exercised
neither capture nor physical chord input. Later capture proof follows.

**HDR capture buffer workaround (2026-10-02):** the live-linked
`config/.config/hypr/hyprland.conf` now persists
`render:keep_unmodified_copy = 0` beside `render:cm_sdr_eotf = gamma22`.
This fixes the observed stale-frame/wallpaper-only captures without changing
monitor modes, HDR/VRR, gamma22, SDR brightness 200, brightness 1.2 or saturation
1.05. No compositor restart or modeset; final configuration had no errors.
In matching Hyprland 0.55.4 source, 0 requests an unmodified copy on demand
(`needsACopyFB()`), rather than retaining the persistent mirror/second render
attachment used by 1, or by 2 with HDR PQ/HLG plus SDR modifiers. It does **not**
globally disable capture copies. **[INFERENCE]** The persistent buffer path is
implicated; the exact internal stale-frame cause is unproven. The observed fix
is not a long-term stability guarantee.

Actual `grim` PNGs of an isolated synthetic Kitty window were inspected:
1/2 stayed stale even after window replacement; 0 showed fresh animated
counters **1216 → 1222** across a mixed-monitor workspace transition, replacement
**9981**, then **1372 → 1378** after saving. Captures were bounded to
`1810,460 880x480` inside the synthetic 900×500 window at `1800,450`, not private
desktop content. Both unchanged `screenshot.sh area` and `full` paths exited 0
and produced PNG counter **9981** using real `grim`: deterministic `slurp`
geometry replaced interactive selection, and a full-mode adapter bounded it
to the same region. `wl-copy`/notification sinks preserved the user's clipboard.
Real selection failed; selection UI, actual clipboard transfer, physical
shortcuts and unrestricted full-desktop capture were **not reverified**.
Smoke files were removed. Original focus/workspaces/layouts were restored;
exact cursor restoration was not established after the verification kernel
lost its baseline. Earlier capture limits remain historical, superseded for
the current `grim` path, not retroactive proof of other UI surfaces.

## Hyprland workspace layouts (basedbox)

Press **Right Alt+Y**, release Alt, then choose:

| Key | Layout on the focused workspace |
| --- | --- |
| D | Dwindle (default) |
| M | Centered master: half-width main pane with side stacks |
| W | Dualmaster: two coupled centered masters, adjustable 60% total width by default |
| S | Scrolling: one-third-width columns |
| H | hy3: manual split trees and tabbed groups |
| Escape | Cancel |

Alt+Y now opens a persistent, Caelestia-themed layout card on the focused
monitor instead of the brief notification. Its choices come from the live
`layouts` submap bindings; it remains visible for as long as that submap is
active, with no display timeout. A selection/action or Escape closes it;
an external submap reset/change or config reload also closes it. Invalid
keys do not dismiss it. The card takes neither keyboard focus nor pointer
input: Hyprland still handles the bindings and mouse input passes through.

The selection is runtime-only: reload/login restores the configured default.
Other workspaces are untouched. Normal Alt+H/J/K/L focus and Shift variants
move windows, using hy3-specific dispatchers when that layout is active.
Alt+Shift+X/Z cycle scrolling widths (third, half, two-thirds, full);
Alt+Shift+M swaps with master. Alt+V toggles split direction in dwindle/hy3.

**W** keeps two masters side by side in an adjustable centered region,
**60% of usable width by default** (30% per master). Slaves alternate between
left/right 20%-width columns and stack vertically within each side. One
window occupies the current combined centered width. With two masters the
side columns stay reserved even without slaves; removing a primary promotes
the next tiled window. **M** is unchanged: the built-in half-width centered
master layout.

**Right Alt+right-button drag** uses the existing `resizewindow` binding with
the same corner/side-aware direction, smart-resizing scaling, 5%–95% width
clamp and vertical slave sizing as built-in master. Horizontal dragging
resizes the combined center: **both masters grow/shrink together**, remaining
equal with symmetric sides. Width is per-workspace runtime state and resets
when the layout is recreated or configuration reloads; it is not saved to disk.

Additional **Alt+Y, release Alt, then key** operations for hy3:
T creates a tab group, V a horizontal split, B a vertical split, U toggles
the existing group's tabs, K/J select parent/child nodes, E equalizes siblings.
Create a split before opening the next window; U tabs already-grouped windows.
Alt+? includes these bindings in the live help.

Implementation: `config/.config/hypr/layout-controls.py`, `layout-help.qml`
and `hyprland.conf`. The supervisor waits for the card to map before entering
`layouts`, retains one card on repeated invocation, and resets that submap
on reload so it cannot remain active invisibly.
The local Guix channel provides ABI-matched `hy3` and `hyprland-dualmaster`
packages, loaded from `~/.guix-profile/lib/hyprland/libhy3.so` and
`~/.guix-profile/lib/hyprland/libdualmaster.so`. Install both before deploying
this config on another machine; plugin/compositor upgrades must be coordinated.
On 2026-09-30, live IPC smoke with temporary windows verified all four
layouts, relevant actions and named-workspace selection. Existing workspaces
and monitor settings were restored/unchanged. That run did not confirm physical
key events or visual window layouts: virtual keystrokes did not activate binds
and captures showed wallpaper only, even with the plugin unloaded.

On 2026-10-02, live smoke retained the same card beyond five seconds and on
repeat invocation. Virtual input confirmed invalid A keeps it open, while
Escape and D close it and return to the default submap. External reset and
reload also cleaned up; a forced Qt startup failure left no card or active
mode. QML-rendered capture verified readable title, all 12 binding rows and
footer without overlap; compositor capture did not complete. Physical
Right Alt+Y and pointer pass-through were not exercised. Virtual input used
a temporary device-specific bind-symbol override, removed by reload; all
workspace layouts were restored to their baseline after reload.

Dualmaster `0.55.4-0.1.1` was built, scoped-installed and loaded on 2026-10-02
against the exact Hyprland 0.55.4 ABI, without compositor restart or full
Home/System activation. Store:
`/gnu/store/srab5n9r468z0gz27hqyxq3ggf13sh0w-hyprland-dualmaster-0.55.4-0.1.1`.
Its source/package are in `~/projects/guix-channel/guix/tay/packages/`, with
the package declared in `~/src/guix-config/home-workstation-configuration.scm`.
The old two-window horizontal-resize no-op was reproduced first. Actual
virtual evdev/uinput Right Alt+right-button/motion then exercised the existing
binding for both masters and all four drag corners; IPC confirmed coupled
growth/shrinkage, equal masters and symmetric sides, 5%/95% limits, default
1/2/3/8-window geometry, smart/non-smart slave sizing and workspace isolation.
All 14 original clients, layout choices, exact slot order, focus and cursor
were restored; scratch windows/input removed, no config errors, hy3 loaded.
Workspace 1 remains dualmaster at the new default (master client widths `1506`,
`x=1076/2588`). Monitor modes unchanged; resize worker issued no reload or
monitor/DPMS commands. Physical hand-operated dragging and a compositor
screenshot remain unverified; virtual input/IPC is not visual proof.

**Historical initial 0.1.0 smoke, earlier 2026-10-02:** the fixed two-thirds
center/one-third masters/one-sixth sides is superseded by the adjustable 60%
default above. Real IPC covered 1/2/3/4/6 windows in usable logical workarea
`x=65 y=15 w=5040 h=1410`; master clients `x=908/2588`, width `1674`; side
slaves `x=66/4268`, width `836`; six-window stacks `y=16/723`, height `701`.
These client values include gaps/borders. Fullscreen/maximized, directional
movement, promotion/removal/addition, slave sizing and virtual W/M menu
selection passed; scratch removed and baseline layouts restored for that run.

## G9 HDR controls (basedbox)

**Current recovery (2026-10-03):** the live-linked `g9-hdr.conf` uses DP-1
**5120x1440@60, VRR off** (`vrr = 0`), 0x0, scale 1, 10-bit HDR and the
saved calibrated SDR mapping: black `0.005`, white `200`, brightness `1.2`,
saturation `1.05`. `render:cm_sdr_eotf = gamma22` remains the saved transfer
curve in `hyprland.conf`. Only mode and VRR changed; the watcher applied
them without an explicit reload, compositor restart or DPMS cycle. Parent
IPC verifies 59.99900 Hz, HDR/XRGB2101010, VRR false, DPMS on, white 200,
brightness 1.20, saturation 1.05, gamma22 set and no config errors; black
prints as 0.00 at two decimals while the saved value is exactly 0.005.
CRT remains unchanged. The user confirmed the preceding SDR 60 Hz recovery
after DPMS cycling failed; the subsequent HDR 60 Hz physical picture is
**not yet confirmed**. Historical 120 Hz/VRR trials and their appearance
confirmations are not the current working mode. Keep 60 Hz/VRR off during
recovery. "Calibrated" denotes saved appearance values, not instrument
calibration, HDR playback proof or sustained stability.

Run `g9-hdr-controls` in the physical Hyprland session, or choose **G9 HDR
Controls** in the application launcher. It adjusts the G95SC on DP-1 only:
SDR white (80–300 nits), black (0–0.2 nits), brightness multiplier and
saturation. The HDR checkbox permits an SDR comparison. These are visual
SDR-in-HDR adjustments, not colorimeter calibration or HDR clipping patterns.

Sliders are staged until **Apply & save**, which updates the live-linked
`config/.config/hypr/g9-hdr.conf` and reloads Hyprland without restarting the
session. **Restore starting settings** writes back the values from when the
panel opened. Closing retains the last applied values. External edits cause
Apply to refuse rather than overwrite them; reopen the panel to read them.
Peak HDR metadata, CRT settings, resolution and VRR are left alone.
The existing panel preserves the runtime SDR transfer curve across its reloads;
`render:cm_sdr_eotf = gamma22` is now also saved in the live-linked
`config/.config/hypr/hyprland.conf` as the baseline for reloads and sessions.
The 2026-09-30 configuration reload was verified with no errors, and the user
reported the picture looks perfect afterward. That historical visual judgment
is not measured calibration or confirmation of the 2026-10-03 HDR recovery.
Other unrelated runtime-only overrides may reset on reload.

Implementation: `config/.config/hypr/g9-hdr-controls.py`; launcher:
`home/.local/bin/g9-hdr-controls`. The host-local Python/GTK environment is
under `~/.local/share/hyprmod-venv` and the GC-rooted Guix profile
`~/.local/share/hyprmod-runtime` (names retained from the unsuccessful
upstream HyprMod compatibility trial). It contains Python 3.12, PyGObject
3.58 and GTK 4.22; HyprMod itself was removed. Stowing alone does not install
this runtime on another host.

## Per-host fragments

Most files in this repo are shared across hosts; bits that diverge per
machine live in dedicated fragment files matched by hostname. Each host
gets its own fragment; only the matching one is read on each machine.

| File / directory                                       | Convention                                 |
| ------------------------------------------------------ | ------------------------------------------ |
| `home/.bashrc.d/host-<hostname>`                       | Sourced by `.bashrc` when hostname matches |
| `x11/.xinitrc.d/host-<hostname>`                       | Sourced by `.xinitrc`; `exec`s the WM      |
| `x11/.Xresources.host-<hostname>`                      | Layered onto `.Xresources` via `xrdb -merge` |
| `stumpwm/.stumpwm.d/host-<hostname>.lisp`              | Loaded by `.stumpwmrc` via `(machine-instance)` |
| `sway/.config/sway/host-<hostname>.conf`               | Symlinked to `host.conf` by `sway-session`, included by `config` |
| `emacs/.emacs.d/host-<hostname>.el`                    | Loaded by `init.el` via `(system-name)`    |

Adding a new host: pick a hostname, drop empty fragment files at each of
the paths above, then fill in only what differs from the shared base.

Runtime state, credentials, browser data, package caches, and generated Emacs
state are not meant to live here.

Private shell/API credentials should live outside this repo. Application
state, browser profiles, chat databases, credentials, editor swap files,
and local identity material are intentionally excluded from stow.
