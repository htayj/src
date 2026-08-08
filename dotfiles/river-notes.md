# river — test results and session notes

Companion to [`sway-plan.md`](./sway-plan.md). Covers the `river` stow package.

All seven window managers below were **built and run**, each under a nested river
1.12/0.4.6 instance with the real Space Cadet keymap, and screenshotted. See
[`river-wms.png`](./river-wms.png).

---

## 1. The two things that make river work here

### 1.1 The keymap, solved

river ships **only** `/usr/bin/river` — no `riverctl`, no `rivertile`, no bundled
WM. Keyboard layout is therefore river's job (via libxkbcommon), not the WM's,
and river calls `xkb_keymap_new_from_names()` with NULL names — which means
`XKB_DEFAULT_*` is the whole interface.

That was a problem, because the Space Cadet map declares **two groups** (base +
the Top/math layer), and XKB assigns one layout per group. libxkbcommon refused
it outright:

```
For the map base the explicit group 1 is specified, but key <AB01> has more
than one group defined; All groups except first one will be ignored
ERROR: Failed to compile xkb_symbols
```

Fixed in the `manna-cadet` submodule by restructuring `symbols/spacecadet` into
three maps:

| map | contents |
| --- | --- |
| `g1` | group-1 symbols, the F-keys, the command keysyms, `replace`/`override` modifier keys, and the `modifier_map` |
| `top` | the Top/math layer, expressed as its **own** group 1 |
| `base` | `include "spacecadet(g1)"` + `include "spacecadet(top):2"` |

Moving the group assignment onto the **include** (`:2`) instead of onto each key
sidesteps the conflict entirely, so `XKB_DEFAULT_LAYOUT=spacecadet` now works.

Two separate fixes were needed in `rules/{evdev,base}` as well:

- **Dropped the `pc+` prefix.** `pc` installs its own `modifier_map` entries that
  override spacecadet's. It compiles with *no error* but leaves
  `modifier_map Mod4` **empty**, so the WM modifier binds to nothing:
  ```
  inet(evdev)+spacecadet(base)     -> modifier_map Mod4 { <RALT> }
  pc+inet(evdev)+spacecadet(base)  -> modifier_map Mod4 { }
  ```
- Added `layout[1..4]` indexed stanzas so multi-layout requests resolve.

**Verified, four ways:**

| route | result |
| --- | --- |
| keymap file (X11 / sway `xkb_file`) | byte-identical to the pre-refactor golden |
| `XKB_DEFAULT_LAYOUT=spacecadet` | identical content |
| stock `us` | works |
| stock `us,de` | works |

And empirically against river itself: `XKB_DEFAULT_LAYOUT=zzznotreal` makes river
**exit 1** with an xkbcommon error, while `spacecadet` produces a log identical
to `us`. So river genuinely reads it and accepts the keymap.

Net effect: **`Mod4` is `<RALT>` — hold either big thumb key** — so any WM whose
default modifier is Mod4/Super/Logo lands on your thumb with no config edits.

### 1.2 Layer shell works under all seven

river gates layer surfaces on the window manager: if the WM does not bind
`river_layer_shell_v1`, river logs *"window manager did not bind
river_layer_shell_v1, closing layer surface"* and kills it. That would break
waybar, mako, swaybg and fuzzel.

Tested with `swaybg -c '#aa5500'` under each WM — **zero rejections across all
seven**, and the background renders. So the whole QoL stack is safe to use.

---

## 2. Test results

Every WM built and ran. Nested river, headless backend, pixman renderer, two
ghostty windows.

| WM | Build | Result | Character |
| --- | --- | --- | --- |
| **kwm** | zig 0.16 | works | **Built-in bar** — dwm tags 1-9, layout indicator, title, status. Amber focus border. Most complete out of the box |
| **triad** | nimble | works | Ships an **"Important Hotkeys" overlay**. Richest UI of the set |
| **rhine** | pkg | works | BSP tiling, blue focus border, animations, gaps |
| **ashrwm** | zig 0.16 | works | Master-stack, white borders, Janet config |
| **rrwm** | cargo +nightly | works | No decorations, clean columns |
| **rill** | zig 0.16 | works | No decorations, minimal scrolling |
| **canoe** | pkg | works | Motif/CDE stacking — title bars, teal desktop. The odd one out, deliberately |

Build notes:

- `rustup` is installed with **no default toolchain**, so `cargo` fails outright.
  `cargo +nightly` works (a nightly toolchain is present). Either use `+nightly`
  or run `rustup default stable`.
- `triad` pulls several git dependencies via nimble; the first build is slow.
- kwm, ashrwm and rill all build clean against the packaged zig 0.16.

---

## 3. Modifier bindings

### 3.1 "Super" already means your thumb

An earlier draft of this file claimed these WMs' "Super" is Mod3 (homerow
`a`/`;`). **That was wrong**, and it matters, so here is the proof from the
headers:

```c
/usr/include/xkbcommon/xkbcommon-names.h
  #define XKB_MOD_NAME_ALT   "Mod1"
  #define XKB_MOD_NAME_LOGO  "Mod4"

/usr/include/wlroots-0.20/wlr/types/wlr_keyboard.h
  WLR_MODIFIER_ALT  = 1 << 3,   /* real modifier index 3 = Mod1 */
  WLR_MODIFIER_LOGO = 1 << 6,   /* real modifier index 6 = Mod4 */
```

The confusion was between the **keysym** `Super_L` (which this keymap puts on
`<LWIN>`, in `modifier_map Mod3`) and the **modifier name** "Super"/"Logo",
which is defined as Mod4. Window managers match on the modifier *mask*, not the
keysym. So:

| WM config says | real modifier | physical key here |
| --- | --- | --- |
| `Super` / `Logo` / `Mod4` | Mod4 | **either big thumb key** |
| `Alt` / `Mod1` | Mod1 | homerow `s`/`l` — **Emacs Meta** |

So `Super` bindings were already landing on the thumb. Only `Alt`/`Mod1`
bindings needed moving.

### 3.2 What was actually rebound

| WM | Before | After |
| --- | --- | --- |
| kwm, rhine, ashrwm, canoe | already Mod4 | untouched |
| **rill** | 48× `mod4`, **zero** `mod1` in source | untouched — the earlier "mixes mod4 and mod1" count came from docs, not bindings |
| **rrwm** | defaults hardcoded to `Modifiers::Mod1` (`src/config.rs`) | `~/.config/river/rrwm.toml` re-declares them under `[keybindings.super]` |
| **triad** | 9 bare `Alt+…` bindings | `~/.config/triad/config.kdl` moves all 9 to `Super+…` |

triad's nine were `Alt+Left/Right/Up/Down` (focus), `Alt+grave` and
`Alt+Shift+grave` (recent-window), `Alt+Print` (screenshot-window), and
`Alt+Tab`/`Alt+Shift+Tab` (recent-window). Three needed new homes because the
obvious target was taken:

- `Alt+Print` → `Super+Shift+Print` (`Super+Print` is already screenshot-to-clipboard)
- `Alt+Tab` → `Super+Shift+Tab` (`Super+Tab` is already focus-next)
- `Alt+Shift+Tab` → `Super+Ctrl+Tab`

Everything else moved straight across. Verified: **no bare `Alt+` binding
remains** in triad's config, and rrwm logs no "No keybindings found, loading
defaults" (which would mean the TOML was ignored).

Note triad still has nine `Super+Alt+…` combos. Those are fine — they need thumb
*and* homerow held together, so they never collide with bare Meta in Emacs.
Reach them by holding the mirrored Meta on `l`.

---

## 4. What the session adds

`~/.config/river/init` is deliberately **not** a theming layer. Each WM keeps its
own look and key bindings — kwm's bar, canoe's Motif chrome, rhine's animations
are the point of trying them. The init only fills gaps that *no* river WM
provides:

| Gap | Filled with |
| --- | --- |
| Keymap | `XKB_DEFAULT_LAYOUT=spacecadet` (§1.1) |
| systemd/dbus env | `import-environment` + `dbus-update-activation-environment` — river ships no equivalent of Arch's sway drop-in, and without it the tray is empty and portals never start |
| Notifications | `mako` |
| Idle / lock / DPMS | `swayidle` + `swaylock` + `wlopm` — the only OLED burn-in mitigation available |
| Clipboard history | `cliphist` (**not** alongside `wl-clip-persist` — they race) |
| Polkit | `polkit-kde-agent` |
| Volume/caps OSD | `swayosd-server` (bindings still belong to the WM) |
| Tray applets | `blueman-applet`, `nm-applet --indicator`, `udiskie --appindicator` — the flags are required or they start invisible |
| **Output geometry** | **`kanshi`** — river has NO output config of its own (no modes, no positions, no scale) and neither does any of these WMs. `river(1)` says so directly: *"kanshi(1) could be started to manage output configuration"*. Without it the G9 comes up at its **preferred 120 Hz**, not 240 |
| Background | `swaybg`, skipped under kwm which paints its own |
| Bar | `waybar`, skipped under kwm which has one. Disable with `touch ~/.config/river/no-bar` |
| Terminal | `TERMINAL=ghostty` — every one of these WMs defaults to foot, kitty or alacritty, none of which is installed |

Three per-WM config files, each a copy of that WM's **own defaults** with only
the broken bits changed — no theming:

| File | Changes |
| --- | --- |
| `~/.config/kwm/config.zon` | 4 lines: `foot`→`ghostty`, `wmenu-run`→`fuzzel` |
| `~/.config/triad/config.kdl` | 9 bare-`Alt` bindings → `Super`, plus `alacritty`→`ghostty` in a window rule |
| `~/.config/river/rrwm.toml` | rrwm's own 6 defaults re-declared on Mod4, `kitty`→`ghostty`, plus a launcher binding it lacked |

And one waybar config, because waybar otherwise falls back to
`/etc/xdg/waybar/config.jsonc` whose sway modules are dead on river
(`module sway/workspaces: Disabling module, Socket path is empty`). Note
waybar's `river/tags` and `river/mode` modules speak river **0.3's** status
protocol, which 0.4 removed — so tag display has to come from the WM's own bar.

Switching WM is one command:

```sh
river-wm            # list, with the current one starred
river-wm rhine      # select
```

Reusable from the sway package: `sway-screenshot`, `sway-web-prompt`,
`sway-ssh-prompt`, `sway-web-search`, `clip-copy` — all generic wlroots tools.
`sway-window-switcher` and `sway-keymap-picker` are **not** reusable; they depend
on `swaymsg`, and river has no IPC.

---

## 5. Launching it

**Do not use the packaged `/usr/share/wayland-sessions/river.desktop`.** It runs
`river` directly, which means no `XKB_DEFAULT_LAYOUT`, which means the Space
Cadet keymap never loads and Mod4 is not your thumb.

The reason is a startup-ordering trap worth stating plainly: **river builds its
xkb keymap before it runs `~/.config/river/init`**, so exporting `XKB_DEFAULT_*`
from init is too late and fails *silently*. Measured:

| where the var is set | bogus layout `zzznotreal` |
| --- | --- |
| exported inside `~/.config/river/init` | river runs fine, **no error at all** |
| exported by the parent process | river **exits 1** with an xkbcommon error |

So the keymap lives in `~/.local/bin/river-session`, and the session entries
point at that. Install them all (the only step needing root):

```sh
sudo ~/src/dotfiles/system/install-wayland-sessions.sh
```

SDDM scans `/usr/local/share/wayland-sessions` before `/usr/share`, so these
appear alongside the packaged entries without replacing them.

### Two ways to choose a window manager

Both work; they compose rather than conflict.

**Per-WM session entries** — one SDDM menu item each, best while trying things:

| Menu entry | Runs |
| --- | --- |
| River: kwm | `river-session kwm` |
| River: rhine | `river-session rhine` |
| River: triad, ashrwm, rrwm, rill, canoe | likewise |

**The persistent default** — "River (tay)" uses `~/.config/river/wm`, set with
`river-wm <name>`. Best once you have settled on one.

Precedence is `$RIVER_WM` (set by the per-WM entries) → `~/.config/river/wm` →
`kwm`, so picking "River: canoe" for one session does not disturb your default.

There is no upstream convention for this — river's `-c` flag and per-session
entries are both legitimate, and river ships no WM of its own to have an opinion
about.

**Do not pick the packaged "River" or "Sway"** — they exec the compositor
directly and skip the wrapper, so the keymap never loads.

Note `desktop-file-validate` complains that `DesktopNames` "should start with
X-" on these files. It says the same about the shipped `sway.desktop`,
`plasma.desktop` and `xfce-wayland.desktop` — the key is standard for *session*
entries and the validator only knows about *application* entries. Not a problem.

The wrapper also runs river under `systemd-cat --identifier=river`, so the whole
session logs to the journal:

```sh
journalctl --user -t river -b
```

Switching window manager does **not** need a session restart to configure, just
a river restart to apply:

```sh
river-wm            # list, current one starred
river-wm rhine      # select
```

## 6. Monitor layout

Not a kwm setting — kwm has no output configuration at all, and neither do the
other six. This is river's layer, and river delegates it to **kanshi**.

The config lives in the **shared `config` stow package** (`~/.config/kanshi/config`)
rather than in `river` or `sway`, because monitor geometry belongs to the
hardware. It reproduces `x11/.screenlayout/g9andcrt.sh`:

```
profile g9andcrt {
    output DP-1     mode 5120x1440@240Hz position 0,0       scale 1
    output HDMI-A-1 mode 800x600         position 4200,1440 scale 1
}
```

Plus `g9` (G9 alone) and `crtonly` fallbacks, so unplugging still gives a
sensible layout.

**river starts kanshi; sway does not.** Under sway, `sway/host-basedserv.conf`
owns output state and kanshi would fight it — whichever ran last wins, and they
can ping-pong. Exactly one thing must own it. Under river there is no
competitor, so kanshi is the sole owner and there is nothing to conflict with.

**The refresh rate matters more than it looks.** The G9's EDID advertises three
5120x1440 modes — 239.999110, 119.978835 and 59.999500 Hz — and the
**preferred** one is 120 Hz. A bare `mode 5120x1440` would therefore silently
give you half rate. Whether kanshi rounds `240Hz` to `239.999110Hz` or demands
an exact match could not be verified without the real display; if the G9 comes
up at 120 Hz, put the exact value in. kanshi logs `doesn't support mode ...`
when it rejects one, so this fails loudly.

## 7. Still to install

```sh
sudo pacman -S --needed wlr-randr
```

`wlr-randr` lists each output's true modes and refresh rates in a live session —
the fastest way to confirm the G9 negotiated 240 Hz and not its preferred 120.

`wlopm` (already installed) drives `wlr-output-power-management` for the
swayidle DPMS-off step; river has no `swaymsg output * power off` equivalent.
