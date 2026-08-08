# Sway on `basedserv` — Implementation Plan

## Goal

Add Sway as a **second, parallel session** alongside the existing X11 + StumpWM
setup, configured so that:

1. Muscle memory from both i3 and StumpWM transfers with minimal relearning.
2. It suits this machine's hardware (RTX 4090 on the open driver, a 32:9
   240 Hz QD-OLED, a small secondary panel below it).
3. The Kanata + Space Cadet XKB stack keeps working *exactly* as it does under
   StumpWM — same physical keys, same layers, same modifier.

StumpWM and the X11 session are **not touched**. SDDM keeps offering both, so
rollback is "pick the other session at the login screen."

---

## 1. What was verified on this machine

Everything below was measured, not assumed. Commands are included so you can
re-run them.

### 1.1 Hardware

| Item | Value |
| --- | --- |
| Host | `basedserv` (EndeavourOS, Arch rolling) |
| CPU | AMD Ryzen 5 2600X — 6 cores / 12 threads, Zen+ |
| RAM | 62 GiB |
| GPU | NVIDIA RTX 4090 (AD102), `nvidia-open` 610.43.03, DRM driver `nvidia` |
| Output 1 | `DP-1` — Samsung **Odyssey G95SC**, max 5120x1440, 240 Hz, QD-OLED |
| Output 2 | `HDMI-A-1` — Philips panel, max 1920x1080, currently driven at 800x600 |

The X11 layout in `x11/.screenlayout/g9andcrt.sh` places the small panel at
`4200x1440` — i.e. *below* the G9, horizontally inset, not beside it:

```
  x=0                                              x=5120
   +----------------------------------------------+  y=0
   |                                              |
   |        DP-1  —  Odyssey G95SC                |
   |            5120 x 1440 @ 240                 |
   |                                              |
   +----------------------------------------------+  y=1440
                              +--------+
                              | HDMI   |  800x600 at x=4200
                              | -A-1   |
                              +--------+  y=2040
```

That geometry is non-overlapping and carries over to Sway unchanged.

Note the X11 connector names differ from the DRM/Wayland ones. X calls them
`DP-0` / `HDMI-0`; Sway will use the kernel names `DP-1` / `HDMI-A-1`.

### 1.2 Software already present

`sway 1.12` (linked against `wlroots0.20`), `kanata 1.12.0`, `ghostty 1.3.1`,
`dunst 1.13.2`, `rofi 2.0.0` (links `libwayland-client`, so it is
Wayland-capable), `xorg-xwayland`, `pipewire` + `wireplumber`,
`xdg-desktop-portal` + `-gtk`, `qt5-wayland` + `qt6-wayland`, `sddm 0.21`,
`wev 1.1.0`, `vulkan-icd-loader`.

`emacs 30.2` is the **GTK3 / Cairo** build, *not* pgtk:

```console
$ emacs -Q --batch --eval '(princ (featurep (quote pgtk)))'
nil
```

So Emacs will run through XWayland. That is fine at scale 1 (see §7.1).

### 1.3 NVIDIA: a nag banner, not a gate (changed in sway 1.12)

```console
$ strings /usr/bin/sway | grep -E 'unsupported-gpu|swaynag'
To remove this message, launch sway with --unsupported-gpu or set the
environment variable SWAY_UNSUPPORTED_GPU=true.
swaynag
```

Older guides — including the Arch Wiki Sway page — say sway *refuses to start*
on NVIDIA without `--unsupported-gpu`. **That stopped being true in sway 1.12.**
Per the 1.12 release notes, sway now starts normally and merely displays an
informational message; the flag suppresses the message and nothing else. No
renderer path or feature differs. The `swaynag` strings sitting next to that
message in the binary are the local confirmation — it is a nag bar, not an exit.

The detection is `strcmp(drmGetVersion(fd)->name, "nvidia-drm")`, so
`nvidia-open` trips it identically; sway cannot distinguish the open kernel
modules and does not try.

Practical effect is unchanged — set `SWAY_UNSUPPORTED_GPU=true` so you don't get
a banner every login — but the *reason* matters: if something fails to start,
this is not the cause, and you should not go looking here.

### 1.4 The Space Cadet keymap — the important result

`~/.config/xkb/keymap/spacecadet.xkb` **compiles cleanly under libxkbcommon**,
which is the library Sway uses:

```console
$ xkbcli compile-keymap --keymap ~/.config/xkb/keymap/spacecadet.xkb
  ... exit 0, 2473 lines ...
```

Both groups survive intact. Sample key `<AD01>` (physical `q`) from the
compiled output:

```
key <AD01> {
    type[1]= "FOUR_LEVEL_ALPHABETIC",
    type[2]= "TWO_LEVEL",
    symbols[1]= [ q, Q, Greek_theta, Greek_THETA ],
    symbols[2]= [ upcaret, NoSymbol ]
};
```

That is the whole design: group 1 = base / Shift / Greek / Shift+Greek, group 2
= the Top/math layer. Nothing is lost in translation from `xkbcomp` to
`xkbcommon`.

The modifier map also survives verbatim. What matters is the **whole chain** —
which physical key you actually press, what Kanata emits for it, and where XKB
files that. Reading only the XKB half is misleading, because on the Adv360 no
modifier is on the key its keycode is named after.

Traced end to end from `kinesis.advantage360.layered.kanata.kbd` (`normal`
layer) and `symbols/spacecadet` lines 375–395:

| Physical key you press | Kanata alias → emits | XKB key | Keysym | Slot | Safe to bind in Sway? |
| --- | --- | --- | --- | --- | --- |
| **hold either big thumb key** — left (taps `Backspace`) or right (taps `Space`) | `@Hro` / `@Hsp` → `ralt` | `<RALT>` | `Alt_L` | **Mod4** | **Yes — this is `$mod`** |
| hold homerow **`s`** or **`l`** | `@Ms` / `@Ml` → `lalt` | `<LALT>` | `Meta_L` | `Mod1` | **No — Emacs Meta** |
| hold homerow **`a`** or **`;`** | `@sa` / `@s;` → `lmet` | `<LWIN>` | `Super_L` | `Mod3` | Yes (spare tier) |
| hold **`Esc`** or **`'`**, or right thumb upper | `@eoam` / `@qoam` → `rmet` | `<RWIN>` | `Hyper_L` | `Mod2` | Yes (spare tier) |
| hold left thumb **`Delete`** | `@gdel` → `@gr` = code 85 | `<ZEHA>` | `ISO_Level3_Shift` | `Mod5` | **No — Greek layer** |
| hold right thumb **`Enter`** | `@rtop` → `@top` = code 84 | `<LVL3>` | `Mode_switch` | *(none — SetGroup)* | **No — Top layer** |

So **the two big thumb keys are the window-manager modifier.** Hold either one
and you get `Mod4`. Meta is not on a thumb at all — it is a homerow mod on `s`
and `l`.

Two consequences worth internalising before reading the bindings section:

- Because *both* thumbs produce `Mod4`, you can always drive the WM with
  whichever hand is free — and `$mod`+`Space` is simply "hold one thumb, tap
  the other", which is exactly how `A-SPC` already feels in StumpWM.
- `$mod`+`BackSpace` is unusable: `Backspace` *is* the left thumb key, so you
  would have to hold and tap the same key. Avoid it when picking bindings.

> Two documentation bugs found along the way, both in the comment block at the
> top of `keyboard/manna-cadet/xkb/symbols/spacecadet`. It lists `Mod1` and
> `Mod3` the other way round from what the code on lines 391–393 actually does,
> and it describes `<LALT>` as "thumb Alt" when Kanata sources that keycode from
> the homerow. The table above reflects the compiled keymap and the live Kanata
> config. Worth fixing that comment while you are in there.
>
> The Kanata alias names, by contrast, check out: `@gr` is `arbitrary-code 85`
> → evdev 85 → XKB keycode 93 → `<ZEHA>` → Greek, and `@top` is
> `arbitrary-code 84` → XKB keycode 92 → `<LVL3>` → `Mode_switch` → group 2.

### 1.5 Why this makes Sway unusually easy for you

Sway resolves modifier names to the same real-modifier indices X uses:
`mod4` / `super` / `logo` all mean real modifier slot 4. Your keymap puts RALT
in slot 4. Therefore:

> **`bindsym Mod4+h` in Sway fires on the exact same physical thumb key as
> `(define-key *top-map* (kbd "A-h") ...)` in StumpWM.**

And `set $mod Mod4` is *also* the stock i3 convention. The i3 muscle memory and
the StumpWM muscle memory land on the same config token by coincidence of your
keymap. No remapping, no translation layer, and the thumb keys keep doing what
they already do.

### 1.6 Use `xkb_file`, not `xkb_layout`

The rules-based route fails:

```console
$ xkbcli compile-keymap --layout spacecadet --variant base
xkbcommon: ERROR: [XKB-595] Unrecognized RMLVO variant "base" was ignored
xkbcommon: ERROR: Failed to compile keymap
```

`~/.config/xkb/rules/evdev` declares `* spacecadet = pc+inet(evdev)+spacecadet(base)`
under a `! model layout = symbols` header, but libxkbcommon validates the
variant against the XML registry and rejects `base`. Dropping the variant does
not resolve the symbols either.

The `xkb_file` route works and is what the plan uses. Sway 1.12 supports it:

```
$ man 5 sway-input | grep xkb_file
input <identifier> xkb_file <file_name>
```

### 1.7 Kanata needs no changes

```console
$ grep -nE 'cmd|danger' kinesis.advantage360.layered.kanata.kbd
   (no matches)
```

None of the Kanata configs use `cmd` or shell actions — they are pure key
remapping. There is no Kanata → WM IPC to port. The data flow is identical
under both WMs:

```
  physical keyboard
        |  (grabbed exclusively by kanata)
        v
     kanata            layers, tap-hold, homerow mods
        |
        v
  /dev/uinput virtual keyboard   -- emits raw keycodes
        |
        v
   xkbcommon (in sway)   <-- spacecadet.xkb: groups, levels, modifier_map
        |
        v
     sway bindings       Mod4 == RALT
```

Under X, the third box is the X server, and it re-applies the *default* layout
whenever Kanata recreates its uinput device — hence
`manna-cadet/reload-spacecadet-xkb.sh` and the `ExecStartPost` hook in
`kanata@.service`. **Sway applies `input` config to devices as they appear**,
including hotplugged and recreated ones, so that whole workaround disappears.

The Advantage 2 layered profile uses an identical modifier arrangement to the
360 (`@Hro`/`@Hsp` thumb → `ralt`, `@Ms`/`@Ml` homerow → `lalt`), so §1.4 holds
whichever Kinesis is plugged in. The laptop profile likewise routes its physical
thumb Alt straight to `ralt`.

### 1.7.1 Foot pedals

`kanata@footswitches` is also enabled. The pedals' firmware emits
`ralt f24 menu rmet`, and Kanata rewrites those to **`F1`–`F4`**. The Adv360's
`defsrc` has no function row at all, so `F1`–`F4` are unclaimed keycodes —
which makes them ideal Sway binding targets (push-to-talk, workspace flips, or
holding a mode). Worth doing; you have four free physical switches.

Two caveats:

- **If `kanata@footswitches` is not running, a pedal press reaches Sway as raw
  `ralt` — i.e. as `$mod`.** Same under StumpWM, so this is pre-existing rather
  than new, but it is worth knowing when a pedal seems to "stick" a modifier.
- The `defalias` block in `footswitches.kanata.kbd` defines `fs1`–`fs4`, but
  `deflayer base` maps to `f1 f2 f3 f4` directly and never references those
  aliases. The file's own comment says to rebind by editing the aliases, which
  currently has no effect. Unrelated to Sway; flagging it because you will
  likely touch this file when wiring pedals to Sway commands.

---

## 2. Design decisions

### 2.1 The frame-vs-tree gap, and how to close it

This is the one real conceptual difference, so it is worth being precise.

StumpWM tiles **frames**; a frame is a region that holds many windows and shows
one at a time, and `pull-hidden-next` rotates through the rest. i3 and Sway tile
**windows** in a tree; every window has its own visible slot and nothing hides
behind anything.

Think of it as a filing cabinet versus a pegboard. A StumpWM frame is a drawer:
one opening, many folders, you pull one forward at a time. An i3/Sway tile is a
peg: everything hangs in view simultaneously, and adding a tool means the wall
gets more crowded.

Sway has a drawer you can bolt onto the pegboard: the **tabbed container**. A
tabbed container occupies one region, holds many windows, shows one, and cycles
with `focus next` / `focus prev`. That is a StumpWM frame in all but name.

So the plan binds:

- `Mod4+w` → `layout tabbed` — "make this region behave like a StumpWM frame"
- `Mod4+e` → `layout toggle split` — back to pegboard behaviour
- `Mod4+n` / `Mod4+p` → `focus next` / `focus prev` — the `pull-hidden-next`
  and `pull-hidden-previous` equivalents

If you find you want frame semantics *everywhere*, set
`workspace_layout tabbed` and Sway becomes structurally very close to StumpWM.
Start with the default and decide after a week.

### 2.2 A real prefix map via Sway modes

StumpWM's `*root-map*` behind the `A-x` prefix has no i3 equivalent by default,
but Sway `mode` blocks are exactly a prefix keymap: entering a mode grabs the
keyboard, so unmodified single keys become bindable and nothing leaks to the
focused application.

So `Mod4+x` enters `mode "stump"`, and the `*root-map*` entries become plain
keys inside it, each ending with `mode "default"`. `Escape` and `Ctrl+g` exit,
matching the StumpWM/Emacs abort convention.

This is the single change that makes the result feel like StumpWM rather than
like plain i3 — and it costs nothing, because i3-style direct bindings on
`Mod4+<key>` coexist with it.

### 2.3 Always use `bindsym --to-code`

Non-obvious, and a direct consequence of your layout. Your keymap has a second
group (Top/math) reachable via `Mode_switch`. When group 2 is active, the
keysym at the physical `h` position is no longer `h`, so a plain
`bindsym Mod4+h` would silently stop matching.

`bindsym --to-code Mod4+h` resolves the keysym to a **keycode** using the first
layout and binds the physical position instead. Bindings then work regardless of
active group or level. Every letter/digit binding in this plan uses it.

### 2.4 Bar: waybar (reversed — swaybar cannot render modern tray icons)

Your StumpWM modeline is a single format string —
`[date] [group] windows ^> [disk][mem][mpd] [tay@host] [tray]` — rendered in
`unscii` on black, with a tray attached via `stumptray`.

An earlier revision of this plan chose **swaybar**, reasoning that it ports that
string more directly (`status_command` + the i3bar JSON protocol), has a
built-in tray, needs no extra package, and can hide on a modifier. That
recommendation was **wrong**, for a reason that only showed up in testing.

**swaybar loads tray icons through gdk-pixbuf, and librsvg has removed its
gdk-pixbuf loader module upstream.** So on this system gdk-pixbuf cannot decode
SVG at all, and swaybar can render only PNG tray icons. Measured here:

| theme | PNG | SVG |
| --- | --- | --- |
| `breeze-dark` | 0 | 19827 |
| `Qogir` | 0 | 29926 |
| `elementary` | 0 | 3566 |
| `hicolor` | 977 | 385 |

`hicolor` is the only remaining source of PNGs, and it is a fallback stub. So
any tray app whose icon is not in hicolor renders as swaybar's missing-icon
glyph — a red frowny face. Observed with the three tray apps this plan installs:

| icon | app | result under swaybar |
| --- | --- | --- |
| `nm-device-wired` | nm-applet | PNG in hicolor — renders |
| `blueman-active` | blueman | PNG in hicolor — renders |
| `drive-removable-media-usb-pendrive` | udiskie | **no PNG anywhere — frowny** |

Setting `icon_theme breeze-dark` does not help, because the problem is the image
*format*, not the theme lookup.

**waybar is GTK3, which loads all three fine** — verified directly with
`Gtk.IconTheme.load_icon`, which returned 22x22 pixbufs for every one including
the SVG-only pendrive. So waybar it is, substituted via `swaybar_command waybar`
so sway still owns the bar's lifecycle.

The costs of waybar are real but smaller than a broken tray: a separate JSONC +
CSS config rather than one format string, known CPU creep on long-running
sessions, and module options that drift between minor releases so copied
dotfiles rot. Its config is version-controlled in this package, which blunts the
last one.

### 2.5 Launcher: fuzzel

Your `app-launcher` command pins the last 10 launched apps to the top of the
menu, most-recent-first, with the most recent preselected. `fuzzel` maintains
exactly that MRU cache natively (`~/.cache/fuzzel`) and is Wayland-native and
fast. rofi 2.0 is already installed and Wayland-capable if you would rather
reuse what you know — both are covered in §5.4.

---

## 3. Repository layout

The dotfiles tree is GNU Stow. StumpWM and X11 are already separate packages
precisely because they are WM-specific, so Sway gets its own package the same
way:

```
dotfiles/sway/
├── .config/sway/
│   ├── config                     # entry point; includes the fragments below
│   ├── config.d/
│   │   ├── 00-variables.conf
│   │   ├── 10-input.conf          # kanata + spacecadet wiring
│   │   ├── 20-output.conf         # generic/default output rules
│   │   ├── 30-appearance.conf     # colours, borders, fonts
│   │   ├── 40-bindings.conf       # i3-style direct bindings
│   │   ├── 50-modes.conf          # stump prefix map, resize, mpd
│   │   ├── 60-rules.conf          # for_window / assign rules
│   │   └── 70-autostart.conf      # exec / exec_always
│   ├── host-basedserv.conf        # per-host: output geometry
│   └── host.conf -> host-<hostname>.conf   # symlink, refreshed by the wrapper
├── .config/swaylock/config
├── .config/swaynag/config
├── .local/bin/
│   ├── sway-session               # env + exec sway
│   ├── sway-doctor                # session diagnostics
│   ├── sway-window-switcher       # pull-global-window equivalent
│   ├── sway-screenshot            # scrot+xclip equivalent
│   └── sway-keymap-picker         # select-keymap equivalent
└── .config/systemd/user/sway-session.target
```

Install with `stow -d ~/src/dotfiles -t ~ sway`, and add `sway` to the list in
`README.md`.

### 3.1 Per-host fragments

Sway's `include` has no command substitution, so the existing
"`host-<hostname>` fragment" convention needs one small trick: the session
wrapper refreshes a `host.conf` symlink before exec'ing Sway.

```sh
ln -sfn "host-$(hostname).conf" ~/.config/sway/host.conf
```

`config` then does `include host.conf`, and the convention documented in
`README.md`'s per-host table extends to Sway unchanged. Add a row:

| `sway/.config/sway/host-<hostname>.conf` | Symlinked to `host.conf` by `sway-session`, included by `config` |

---

## 4. Phases

Each phase is independently testable and leaves the X11 session working.

### Phase 0 — Install packages

See §8. Nothing else in this plan works until this is done.

### Phase 1 — Verify prerequisites (no changes yet)

1. Confirm NVIDIA KMS is active. The parameter file is root-readable only:

   ```sh
   sudo cat /sys/module/nvidia_drm/parameters/modeset   # want: Y
   sudo cat /sys/module/nvidia_drm/parameters/fbdev     # want: Y
   ```

   Both are expected to already read `Y`: `modeset` has been automatic in Arch
   since `nvidia-utils` 560.35.03-5 and is the NVIDIA default from 595, and
   `fbdev` is default-on in Arch. If either reads `N`, add
   `nvidia_drm.modeset=1 nvidia_drm.fbdev=1` to the kernel command line.

   **`fbdev` matters more than it looks on this machine.** It resolves a
   conflict between `simpledrm` and `nvidia-drm`, and the Arch Wiki treats it as
   a hard requirement on Linux ≥ 6.11 — you are on 7.1.5. If the check comes
   back `N`, fix it before Phase 2 rather than debugging a black VT later.

2. `/etc/mkinitcpio.conf` currently has `MODULES=()`. Early KMS is *optional*
   but gives a cleaner boot and a reliable VT handoff:

   ```
   MODULES=(nvidia nvidia_modeset nvidia_uvm nvidia_drm)
   ```

   followed by `sudo mkinitcpio -P`. **This is the only step in the plan that
   touches system boot configuration.** It is reversible (restore `MODULES=()`,
   regenerate), but do it deliberately and keep a known-good kernel entry.
   If you would rather not, skip it — Sway will still start.

3. Re-confirm the keymap compiles (should be instant, exit 0):

   ```sh
   xkbcli compile-keymap --keymap ~/.config/xkb/keymap/spacecadet.xkb >/dev/null && echo OK
   ```

### Phase 2 — Minimal session, launched from a TTY

Goal: get a black screen with a terminal and confirm the GPU path works, before
investing in bindings.

1. Write `~/.local/bin/sway-session` (§5.1) and a stub `~/.config/sway/config`
   containing only output config, `Mod4+Return` → ghostty, and
   `Mod4+Shift+e` → exit.
2. Switch to a free VT (`Ctrl+Alt+F3`), log in, run `sway-session`.
3. Verify: both outputs light up, the G9 reports the right mode, a terminal
   opens, exit works.
4. `swaymsg -t get_outputs` — confirm both outputs, their names, and that the G9
   negotiated 5120x1440 at 240 Hz. You do **not** need to copy the exact
   fractional refresh string: sway selects the nearest matching mode, so
   `@240Hz` matches a panel advertising `239.760Hz`. (Older dotfiles carrying
   exact fractions are harmless noise, not a requirement.)

Do not proceed until this phase is clean. Debugging input config on top of a
broken GPU path wastes time.

### Phase 3 — Input: Kanata + Space Cadet

The heart of the port. Detail in §5.2. Verification checklist in §6.

### Phase 4 — Bindings

The translation table in §5.3, split across `40-bindings.conf` and
`50-modes.conf`.

### Phase 5 — Session furniture

Bar, idle/lock, screenshot, launcher, notifications, window switcher. §5.4.

### Phase 6 — systemd and SDDM integration

`sway-session.target`, environment import, the SDDM desktop entry, and the
`kanata@.service` cleanup. §5.5.

### Phase 7 — Fidelity gaps and follow-ups

§7.

---

## 5. Configuration detail

### 5.1 Session wrapper — `~/.local/bin/sway-session`

Environment must be set *before* Sway starts (renderer selection and the GPU
gate are read at startup), which is why this is a wrapper and not `exec` lines
inside the Sway config.

```sh
#!/usr/bin/env bash
set -eu

# Suppresses the informational NVIDIA banner. Sway 1.12 starts fine without
# this — it is cosmetic only (§1.3).
export SWAY_UNSUPPORTED_GPU=true

export XDG_SESSION_TYPE=wayland
export XDG_CURRENT_DESKTOP=sway

# VA-API. Valid here only because libva-nvidia-driver is installed; it is not
# a compositor variable and does nothing for sway itself.
export LIBVA_DRIVER_NAME=nvidia

# Toolkit backends. Qt still needs telling; the rest are belt-and-braces on
# current versions — see the note below before cargo-culting these elsewhere.
export QT_QPA_PLATFORM='wayland;xcb'
export QT_WAYLAND_DISABLE_WINDOWDECORATION=1
export _JAVA_AWT_WM_NONREPARENTING=1
export MOZ_ENABLE_WAYLAND=1
export ELECTRON_OZONE_PLATFORM_HINT=auto

# Per-host fragment, matching the dotfiles hostname convention.
ln -sfn "host-$(hostname).conf" "$HOME/.config/sway/host.conf"

exec systemd-cat --identifier=sway sway "$@"
```

**On the toolkit block: most of it is already unnecessary at your versions.**
Firefox has been Wayland-native by default since ~130 (you have 153), so
`MOZ_ENABLE_WAYLAND` is a no-op. Electron works out of the box from 38.2, so
`ELECTRON_OZONE_PLATFORM_HINT` only matters for older bundled runtimes. And
**Chromium needs no flags at all** — `--ozone-platform-hint=auto` became the
default in Chrome 140 (Aug 2025) and you have 151. An earlier note in this
session said Chromium and Slack would need flags files; that was wrong for
current versions. Keeping the two exports costs nothing and covers stragglers,
but don't go writing `chromium-flags.conf`.

Also worth knowing: `--enable-features=WebRTCPipeWireCapturer` is a **no-op** —
the flag was removed from Chromium's codebase entirely (default-on since M110,
expired in M120). And `media.webrtc.camera.allow-pipewire` in Firefox governs
the *webcam*, not screen sharing; it is a red herring that appears in many
guides.

`XDG_SESSION_TYPE=wayland` above is legacy too — `XDG_CURRENT_DESKTOP` and
`WAYLAND_DISPLAY` are what actually get consumed — but it is harmless and some
older software still checks it.

**Deliberately omitted, because they are cargo cult or actively harmful:**

| Variable | Why it is not here |
| --- | --- |
| `GBM_BACKEND=nvidia-drm` | Mesa's libgbm picks the backend from the DRM driver name already. Forcing it breaks hybrid setups. |
| `__GLX_VENDOR_LIBRARY_NAME=nvidia` | GLX-only, and glvnd resolves the vendor itself. Irrelevant to a Wayland compositor. |
| `NVD_BACKEND=direct` | `direct` is already the default. |
| `WLR_DRM_NO_ATOMIC=1` | **Harmful.** It forces the legacy DRM interface, and wlroots only sets `features.timeline` on the non-legacy path — so it silently disables KMS explicit sync, recreating the exact flicker it gets cargo-culted to fix. |
| `__GL_GSYNC_ALLOWED` / `__GL_VRR_ALLOWED` | X11-era GLX hints. Under Wayland, VRR is negotiated through KMS; use `output ... adaptive_sync`. |

The genuinely useful fallback is one variable, added only if the symptom
appears:

- `export WLR_NO_HARDWARE_CURSORS=1` — still present and still functional in
  wlroots (the "removed/deprecated" claims are about Hyprland's fork, not
  wlroots). It should be unnecessary on driver 610 + wlroots 0.20, and it costs
  a GPU composite per cursor move, so add it only if the cursor actually
  corrupts.

`WLR_RENDERER=vulkan` is **not** recommended here, contrary to most NVIDIA
guides. wlroots tries GLES2 → Vulkan → Pixman and GLES2 wins whenever it
initialises; the proposal to default to Vulkan is still open and uncommitted.
Reported downsides include roughly double GPU utilisation on video playback and
cursor motion triggering render work GLES2 avoids. The "use Vulkan on NVIDIA"
advice is largely a pre-explicit-sync artifact — a way to dodge GLES2 implicit
sync breakage that explicit sync now fixes properly. The one real reason to
enable it is HDR (§7.7), which requires it.

**Explicit sync is the thing that actually made NVIDIA usable**, and you already
have every piece: it needs NVIDIA ≥ 555 (you have 610), kernel ≥ 6.8 (you have
7.1.5), and sway ≥ 1.11 (you have 1.12). This is why the historical
black-window and artifact bugs in Chromium, Electron, and Steam are no longer
the default experience.

### 5.2 Input — `config.d/10-input.conf`

```
# Space Cadet, applied to every keyboard.
#
# Applying to type:keyboard rather than to kanata's virtual device specifically
# is deliberate: if kanata dies or is stopped, the raw keyboard keeps the
# spacecadet map, so Mod4 (RALT) bindings keep working and you are not locked
# out of the WM.
#
# Sway applies input config to devices as they appear, so kanata recreating its
# uinput device on restart needs no re-apply hook. This replaces the entire
# reload-spacecadet-xkb.sh path used under X.
input type:keyboard {
    xkb_file /home/tay/.config/xkb/keymap/spacecadet.xkb
    repeat_delay 250
    repeat_rate 40
}
```

Use the absolute path — Sway does not expand `~` here.

**Point `xkb_file` at the FLATTENED keymap, not the source.** An earlier
revision of this plan used the source `~/.config/xkb/keymap/spacecadet.xkb` and
treated flattening as a fallback. That was the wrong default, and it is the most
likely cause of the first failed session.

The source keymap is seven lines of `include` directives, which libxkbcommon
resolves against an include path derived from `$XDG_CONFIG_HOME`, falling back
to `$HOME`. Measured:

```console
$ env -i HOME=/home/tay PATH=/usr/bin xkbcli compile-keymap --keymap <source>
  exit 0
$ env -i PATH=/usr/bin xkbcli compile-keymap --keymap <source>
  ERROR: [XKB-338] Couldn't find file "symbols/spacecadet" in include paths
  exit 1
$ env -i HOME=/home/tay XDG_CONFIG_HOME=/nonexistent ... --keymap <source>
  exit 1
```

So in any session whose environment does not resolve those paths, the keymap
**silently falls back to a default US layout** — and when that happens `Mod4`
stops being RALT and becomes the physical Super key. The symptom is exactly
"the mod key doesn't work", with no error the user ever sees.

The flattened keymap removes the entire failure class:

```sh
xkbcli compile-keymap --keymap ~/.config/xkb/keymap/spacecadet.xkb \
  > ~/src/dotfiles/sway/.config/sway/spacecadet.resolved.xkb
```

2473 lines, zero `include` directives, all five `modifier_map` slots intact, and
it compiles under `env -i` with no environment whatsoever. The only cost is
regenerating it after a `manna-cadet` change, which is a one-line command and
far cheaper than a silent fallback.

**Pointer:**

```
input type:pointer {
    accel_profile flat
    pointer_accel 0
}

focus_follows_mouse no       # matches *mouse-focus-policy* :click
mouse_warping none
```

### 5.3 Bindings

`Mod4` is RALT throughout — produced by holding either big thumb key, exactly
as StumpWM's `A-` is today (§1.4).

```
set $mod Mod4
set $term ghostty
set $menu fuzzel
```

**Direct bindings (`config.d/40-bindings.conf`)** — StumpWM `*top-map*` and i3
defaults agree almost everywhere:

| StumpWM | Sway | Notes |
| --- | --- | --- |
| `A-h` `A-j` `A-k` `A-l` | `bindsym --to-code $mod+h` → `focus left` (etc.) | identical |
| `A-H` `A-J` `A-K` `A-L` | `$mod+Shift+h` → `move left` (etc.) | identical |
| `A-1` … `A-9`, `A-0` | `$mod+1` → `workspace number 1` … `$mod+0` → `workspace number 10` | see note below |
| `A-!` … `A-)` | `$mod+Shift+1` → `move container to workspace number 1` | `--to-code` makes the digit form correct |
| `A-SPC` app-launcher | `$mod+space exec $menu` | hold one thumb, tap the other — both thumbs give `Mod4` |
| `A-f` my-toggle-float | `$mod+f floating toggle` | |
| `A-n` / `A-p` pull-hidden-next/prev | `$mod+n focus next` / `$mod+p focus prev` | frame analogue, see §2.1 |
| `A-;` mark | `$mod+semicolon mark --add --toggle _m` | paired with a goto binding |
| — | `$mod+Return exec $term` | hold left thumb, tap right-thumb `Enter`. Note `Enter` held *alone* is the Top-layer shift, so tap it rather than hold |
| — | `$mod+q kill` | i3 reflex |
| — | `$mod+w layout tabbed` / `$mod+e layout toggle split` | frame semantics, §2.1 |
| — | `$mod+r mode "resize"` | i3 reflex |
| Alt+Shift+Btn3 drag resize | `floating_modifier $mod normal` | `$mod`+right-drag resizes, `$mod`+left-drag moves |

> Your StumpWM digit bindings call `gnew one`, `gnew two`, … which *creates* a
> new group on every press rather than selecting an existing one — almost
> certainly not the intent (`gselect` would be the selecting form). Sway's
> `workspace number N` selects-or-creates, which is the behaviour you actually
> want, so the port quietly fixes this.

**Prefix map (`config.d/50-modes.conf`)** — the StumpWM `*root-map*`:

```
bindsym --to-code $mod+x mode "stump"

mode "stump" {
    bindsym --to-code d          exec gv;                          mode "default"
    bindsym --to-code b          exec sway-web-prompt firefox;     mode "default"
    bindsym --to-code Ctrl+s     exec sway-ssh-prompt;             mode "default"
    bindsym --to-code $mod+l     exec swaylock -f;                 mode "default"
    bindsym --to-code $mod+o     exec sway-screenshot;             mode "default"
    bindsym --to-code $mod+b     exec sway-window-switcher;        mode "default"
    bindsym --to-code Shift+k    exec sway-keymap-picker;          mode "default"
    bindsym --to-code Mod1+s     exec sway-web-search duckduckgo;  mode "default"
    bindsym --to-code i          exec sway-web-search imdb;        mode "default"

    bindsym Escape  mode "default"
    bindsym Ctrl+g  mode "default"
}
```

Two notes on that `Mod1+s` line, which ports StumpWM's `A-x M-s`:

- It is safe despite the "never bind `Mod1`" rule from §1.4, because a Sway mode
  grabs the keyboard — nothing reaches Emacs while the mode is active. The rule
  only constrains the *default* mode.
- Physically it looks impossible, since `Mod1` *is* homerow `s`. It works
  because Meta is mirrored on `l`: hold `l` with the right hand, tap `s` with
  the left. Same trick as `$mod+space` using the opposite thumb. Every mirrored
  homerow mod gives you this escape hatch, which is presumably why they are
  mirrored.

An `mpd` mode on `$mod+M` mirrors `*mpd-map*` the same way, driving `mpc`.

### 5.4 Session furniture

**Bar** — `waybar`, per §2.4:

```
bar {
    position top
    font "unscii 16"
    status_command ~/.local/bin/sway-status
    mode hide
    hidden_state hide
    modifier Mod2          # Hyper (hold Esc or '), NOT $mod — see §2.4
    colors {
        background #000000
        statusline #aaaaaa
        separator  #aa5500
        focused_workspace  #aa5500 #000000 #aaaaaa
        inactive_workspace #333333 #000000 #888888
    }
    tray_output DP-1
}
```

`tray_output` takes `none`, `*`, or an output name — there is no `primary`
keyword as there is in i3. Naming `DP-1` keeps the tray (the `stumptray`
replacement) on the G9.

`sway-status` emits the same fields as the StumpWM modeline: date, disk usage
for `/` and `/mnt/nas`, memory, mpd, `tay@basedserv`. Start with plain text;
move to the i3bar JSON protocol if you want per-block colour.

**Appearance** — a direct port of the StumpWM colours:

```
default_border pixel 1
default_floating_border pixel 1
smart_borders no
gaps inner 0
default_orientation auto      # splits along the longer axis — right for 32:9

# class                 border  backgr. text    indicator child_border
client.focused          #00aa00 #000000 #aaaaaa #00aa00   #00aa00
client.focused_inactive #333333 #000000 #888888 #333333   #333333
client.unfocused        #333333 #000000 #888888 #333333   #333333
client.urgent           #aa00aa #000000 #ffffff #aa00aa   #aa00aa
```

**`default_orientation auto` does far less than its name suggests, and this is
the most common misconception about it.** Reading sway's source,
`output_get_default_layout()` (`sway/tree/output.c`) is called only when a
*workspace* is created, and it decides from the **output's** aspect ratio
whether that workspace starts `splith` or `splitv`. It never looks at a window
again.

On a 5120x1440 panel — wider than tall — it therefore returns horizontal for
every workspace, permanently. It does **not** adapt per split, so it does not
save you from absurdly wide slivers after three splits. Setting it is harmless
but nearly pointless here.

The thing that actually does what you want is **`autotiling`** (§8), which
subscribes to focus events and re-splits based on the *focused container's*
current width:height ratio. Different level of the tree, different trigger.
They compose rather than compete.

The analogy: `default_orientation` is choosing whether a bookshelf is portrait
or landscape when you buy it. `autotiling` decides which way to cut each shelf
as you fill it. On a 32:9 panel you want the second one.

**But note the tension with the frame workflow (§2.1):** autotiling's own README
states it "may make stack and tabbed layouts behave oddly… please, do not submit
issues about it." Since stacked containers *are* your StumpWM frame analogue,
you have a real either/or. The documented escape hatches are `--limit 2` (which
approximates master-stack) or scoping with `--workspaces`/`--outputs` so some
workspaces are frame-style and others autotile. Decide this deliberately.

**Output** — `host-basedserv.conf`, with output names confirmed in Phase 2:

```
output DP-1 {
    mode 5120x1440@240Hz
    pos 0 0
    scale 1
    adaptive_sync off
    max_render_time off
    bg #000000 solid_color
}

output HDMI-A-1 {
    mode 800x600
    pos 4200 1440
    scale 1
    bg #000000 solid_color
}
```

Four notes, all now backed by upstream evidence rather than caution:

- **The exact refresh string does not matter.** Sway now selects the nearest
  matching mode, so `5120x1440@240Hz` matches a panel advertising
  `239.760Hz`. Older dotfiles carrying exact fractions are harmless noise.
- **`adaptive_sync off`, and expect to leave it off.** Sway's own VRR-setups
  wiki has ~30 entries: almost all AMD, roughly half reporting flicker, two
  Intel, and **zero NVIDIA**. The Arch Wiki VRR page states plainly that Wayland
  VRR is supported on "Plasma and Sway (no Nvidia)." Worse, ultrawide OLED is
  the single worst-supported intersection — both ultrawide OLED entries in that
  wiki report flicker. If you ever do want it, the effective lever is an **EDID
  override** narrowing the panel's VRR range, not a sway setting; upstream has
  said so explicitly and declined to add a workaround.
- **`max_render_time` needs two knobs, not one.** The `output` value is when
  *sway* composites; a separate `for_window [...] max_render_time <msec>` tells
  the *client* when to render, and **it has no effect unless the output value is
  also set.** Start at `1` and increment until frame drops stop. Budgets are
  tight at high refresh: 6.94 ms at 144 Hz, 4.17 ms at 240 Hz — a value at or
  above the frame period is meaningless. Note `max_render_time auto` **does not
  exist** in any release; guides describing automatic tuning are quoting
  unmerged work.
- Solid black backgrounds still require `swaybg` — sway shells out to it.

**One debugging lever to keep in your pocket: `WLR_SCENE_DISABLE_DIRECT_SCANOUT=1`.**
Nearly every guide names `sway -D noscanout` instead — **that flag was removed in
sway 1.10**, and 1.12 parses only `noatomic`, `txn-wait`, `txn-timings`, and
`txn-timeout=`. The env var is the live equivalent. It is worth knowing because
direct scanout is implicated in two issues that match your hardware profile: the
long-standing wlroots VRR-lag report (whose author found disabling direct
scanout the only tolerable configuration), and a bug where screensharing a
fullscreen game thrashes scanout and hardware cursors several times a second
until sway crashes. Don't set it pre-emptively — it costs you the
zero-copy fullscreen path — but reach for it before blaming your config.

Two ultrawide-specific limits worth knowing before you plan around them:

- **You cannot split one ultrawide into multiple logical outputs.** This is the
  single most-requested ultrawide feature and it is an open, unmerged RFC. If
  you were hoping to treat the G9 as "three monitors," you cannot — you get one
  output and organise with containers instead.
- **DSC/bandwidth problems at 5120x1440 present as black screens or silent mode
  reverts**, and DSC link training is controlled by neither sway nor wlroots, so
  there is nothing to configure if it bites.

**Idle and lock** — genuinely not optional on QD-OLED:

```
exec swayidle -w \
    timeout 300  'swaylock -f' \
    timeout 600  'swaymsg "output * power off"' \
    resume       'swaymsg "output * power on"' \
    before-sleep 'swaylock -f'
```

This replaces `slock`. The 600 s blank is the burn-in mitigation; combined with
the hide-on-modifier bar there are no long-lived static bright elements.

Three details that circulating configs get wrong:

- Use **`output * power off`, not `disable`.** `disable` tears down the output
  and loses its workspaces and window placement. `output ... dpms` is a
  deprecated alias for `power`.
- **Do not use `swaylock-effects`.** The original is dead since 2023 and still
  built against `wlr-input-inhibitor`, which was removed from wlr-protocols — it
  refuses to run on modern sway. The fork distros package is self-titled
  "unmaintained," and the only actively maintained descendant carries an
  inherited PAM bug where a shadowed status made authentication *failure* report
  success. Plain `swaylock` uses `ext-session-lock-v1`, where the compositor
  keeps the screen locked even if the locker crashes. `gtklock` (in `extra`) is
  the maintained "fancy" option.
- **Idle inhibition needs no daemon for the common case.** Sway has it built in:
  `for_window [app_id="mpv"] inhibit_idle fullscreen`, with modes
  `focus|fullscreen|open|visible|none`. Firefox and mpv also speak
  `idle-inhibit-unstable-v1` natively. Add `SwayAudioIdleInhibit` (AUR only) just
  for the "audio playing, no video" case.

Worth adding on OLED: **`chayang`** (AUR) dims the screen as a *cancellable*
grace period before the lock fires. That makes a shorter idle timeout tolerable,
which is exactly the trade you want for burn-in.

**Sway and wlroots have no burn-in mitigation of their own** — searching both
trackers for "OLED" and "burn-in" returns nothing, and nothing is in progress.
Mutter and KWin have no compositor-level pixel shift either; the whole Linux
desktop leans on panel firmware. So: short timeouts, solid black background
rather than a wallpaper, autohide the bar, and leave the G9's own panel-care
features enabled.

**Screenshot** — a direct port of `screenshot-selection-copy-path`, which saves
to `~/Pictures/Screenshots/` and puts the *path* on the clipboard:

```sh
#!/usr/bin/env bash
set -eu
dir="$HOME/Pictures/Screenshots"; mkdir -p "$dir"
file="$dir/screenshot-$(date +%Y%m%d-%H%M%S).png"
grim -g "$(slurp)" "$file" && printf %s "$file" | wl-copy
```

`grim`+`slurp` replace `scrot -s`; `wl-copy` replaces `xclip`.

Keep this thin wrapper rather than using **`grimshot`** directly, for one
specific reason: grimshot copies the *image* to the clipboard, whereas your
StumpWM command copies the *path*. Install `sway-contrib` anyway — grimshot is
the de-facto standard, handles `active`/`screen`/`output`/`area`/`window`
targets and `--notify`, and the package also ships `sway-session.target` (§5.5)
and `grimpicker`.

Two upstream notes: grim's GitHub repo is an **archived mirror** frozen at
v1.4.0 from 2022 — the live project is on freedesktop GitLab, and v1.5.0 added
`ext-image-copy-capture-v1` plus `-T` for true per-window capture. grimshot has
*not* been ported to `-T`; its `window` mode still crops a rectangle from
`swaymsg -t get_tree` geometry, so occluding windows appear in the shot.

For annotation, **`satty`** is the momentum pick over `swappy` (both in
`extra`). Note its documented pipeline uses uncompressed ppm deliberately, since
it is faster over a pipe:

```sh
grim -g "$(slurp -o -r -c '#ff0000ff')" -t ppm - | satty --filename - --fullscreen
```

**Window switcher** — `pull-global-window` showed every window across all groups
with `[group:name] #num title — class` labels. The Sway equivalent reads the
tree and focuses the pick:

```sh
#!/usr/bin/env bash
set -eu
sel=$(swaymsg -t get_tree | jq -r '
  [recurse(.nodes[]?, .floating_nodes[]?)
   | select(.type=="con" and .name != null and (.nodes|length)==0)]
  | .[] | "\(.id)\t[\(.app_id // .window_properties.class // "?")] \(.name)"')
[ -n "$sel" ] || exit 0
pick=$(printf '%s\n' "$sel" | cut -f2- | fuzzel --dmenu) || exit 0
id=$(printf '%s\n' "$sel" | grep -F -m1 "$pick" | cut -f1)
swaymsg "[con_id=$id] focus"
```

Note the semantic difference: StumpWM *pulled* the window into the current
frame; Sway *focuses* it where it lives. If you want the pull behaviour, append
`move container to workspace current` before the focus. Pick whichever matches
how you actually use it.

**Keymap picker** — `select-keymap` used `setxkbmap`; the Sway equivalent is
`swaymsg input type:keyboard xkb_layout <code>`, listing candidates from
`localectl list-x11-keymap-layouts` exactly as the Lisp version does. Note that
selecting a stock layout this way *replaces* the Space Cadet keymap for the
session; the script should offer a "spacecadet" entry that restores
`xkb_file` so you can get back.

**Notifications — switch to `mako`.** An earlier draft of this plan said to keep
dunst because it has a Wayland backend. That was too generous. dunst is
X11-native with Wayland bolted on: it is a layer-shell port that silently falls
back to X11 when protocols are missing, has no global hotkeys (you drive it via
`dunstctl`), has limited fullscreen detection, and cannot stack above the bar so
placement differs. Its large install base is inflated by every X11 i3 and bspwm
user.

`mako` is by the same author as sway itself, is D-Bus activated so it starts
lazily, and your `dunstrc` maps across almost line for line — `origin
top-center` → `anchor=top-center`, the black-on-black palette, and the three
urgency blocks with a non-expiring critical.

Take **`swaync`** instead only if you want a persistent notification centre with
DND and inline replies. It is heavier, GTK3, and its README states it is only
tested against default Adwaita and does not support third-party GTK themes — so
matching your black-and-amber palette means editing its CSS.

### 5.5 systemd and SDDM

**Most of this is already packaged — do not hand-roll it.**

Arch's `sway` package ships `/etc/sway/config.d/50-systemd-user.conf`, and the
stock config includes that directory at line 241. It already does:

```
exec systemctl --user set-environment XDG_CURRENT_DESKTOP=sway
exec systemctl --user import-environment DISPLAY SWAYSOCK WAYLAND_DISPLAY XDG_CURRENT_DESKTOP
exec dbus-update-activation-environment --systemd DISPLAY SWAYSOCK XDG_CURRENT_DESKTOP=sway WAYLAND_DISPLAY
```

So the `exec_always` block an earlier draft of this plan specified is redundant.
**The only requirement is that your config keeps `include /etc/sway/config.d/*`.**

That line is load-bearing, and it is the single most common cause of "my tray is
empty" and "screen sharing does nothing": `xdg-desktop-portal-wlr`'s unit
carries `ConditionEnvironment=WAYLAND_DISPLAY`, so without the import the
service silently never starts. Verify with:

```sh
systemctl --user show-environment | grep XDG_CURRENT_DESKTOP
```

Likewise **`sway-session.target` ships in the `sway-contrib` package** at
`/usr/lib/systemd/user/sway-session.target`, already declaring
`BindsTo=graphical-session.target` and `Wants=graphical-session-pre.target`. It
is a package install, not a file to write. Start it with a single exec (combined
deliberately — splitting import and start races):

```
exec_always systemctl --user start sway-session.target
```

Services then get `BindsTo=sway-session.target` + `WantedBy=sway-session.target`.
One shutdown wart: `systemctl --user stop sway-session.target` returns before
services have finished stopping; the systemd-documented fix is a unit that
`Conflicts=` the target, started instead of stopping it directly.

**Decision point: `uwsm` instead of the wrapper (§5.1).** The Universal Wayland
Session Manager is in `extra` at 0.26.6 and is where the ecosystem's momentum
is — it is also now the Arch Wiki's recommended alternative to hand-rolled
drop-ins. It wraps the compositor in templated units bound to the stock
`graphical-session*` targets, and adds environment *cleanup* on exit, XDG
autostart, ordered shutdown, and per-app cgroups so systemd-oomd kills one
application rather than your whole session. You would launch `uwsm start -- sway`
and move the environment from the wrapper script into `~/.config/uwsm/env`.

Its one strongly-recommended prerequisite is `dbus-broker`, because the
reference dbus-daemon cannot unset variables and leaves stale environment
behind. **You already run `dbus-broker` 37-3, active.** So the main objection
does not apply to you.

The trade is a layer of indirection between you and the compositor, and it is
strictly either/or: you cannot combine `uwsm` with `sway-systemd` or a
hand-rolled `sway-session.target`. Exactly one thing owns the session.

Recommendation: start with the plain wrapper in §5.1 so Phase 2 has as few
moving parts as possible, then adopt `uwsm` at Phase 6 once the session is
known-good. Do not try to debug both at once.

**Avoid `sway-services`**, which runs sway itself as a systemd service. Upstream
is blunt that running sway as a service "is not supported, nor recommended, nor
required for anything," and graphical-session-bound services start before sway
and fail at least once.

**Kanata unit cleanup.** `kanata@.service` currently has:

```ini
After=graphical-session.target
PartOf=graphical-session.target
ExecStartPost=-/bin/bash -c 'sleep 2 && %h/reload-spacecadet-xkb.sh'
```

Kanata does not need a graphical session at all — it talks to `/dev/uinput`.
Under Sway the `ExecStartPost` is dead weight (§1.7), and the graphical ordering
just delays keyboard availability. Two options:

- **Preferred:** drop the graphical ordering, keep `WantedBy=default.target`,
  and make the `ExecStartPost` conditional so the X11 session keeps its
  re-apply hook: `ExecStartPost=-/bin/bash -c '[ -n "$DISPLAY" ] && sleep 2 && %h/reload-spacecadet-xkb.sh'`.
- **Minimal:** leave the unit alone. The `ExecStartPost` already has a leading
  `-` so its failure under Wayland is non-fatal; it just logs noise.

Take the preferred option — it makes Kanata come up earlier at boot, which also
helps at the SDDM password prompt.

**SDDM entry.** SDDM scans `/usr/local/share/wayland-sessions` before
`/usr/share/wayland-sessions` (confirmed in
`/usr/lib/sddm/sddm.conf.d/default.conf`), so add a session there rather than
editing the packaged `sway.desktop`:

```ini
# /usr/local/share/wayland-sessions/sway-tay.desktop
[Desktop Entry]
Name=Sway (tay)
Comment=Sway with per-user environment wrapper
Exec=/home/tay/.local/bin/sway-session
Type=Application
DesktopNames=sway;wlroots
```

This is the only file outside `$HOME`, it survives `sway` package upgrades, and
deleting it fully reverts the integration. The existing X11 StumpWM session
entry is untouched, so the login screen offers both.

---

## 6. Verification checklist

Run these in a Sway session before declaring Phase 3 done. This is the part
that actually proves the keyboard stack survived the port.

1. **Sway loaded the keymap, not a fallback:**

   ```sh
   swaymsg -t get_inputs | jq -r '.[] | select(.type=="keyboard")
     | "\(.identifier)\n  layout: \(.xkb_active_layout_name)"'
   ```

   Expect the Space Cadet group name, not `English (US)`. `kanata`'s virtual
   device should appear alongside the physical keyboards.

   **Gotcha when copying identifiers out of `get_inputs`:** sway escapes `/` as
   `\/` in that JSON, so a device shows as `"2:14:Foo\/Bar_Keyboard"`. Strip the
   backslashes before pasting into an `input` block or the identifier will never
   match. This plan uses `type:keyboard` precisely to sidestep that.

   **Gotcha if you run this from inside tmux:** `SWAYSOCK` goes stale across
   sessions and `swaymsg` reports "sway socket not detected." Add `SWAYSOCK` to
   tmux's `update-environment` — worth doing up front given how much you live in
   tmux.

2. **Modifier slots are where they should be.** `wev` is already installed:

   ```sh
   wev -f wl_keyboard
   ```

   Hold each of these and read the `mods` line. These are the *physical*
   gestures, which is what actually needs testing — see §1.4:

   | Hold this | Expect |
   | --- | --- |
   | **either big thumb key** (Backspace / Space) | `Mod4` set |
   | homerow `s` or `l` | `Mod1` set |
   | homerow `a` or `;` | `Mod3` set |
   | `Esc` or `'` | `Mod2` set |
   | left thumb `Delete` | `Mod5` set |

3. **Both Space Cadet layers work.** Hold left-thumb `Delete` and press `q` →
   `θ`. Hold right-thumb `Enter` (the `Mode_switch` group shift) and press `q`
   → `↑` (`upcaret`).

4. **Kanata layers work.** Homerow mods: hold `f` → Shift, tap `f` → `f`. Test
   a `tap-hold-release` boundary at speed; if timings feel different from X,
   check `repeat_delay`/`repeat_rate` in `10-input.conf` rather than blaming
   Kanata.

5. **Hotplug survives.** `systemctl --user restart kanata@advantage360` and
   confirm the keymap is still active with step 1 — no manual re-apply. This is
   the specific thing `reload-spacecadet-xkb.sh` existed to fix under X.

6. **Failsafe.** `systemctl --user stop kanata@advantage360`, confirm `Mod4+h`
   still moves focus (raw keyboard keeps the spacecadet map per §5.2), then
   start it again.

7. **Emacs Meta is intact.** In Emacs, hold homerow `s` and press `x` — that is
   `M-x` and must open the command prompt, not trigger anything in Sway. If it
   does not, something bound bare `Mod1`.

   Then check the inverse: hold a **thumb** key and press `x`. That is `$mod+x`
   and must enter the `stump` prefix mode, *not* reach Emacs. These two are the
   pair most likely to be misconfigured, because they are the two keys that were
   conflated in the original XKB comment block.

8. **Group 2 does not break bindings.** Switch to group 2 and confirm `Mod4+h`
   still moves focus — this is what `--to-code` buys (§2.3).

---

## 7. Known gaps and follow-ups

### 7.1 Emacs runs on XWayland

The installed Emacs is GTK3/X11, so it goes through XWayland. At `scale 1` with
no fractional scaling this is essentially invisible — you lose nothing but
Wayland-native input methods and per-output scaling.

If you want native: `emacs-wayland` is the pgtk build. Tradeoffs worth knowing
before switching — pgtk has historically had rougher edges with some input
methods and with `emacsclient -c` on daemon startup, and it cannot display on an
X11 session at all, which matters while you are still dual-running StumpWM.
Recommendation: **stay on the X11 build** until Sway is your primary session,
then reconsider.

### 7.2 Floating windows lose a colour

StumpWM distinguishes floating focus (`#aa00aa`) from tiled focus (`#00aa00`).
Sway has no separate floating border colour — `client.focused` covers both.
Minor fidelity loss with no clean workaround.

### 7.3 Sunshine

`sunshine.service.d` currently runs Sunshine against an isolated Xvfb +
Gamescope display rather than capturing the desktop, so it is orthogonal to the
compositor and should keep working. Verify after Phase 6 rather than assuming;
Gamescope's behaviour differs when its parent session is Wayland.

### 7.4 Screen sharing — better than its reputation, with one real trap

`xdg-desktop-portal-wlr` provides the screencast backend; without it, browser
screen-sharing silently offers nothing. **The portal *config* needs no work** —
Arch's sway package already ships `/usr/share/xdg-desktop-portal/sway-portals.conf`
routing ScreenCast and Screenshot to `wlr` with `default=gtk` for everything
else (file chooser especially — xdpw implements no FileChooser at all).

That file also sets `org.freedesktop.impl.portal.Inhibit=none` deliberately, so
Firefox falls back to Wayland's idle-inhibit protocol instead of the GNOME
session-manager path sway does not implement. Don't "fix" that line.

**The widely-repeated claim that xdpw can only share whole outputs, not windows,
is out of date.** Per-window capture landed in xdpw 0.8.0 and needs the
compositor side too — which arrived in **sway 1.12**. You have 1.12, so window
sharing works. Blog posts, forum answers, and xdpw's own wiki all still say
otherwise.

**The trap that will bite you:** xdpw auto-*skips* "simple"-type source choosers
whenever a request includes windows, and Chrome, Firefox, and OBS all request
monitors *and* windows. So **if `slurp` is your only installed chooser, those
requests fail outright.** You need a dmenu-style chooser — which is another
reason to install fuzzel:

```ini
# ~/.config/xdg-desktop-portal-wlr/config
[screencast]
chooser_type=dmenu
chooser_cmd=fuzzel -d -l 10 -p 'Share: '
max_fps=60
```

**Version note:** Arch ships xdpw **0.8.2**, two releases behind upstream's
0.8.4. It *does* have window capture (0.8.0+), but it lacks 0.8.4's fix for
stream freezes under PipeWire buffer starvation. Skip **0.8.3** entirely — its
own release notes warn it stalls recording. If you hit stream freezes before
Arch catches up, `xdg-desktop-portal-wlr-git` is a defensible temporary move.

One open upstream bug (xdpw #364) makes window capture blurry on *scaled* outputs
while full-monitor capture stays sharp. **It does not affect you** — you run
both outputs at `scale 1`. Worth remembering only if you ever add a scaled
display.

Browser flag advice you may find is obsolete: Chromium's
`--enable-features=WebRTCPipeWireCapturer` was removed from the codebase
entirely, and Firefox needs no flags. Audio during screen share is not possible
on *any* desktop — the ScreenCast portal spec has no audio in the API at all, so
GNOME and KDE can't do it either. Workarounds live at the PipeWire layer.

### 7.7 Screen recording: use OBS, not the wlroots recorders

This one splits entirely on GPU vendor, and NVIDIA lands badly:

- **`wl-screenrec`** is the performance king (roughly 2.5% CPU at 4K60 versus
  wf-recorder's ~75% with VAAPI) but its hardware path is **VAAPI-only**, and
  `nvidia-vaapi-driver` is decode-oriented. On NVIDIA you get software encode.
  AUR-only anyway.
- **`wf-recorder`** works but has never supported NVENC, and it is still on the
  deprecated `wlr-screencopy` protocol — the port to `ext-image-copy-capture` is
  an open PR. It works today only because sway still advertises the legacy
  global.
- **OBS Studio** (in `extra`) is the right answer here. Use the **"Screen
  Capture (PipeWire)"** source — `wlrobs` and `obs-xdg-portal` are legacy, don't
  install them. OBS 32.2.0 fixed the long-standing PipeWire-on-NVIDIA bug and
  moved to NVENC SDK 13, which requires driver ≥ 570; you have 610. Window
  capture in OBS works given sway 1.12 + xdpw 0.8.0+.

### 7.8 HDR exists in 1.12, but temper expectations

Your G95SC is HDR-capable and sway 1.12 shipped `output <name> hdr on|off`
(BT2020 + PQ, implies `render_bit_depth 10`). Two caveats before you reach for
it: it **requires the Vulkan renderer**, which §5.1 otherwise advises against;
and it is HDR10 *output* only — wlroots currently just clips, with no gamut or
tone mapping, and EDID luminance is not plumbed through, so clients tone-map to
10000 nits and get clipped. 10-bit buffers also roughly triple VRAM.

`render_bit_depth 10` is documented as experimental, is warned to break
screencast tools, and has an open "does not work" bug since 2023 where identical
hardware reports 8 or 10 bit across reboots.

Also note a 1.11→1.12 behaviour change: `color_profile srgb` now applies the
piecewise sRGB transfer function rather than gamma 2.2. The default
(`gamma22`) is unchanged, so this only affects you if you set `srgb` explicitly.

### 7.9 You are on the riskier driver branch

`nvidia-open` 610 is the **feature branch**, not the stable one. The community
picture is that 595 is the safest for sway, while 610 carries VRR regressions
and a new per-plane colour-pipeline API that can blank the screen on compositors
that don't handle it — and wlroots/sway are not driving that API. Your machine
confirms you're on it: `/sys/module/nvidia_drm/parameters/color_pipeline` exists.

This is **not** a recommendation to downgrade — Arch only ships 610 now
(610.57.04 is current; you're on 610.43.03), so moving back means AUR or the
package archive. Treat it as diagnostic context: if you hit unexplained
blanking or VRR weirdness, the driver branch is a prime suspect rather than your
sway config. Specifically, 610 introduced a per-plane DRM colour pipeline, and
blank screens have been reported on compositors that mishandle non-bypassable
colorops — wlroots is not driving that API.

**Two traps you will hit if you search for help on this.**

The `wlroots-nvidia` AUR package is dead advice that still circulates, and the
Arch Wiki points at it for "flickering on the upper half of the screen." Reading
its PKGBUILD: it is **pinned to wlroots 0.17.4**, and the entire patch is one
line changing `glFlush()` to `glFinish()` — a brute-force CPU stall standing in
for implicit sync. Installing it downgrades you from 0.20.x to 0.17.4, which
means **giving up explicit sync entirely** to get a strictly worse workaround
for the same problem. Don't.

More broadly, **the Arch Wiki Sway page is stale on every NVIDIA point in this
section.** It still tells you to run with `--unsupported-gpu` as a requirement
(false since 1.12, which Arch has shipped since mid-2026), and its cursor
guidance cites a 2019 issue. Copy-paste NVIDIA env blocks found in forums almost
all predate explicit sync, and any that contain `WLR_DRM_NO_ATOMIC=1` will
actively hurt you (§5.1). Relatedly, most `WLR_NO_HARDWARE_CURSORS`
"deprecation" results describe **Hyprland's fork**, not wlroots — the variable
is alive and functional in wlroots master.

### 7.10 Colour temperature: only one client at a time

If you want night-light, pick exactly one of `wlsunset` (more sway-native and
more actively developed) or `gammastep` (the redshift fork, with geoclue).
`wlr-gamma-control-unstable-v1` allows **only one client at a time** and wlroots
does not merge gamma LUTs — run two and one silently loses. This is the source
of most "gamma control of output failed" reports.

`wl-gammarelay-rs` is a different shape: a D-Bus daemon exposing temperature and
brightness as properties, for keybindings and bar modules.

### 7.5 `autorandr` and `.screenlayout` do not apply

Those are X-only. Sway output config is declarative in `host-basedserv.conf`,
and profile switching is `swaymsg output ...` or `nwg-displays`/`wdisplays` if
you want a GUI. The existing X scripts stay for the StumpWM session.

### 7.6 gnome-keyring is referenced but not installed

`.xinitrc` conditionally starts `gnome-keyring-daemon`, but the package is not
present, so that branch has been dead. Not a Sway problem — flagging it since
the Sway session will need an equivalent decision about SSH/GPG agent sockets.
You already unlock the Git signing key through PAM, so this may be intentional.

---

## 8. What to install

The authoritative list, with per-package reasoning, is in
[`sway-install.md`](./sway-install.md). Summary:

### Required — core session

```sh
sudo pacman -S --needed \
    swaybg swayidle swaylock \
    grim slurp wl-clipboard \
    fuzzel mako \
    sway-contrib kanshi autotiling \
    xdg-desktop-portal-wlr
```

| Package | Replaces / why |
| --- | --- |
| `swaybg` | Sway shells out to it for `output bg`, even solid colours |
| `swayidle` | Idle → DPMS off. **QD-OLED burn-in mitigation — treat as required** |
| `swaylock` | Replaces `slock`. Not `swaylock-effects` (§5.4) |
| `grim` + `slurp` | Replace `scrot -s` |
| `wl-clipboard` | Replaces `xclip` |
| `fuzzel` | Replaces the native `app-launcher`, same MRU behaviour. Also needed as the screencast source chooser (§7.4) |
| `mako` | Replaces dunst — see §5.4 for why the earlier "keep dunst" call was reversed |
| `sway-contrib` | Ships `grimshot`, `grimpicker`, **and `sway-session.target`** (§5.5) |
| `kanshi` | The `autorandr` equivalent: declarative output profiles reapplied on hotplug |
| `autotiling` | **Not optional on a 32:9 panel** — `default_orientation auto` does not do what its name suggests (§5.4) |
| `xdg-desktop-portal-wlr` | Screencast backend (§7.4) |

### Required — desktop services replacing Plasma components

```sh
sudo pacman -S --needed blueman network-manager-applet udiskie gnome-keyring
```

`bluedevil`, `plasma-nm`, and `plasma-pa` are Plasma *applets* and are dead
outside plasmashell. `pavucontrol` is already installed and covers audio.
Keep `polkit-kde-agent` — unlike the others it is a plain binary and works
standalone.

Two flags that are not optional, because the defaults are invisible under
Wayland: **`nm-applet --indicator`** and **`udiskie --appindicator`**. Both
default to `Gtk.StatusIcon`, which is XEmbed, which does not exist on Wayland.
`blueman` needs no flag — it grew a native SNI implementation in 2.3.

### Recommended

```sh
sudo pacman -S --needed mpc playerctl cliphist ddcutil swayosd satty
```

| Package | Why |
| --- | --- |
| `mpc` | Needed to port the `A-M` `*mpd-map*` to a Sway mode |
| `playerctl` | MPRIS media keys — remember `bindsym --locked` or they die under the lock screen |
| `cliphist` | Clipboard history; the consensus pick by a wide margin |
| `ddcutil` | Monitor brightness over DDC/CI. `brightnessctl` does nothing here — no backlight class on a desktop |
| `swayosd` | Volume/caps-lock OSD. Relevant because your keymap puts `Lock` on `<CAPS>` |
| `satty` | Screenshot annotation; more active than `swappy` |

### Optional

```sh
sudo pacman -S --needed waybar nwg-displays swayimg obs-studio wlsunset showmethekey
```

`obs-studio` is
the **correct screen recorder on NVIDIA** — `wf-recorder` has never supported
NVENC and `wl-screenrec` is VAAPI-only (§7.7). `showmethekey` replaces the dead
`wshowkeys`. Pick **one** of `wlsunset` or `gammastep`, never both (§7.10).

### AUR, opt in individually

You have `yay`. These are worth the exposure, in descending order:

| Package | Why |
| --- | --- |
| `sway-overfocus` | The two-tier frame/within-frame navigation split — the closest thing to a direct StumpWM translation (§2.1) |
| `swayr` | MRU switcher, mark-aware jump, and `toggle-tab-shuffle-tile-workspace`; replaces the hand-rolled window switcher |
| `i3-back` | `$mod+Tab` to last window via native marks. Sway has **no** built-in focus-last-window |
| `chayang` | Cancellable dim before lock — makes short OLED timeouts tolerable |

### Deliberately not installed

- **`swaylock-effects`** — broken on modern wlroots; the maintained fork carries an inherited PAM bug. §5.4.
- **`wofi`** — upstream's own page says it is not actively maintained. Use fuzzel.
- **`snixembed`** — proxies SNI→XEmbed, the *opposite* direction. It's a tool for your current StumpWM setup, not this one.
- **`wlrobs` / `obs-xdg-portal`** — legacy; OBS's built-in PipeWire source supersedes them.
- **`wl-clip-persist`** — **do not run it alongside `cliphist`.** One source recommended pairing them; two others independently report that they race, producing duplicate history entries and randomly-failing copies. `cliphist` already persists what it stores, so the pairing is redundant as well as harmful. Resolved against.
- **`rofi-wayland`** — obsolete since rofi 2.0 merged Wayland upstream. Your installed `rofi 2.0.0` is the real thing.
- **`brightnessctl`** — no backlight device on a desktop; see `ddcutil`.
- **`power-profiles-daemon`** — installed but dead weight on a desktop; safe to remove.
- **`emacs-wayland`** — see §7.1. It *conflicts* with `emacs`, so this is a decision, not an addition.

### Already present, no action needed

`sway 1.12`, `kanata 1.12.0`, `wev`, `ghostty`, `rofi 2.0.0`, `xorg-xwayland`,
`qt5-wayland`, `qt6-wayland`, `xdg-desktop-portal` + `-gtk`, `pipewire` +
`wireplumber`, `pavucontrol`, `polkit-kde-agent`, `dbus-broker` (the `uwsm`
prerequisite), `vulkan-icd-loader`, `jq`, `gamescope`, `noto-fonts-emoji`, the
Nerd Fonts collection, and `unscii`.

Also already present and worth knowing about: **`/usr/bin/xembedsniproxy`**,
which ships in `plasma-workspace`. It republishes XEmbed-only tray icons as SNI,
so any holdout app is covered at zero cost.

Every package name above was resolved against the live repos. Everything in the
non-AUR sections is in `extra`.

---

## 9. Rollback

| Phase reached | To revert |
| --- | --- |
| 0–5 | Nothing to revert; all changes are new files under `$HOME` |
| 6 | `rm /usr/local/share/wayland-sessions/sway-tay.desktop`; pick the X11 session at SDDM |
| Kanata unit edited | `git checkout` the unit, `systemctl --user daemon-reload` |
| mkinitcpio edited | Restore `MODULES=()`, `sudo mkinitcpio -P` |
| Everything | `stow -D -d ~/src/dotfiles -t ~ sway` |

The X11 + StumpWM session is never modified at any phase.
