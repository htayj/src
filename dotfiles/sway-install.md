# Sway — install list

Companion to [`sway-plan.md`](./sway-plan.md). Every package name was resolved
against the live repos on `basedserv`. Sections 1–4 are all in `extra`; section
5 is AUR (you have `yay`).

Revised after an ecosystem survey — several picks here reverse what an earlier
draft of the plan said. Where that happened it is called out, with the reason.

---

## 1. Required — core session

```sh
sudo pacman -S --needed \
    swaybg swayidle swaylock \
    grim slurp wl-clipboard \
    fuzzel mako waybar \
    sway-contrib kanshi autotiling \
    xdg-desktop-portal-wlr
```

| Package | What it is / what it replaces |
| --- | --- |
| `swaybg` | Sway shells out to this for `output bg`, even for a solid colour |
| `swayidle` | Idle → DPMS off. **Burn-in mitigation for the QD-OLED — required, not optional** |
| `swaylock` | Replaces `slock`. Uses `ext-session-lock-v1`, so the screen stays locked even if the locker crashes |
| `grim` | Screenshot capture |
| `slurp` | Region selection — together these replace `scrot -s` |
| `wl-clipboard` | `wl-copy` / `wl-paste`, replaces `xclip` |
| `fuzzel` | Launcher, replacing the native StumpWM `app-launcher` and keeping its most-recently-used ordering. **Also required as the screencast source chooser** — see the gotcha below |
| `waybar` | The status bar. **Reversal:** the plan first chose built-in `swaybar`. swaybar loads tray icons via gdk-pixbuf, and librsvg dropped its gdk-pixbuf loader upstream — so swaybar renders only PNG tray icons, and every current icon theme is SVG-only. udiskie's icon has no PNG anywhere and showed as a red frowny. waybar is GTK3 and renders it fine |
| `mako` | Notification daemon. **Reversal:** the plan first said to keep `dunst`. dunst is X11-native with Wayland bolted on — it silently falls back to X11, has no global hotkeys, and can't stack above the bar. Your `dunstrc` ports across almost line for line |
| `sway-contrib` | Ships `grimshot` (the standard screenshot wrapper), `grimpicker`, **and `sway-session.target`** — so you don't hand-write that unit |
| `kanshi` | The `autorandr` equivalent: declarative output profiles, reapplied on hotplug. Match on the full `"Make Model Serial"`, not `DP-1` |
| `autotiling` | **Reversal:** first listed as optional and "redundant with `default_orientation auto`". That was wrong — `default_orientation` is a one-shot per-workspace decision from the *monitor's* aspect ratio and never adapts. On a 32:9 panel autotiling is close to mandatory |
| `xdg-desktop-portal-wlr` | Screencast backend. Without it, browser screen-sharing silently offers no sources |

**The screencast chooser gotcha.** `xdg-desktop-portal-wlr` deliberately *skips*
"simple"-type choosers (i.e. `slurp`) whenever a request includes windows — and
Chrome, Firefox, and OBS all request monitors *and* windows. **With `slurp` as
your only chooser those requests fail outright.** So:

```ini
# ~/.config/xdg-desktop-portal-wlr/config
[screencast]
chooser_type=dmenu
chooser_cmd=fuzzel -d -l 10 -p 'Share: '
max_fps=60
```

**Version note:** Arch ships xdpw `0.8.2`, which is fine. **Skip `0.8.3`** when
it lands — its own release notes warn it stalls recording. Go to `0.8.4`+.

---

## 2. Required — desktop services replacing Plasma components

```sh
sudo pacman -S --needed blueman network-manager-applet udiskie gnome-keyring
```

You currently depend on Plasma applets for Bluetooth, network, and audio. Those
are plasmoids loaded by `plasmashell` — outside Plasma there is no shell to load
them, so they simply don't exist.

| Have now | Standalone? | Replace with |
| --- | --- | --- |
| `bluedevil` | **No** — plasmoid | `blueman` |
| `plasma-nm` | **No** — plasmoid | `nm-applet --indicator`, or just `nmtui` (you're wired) |
| `plasma-pa` | **No** — plasmoid | `pavucontrol` — already installed |
| `polkit-kde-agent` | **Yes** — plain binary | Keep it. Costs nothing, known-good |
| `kwallet` | Partially | `gnome-keyring`. KDE is itself migrating to Secret Service, so you'd be moving *with* the current. Export your wallets first |

**Two flags that are not optional.** Both of these default to `Gtk.StatusIcon`,
which is XEmbed, which does not exist on Wayland — so they start and are
invisible:

- `nm-applet --indicator`
- `udiskie --appindicator`

`blueman` needs no flag: it replaced libappindicator with a native
StatusNotifierItem implementation in 2.3, with explicit fixes for waybar's
dbusmenu.

**Already present:** `/usr/bin/xembedsniproxy` ships in `plasma-workspace`. It
republishes XEmbed-only tray icons as SNI, covering any holdout app for free.
Do **not** install `snixembed` — it proxies the opposite direction and is a tool
for your *current* StumpWM setup.

---

## 3. Recommended

```sh
sudo pacman -S --needed mpc playerctl cliphist ddcutil swayosd satty
```

| Package | Why |
| --- | --- |
| `mpc` | CLI control for mpd. waybar's `mpd` module talks to the daemon directly, so this is for scripting and the bar's click handlers |
| `playerctl` | MPRIS media keys. Bind them with `bindsym --locked` or they stop working the moment swaylock is up |
| `cliphist` | Clipboard history — the consensus pick by a wide margin over clipman and clipse |
| `ddcutil` | Monitor brightness over DDC/CI. A desktop has no backlight class, so `brightnessctl` does nothing — this is the working substitute for the G9 |
| `swayosd` | Volume and caps-lock OSD. Worth it specifically because your keymap puts `Lock` on `<CAPS>`. Lock-key detection needs its optional privileged libinput service |
| `satty` | Screenshot annotation. More active than `swappy`; both are in `extra` |

---

## 4. Optional

```sh
sudo pacman -S --needed nwg-displays swayimg obs-studio wlsunset showmethekey
```

| Package | Why you might want it |
| --- | --- |
| `nwg-displays` | GUI output arrangement. Use it to *discover* geometry, then let kanshi *own* it — don't run both as appliers, they write conflicting state |
| `swayimg` | Wayland-native image viewer. Replaces `feh`, which is X11-only and is still your handler for `image/png` in `mimeapps.list`. `imv` is the equally-good alternative |
| `obs-studio` | **The correct screen recorder on NVIDIA.** `wf-recorder` has never supported NVENC; `wl-screenrec` is VAAPI-only. Use OBS's built-in "Screen Capture (PipeWire)" source — not `wlrobs` or `obs-xdg-portal`, which are legacy |
| `wlsunset` | Night light. **Pick exactly one** of this or `gammastep` — the gamma protocol allows only one client and wlroots does not merge LUTs, so running both means one silently loses |
| `showmethekey` | Key display. Replaces `wshowkeys`, which is dead at both upstreams |

---

## 5. AUR — opt in individually

```sh
yay -S sway-overfocus swayr chayang
```

| Package | Version | Why it earns the AUR exposure |
| --- | --- | --- |
| `sway-overfocus` | v0.2.5 | Splits navigation into two disjoint command sets — one for moving *between* splits, one for cycling *within* tabs/stacks. That is exactly StumpWM's model, and the closest thing to a direct translation |
| `swayr` | 0.28.2 | Highest AUR vote count in the survey and on the official wiki. `toggle-tab-shuffle-tile-workspace` flips a workspace between tiled and framed with one key; `switch-to-mark-or-urgent-or-lru-window` is a mark-aware jump. Needs `swayrd` running |
| `chayang` | 0.1.0 | Cancellable dim as a grace period before the lock — makes the short idle timeouts you want for OLED tolerable |

**`i3-back` — wanted, but hold off.** The capability is real: sway has **no**
built-in focus-last-window, and i3-back maintains a `_back` mark so `$mod+Tab`
becomes a native sway command with no IPC on the hot path. But it is packaged
only as **`i3-back-bin`**, whose PKGBUILD has not been touched in roughly three
and a half years and carries 2 votes, while upstream moved on. Either build from
upstream directly, or get the same behaviour from `swayr`'s
`switch-to-urgent-or-lru-window`, which you are installing anyway. Revisit only
if swayr's version feels wrong.

---

## 6. Deliberately excluded

| Package | Why not |
| --- | --- |
| `swaylock-effects` | Broken on modern wlroots — still built against a removed protocol. The fork distros package is self-titled "unmaintained," and the only live descendant carries an inherited PAM bug where authentication *failure* reported success |
| `wofi` | Upstream's own page says it is not actively maintained. Use `fuzzel` |
| `snixembed` | Proxies SNI→XEmbed, the opposite direction. Tool for your current setup, not this one |
| `wlrobs`, `obs-xdg-portal` | Legacy; OBS's built-in PipeWire source supersedes both |
| `wl-clip-persist` | **Conflicts with `cliphist`** — they race, producing duplicate history entries and randomly-failing copies. `cliphist` already persists what it stores, so pairing them is redundant as well as harmful |
| `rofi-wayland` | Obsolete — Wayland support was merged into mainline `rofi` at 2.0.0, which is what you already have |
| `brightnessctl` | No backlight device on a desktop. Use `ddcutil` |
| `power-profiles-daemon` | Installed, but laptop-oriented and a no-op here. Safe to remove |
| `emacs-wayland` | **Conflicts with `emacs`** — you cannot hold both. A decision, not an addition. See plan §7.1 |
| `wf-recorder`, `wl-screenrec` | Neither can hardware-encode on NVIDIA |
| `yambar`, `eww`, `tofi` | Dead, stalled, or frozen |

---

## 7. Non-package steps

**Needs root, both optional and reversible:**

1. Confirm NVIDIA KMS (expected to already pass on 610; the parameter file is
   root-readable only):
   ```sh
   sudo cat /sys/module/nvidia_drm/parameters/modeset   # want: Y
   sudo cat /sys/module/nvidia_drm/parameters/fbdev     # want: Y
   ```
2. Early KMS — `/etc/mkinitcpio.conf` currently has `MODULES=()`. Setting
   `MODULES=(nvidia nvidia_modeset nvidia_uvm nvidia_drm)` plus
   `sudo mkinitcpio -P` gives a cleaner boot and more reliable VT handoff. The
   only step touching boot config; skip it if you'd rather not.

A third comes at plan Phase 6: a session file at
`/usr/local/share/wayland-sessions/sway-tay.desktop` so SDDM offers Sway.
Deleting that one file fully reverts the integration.

**Config-only, no packages:**

- `zellij/config.kdl:400` hardcodes `copy_command "xclip -selection clipboard"`
  (the `wl-copy` variant is commented out one line above). Since that config is
  shared with the StumpWM session, use a small wrapper that dispatches on
  `$WAYLAND_DISPLAY` rather than flipping the line.
- `mimeapps.list` sets `feh` as the `image/png` handler in two places. `feh` is
  X11-only.
- `.xinitrc` starts `gnome-keyring-daemon` with `--components=...,ssh`. That
  branch is doubly dead: the package isn't installed, and since gnome-keyring
  1:46 the ssh component is disabled by default anyway (it moved to
  `gcr-ssh-agent` in `gcr-4`). Delete rather than port.
- No Chromium/Electron flags files exist yet, so Wayland-native Ozone hints for
  Chromium and Slack are greenfield.
