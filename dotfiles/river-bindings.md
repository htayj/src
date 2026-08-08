# river window managers — key bindings

Companion to [`river-notes.md`](./river-notes.md).

## Mod4 is your thumb

Every binding below uses **`Mod4`**, which on this keymap is `<RALT>` — produced
by **holding either big thumb key** (kanata's `@Hro` / `@Hsp`, which tap as
Backspace and Space).

Some of these WMs spell that modifier `Super` or `Logo` in their configs. Those
are **aliases for the same bit**, not the physical Super key. From triad's own
parser (`src/config/parser.nim`):

```nim
of "Alt", "Mod1", "alt", "mod1", ...:                8'u32   # 1<<3 = Mod1
of "Mod3", "mod3", "MOD3":                          32'u32   # 1<<5 = Mod3
of "Super", "Logo", "Mod4", "super", "logo", "mod4": 64'u32  # 1<<6 = Mod4
```

and rrwm's (`src/wm/binds.rs`):

```rust
"super" | "mod4" | "logo" => mask |= Modifiers::Mod4,
```

The physical Super key (`<LWIN>`) is on **Mod3** here, and nothing binds it.
All configs in this package have been rewritten to say `Mod4` explicitly so the
name can never mislead.

For contrast: **`Mod1` is Emacs Meta** (homerow `s`/`l` hold). Nothing binds it.

---

## kwm — *the default; dwm-style, built-in bar*

| Binding | Action |
| --- | --- |
| **`Mod4+Shift+Return`** | **terminal** (ghostty) |
| **`Mod4+p`** | **launcher** (fuzzel) |
| `Mod4+Shift+c` | close window |
| `Mod4+Shift+q` | quit kwm |
| `Mod4+j` / `Mod4+k` | focus next / previous |
| `Mod4+Shift+j` / `Mod4+Shift+k` | swap window down / up |
| `Mod4+Return` | zoom (promote to master) |
| `Mod4+h` / `Mod4+l` | shrink / grow master area |
| `Mod4+1`…`Mod4+9`, `Mod4+0` | view tag |
| `Mod4+Shift+1`… | move window to tag |
| `Mod4+Ctrl+1`… | toggle tag visibility |
| `Mod4+Tab` | previous tag |
| `Mod4+f` `t` `g` `d` `m` `s` `u` | switch layout |
| `Mod4+space` | previous layout |
| `Mod4+b` | toggle the bar |
| `Mod4+Shift+f` / `Mod4+Shift+m` | toggle fullscreen |
| `Mod4+Shift+e` | toggle maximize |
| `Mod4+comma` / `Mod4+period` | focus previous / next output |
| `Mod4+Ctrl+f` | floating mode (then `Mod4+hjkl` moves, `+Ctrl` resizes, `+Shift` snaps) |
| `Mod4+Shift+Escape` | passthrough mode (Escape again to leave) |
| `Mod4+Shift+r` | reload config |

## rill — *minimal scrolling*

| Binding | Action |
| --- | --- |
| **`Mod4+t`** | **terminal** (ghostty) |
| **`Mod4+p`** | **launcher** (fuzzel) — added; rill ships none |
| `Mod4+q` | close window |
| `Mod4+Left` / `Mod4+Right` | focus window left / right |
| `Mod4+Shift+Left/Right` | move window left / right |
| `Mod4+Up` / `Mod4+Down` | focus workspace above / below |
| `Mod4+Shift+Up/Down` | move window to workspace above / below |
| `Mod4+1`…`Mod4+0` | focus workspace |
| `Mod4+Shift+1`… | move window to workspace |
| `Mod4+grave` | previous workspace |
| `Mod4+f` | toggle fullscreen |
| `Mod4+v` | toggle workspace floating |
| `Mod4+minus` / `Mod4+equal` | shrink / grow window width by 0.1 |
| `Mod4+BackSpace` | set width to 0.5 |
| `Mod4+h/l/k/j` | focus output left/right/up/down |
| `Mod4+Shift+h/l/k/j` | move window to output |
| `Mod4+Escape` | exit river |
| `Mod4+r` | reload config |

## canoe — *Motif/CDE stacking*

| Binding | Action |
| --- | --- |
| **`Mod4+Shift+Return`** | **terminal** — see the caveat below |
| **`Mod4+Space`** | **launcher** (fuzzel) |
| `Mod4+w` | close focused window |
| `Mod4+l` | lock screen (swaylock) |
| `Mod4+Tab` / `Mod4+Shift+Tab` | focus next / previous window |
| ``Mod4+` `` | focus next window of the same app |
| `Mod4+Enter` | toggle fullscreen |
| `Mod4+Up` | maximize |
| `Mod4+Down` | unmaximize, else minimize |
| `Mod4+h` / `Mod4+m` | minimize |
| `Mod4+Left` / `Mod4+Right` | snap to left / right half |
| `Mod4+Drag` | move / resize |

**Caveat:** canoe hardcodes `foot` as its terminal, ships no config file, and
does not read `$TERMINAL`. Until `foot` is installed, `Mod4+Shift+Return` does
nothing under canoe. See §Fixes.

## ashrwm — *master-stack, Janet config*

| Binding | Action |
| --- | --- |
| **`Mod4+Return`** | **terminal** — hardcoded `foot`, same caveat as canoe |
| **`Mod4+l`** | **launcher** (fuzzel) |
| `Mod4+Mod1+u` | close window |
| `Mod4+e` / `Mod4+a` | focus previous / next |
| `Mod4+h` / `Mod4+i` | focus output |
| `Mod4+k` | zoom |
| `Mod4+z` | swap with main |
| `Mod4+t` | toggle fullscreen |
| `Mod4+Mod1+t` | toggle floating |
| `Mod4+d` | toggle sticky |
| `Mod4+z` / `Mod4+x` / `Mod4+s` | layout tile / grid / scroller |
| `Mod4+r` | reload config |

Note `Mod4+Mod1+…` needs thumb **and** homerow held — use the mirrored Meta on
`l` for the Mod1 half.

## rrwm — *undecorated columns*

Config is ours (`~/.config/river/rrwm.toml`); rrwm's own defaults were on Mod1.
Key layout is rrwm's Colemak-ish `n/i/u/e`, kept as designed.

| Binding | Action |
| --- | --- |
| **`Mod4+Return`** | **terminal** (ghostty) |
| **`Mod4+space`** | **launcher** (fuzzel) — added; rrwm ships none |
| `Mod4+q` | close focused |
| `Mod4+n` / `Mod4+i` | focus left / right |
| `Mod4+u` / `Mod4+e` | focus up / down |

## triad — *multi-paradigm, hotkey overlay*

| Binding | Action |
| --- | --- |
| **`Mod4+t`** | **terminal** (`$TERMINAL` → ghostty) |
| `Mod4+?` | **show the hotkey overlay** — triad documents itself |
| `Mod4+q` | close window |
| `Mod4+Left/Right/Up/Down` | focus (moved off `Alt`) |
| `Mod4+Shift+Tab` / `Mod4+Ctrl+Tab` | recent window next / previous |
| `Mod4+grave` / `Mod4+Shift+grave` | recent window, same app |
| `Mod4+f` | maximize to edges |
| `Mod4+Shift+f` | fullscreen |
| `Mod4+m` | maximize column |
| `Mod4+n` | switch layout |
| `Mod4+Mod1+1`…`5` | scroller / notion / dwindle / grid / center-tile |
| `Mod4+s` | move to scratchpad |
| `Mod4+Mod1+s` | toggle scratchpad |
| `Mod4+Shift+b` / `Mod4+Mod1+b` | minimize / restore |
| `Mod4+1`…`4` | focus workspace |
| `Mod4+e` `s` `w` | i3 layout: toggle-split / stacking / tabbed |
| `Mod4+Print` | screenshot to clipboard |
| `Mod4+Shift+Print` | screenshot window |
| `Ctrl+Mod1+Delete` | exit triad |

## rhine — *BSP; bindings currently NOT active*

**rhine cannot load a config file at all**, including its own shipped example
copied verbatim to `$XDG_CONFIG_HOME/rhine/config.rh`:

```
error(main): couldn't load config file, falling back to minimal
```

Verified against `/usr/share/rhine/config.rh` unmodified, so this is an upstream
mismatch between the shipped example and rhine 0.3.0 — not caused by our edits.
It runs its built-in *minimal* defaults, which are not documented and which I
could not enumerate.

The table below is what `/usr/share/rhine/config.rh` **would** give if it
loaded. Treat it as aspirational until the config issue is resolved upstream.

| Binding | Action (when the config loads) |
| --- | --- |
| `Mod4+Return` | terminal | 
| `Mod4+d` | launcher (fuzzel) |
| `Mod4+q` | close |
| `Mod4+m` | exit |
| `Mod4+h/j/k/l` and arrows | focus |
| `Mod4+Shift+h/j/k/l` | move window |
| `Mod4+1`…`0` | focus workspace |
| `Mod4+Shift+1`… | move to workspace |
| `Mod4+f` | fullscreen |
| `Mod4+v` | toggle floating |
| `Mod4+s` | bsp change split |
| `Mod4+Tab` | previous workspace |

---

## How to exit

| WM | Exit binding |
| --- | --- |
| kwm | `Mod4+Shift+q` |
| rill | `Mod4+Escape` |
| triad | `Ctrl+Mod1+Delete` |
| ashrwm | `Mod4+Mod1+Shift+Ctrl+BackSpace` — see the trap below |
| rhine | `Mod4+m` *(unverified — rhine's config does not load)* |
| **canoe** | **none — no exit binding exists** |
| **rrwm** | **none — only `exit_resize_mode`, which leaves a mode, not the session** |

river adds no exit binding of its own. Its only built-in bindings are
`Ctrl+Alt+F1`–`F12` (VT switch), and window managers **cannot override those** —
which makes them the guaranteed escape hatch from any state.

**Universal exit**, works under every WM including canoe and rrwm:

```sh
river-exit
```

Run it from any terminal in the session. It signals river, and per `river(1)`
*"On exit, river will send SIGTERM to this process group"* — so the init script
and every daemon it started are torn down with it. Verified: killing river under
canoe took canoe down with it.

If you have no terminal open and the WM has no exit binding, press
`Ctrl+Alt+F2`, log in on the TTY, and run `river-exit` (or `pkill -x river`).

**The ashrwm trap.** Its exit is `Mod4+Mod1+Shift+Ctrl+BackSpace`, and on this
keymap `BackSpace` **is the left thumb key** — the same key that produces Mod4.
You cannot hold and tap it at once. Use the **right** thumb for Mod4 and tap the
**left** thumb for BackSpace, with Mod1 on the mirrored homerow `l`. Five keys;
`river-exit` is easier.

---

## Fixes applied, and one still needed

Every one of these WMs ships a terminal binding pointing at software that is not
installed — `foot`, `kitty` or `alacritty`. Fixed where the WM is configurable:

| WM | Default | Now |
| --- | --- | --- |
| kwm | foot | ghostty (config) |
| rill | alacritty | ghostty (config) |
| rrwm | kitty | ghostty (config) |
| triad | probes a list | ghostty (via `$TERMINAL`) |
| rhine | foot | ghostty *(config written, but rhine can't load it)* |
| **canoe** | **foot** | **not configurable — ships no config file** |
| **ashrwm** | **foot** | example config is upstream's; ours not yet written |

To make canoe's and ashrwm's terminal bindings work, install the terminal they
assume:

```sh
sudo pacman -S --needed foot
```

`foot` is tiny, Wayland-native, and by the same author as fuzzel — it is the
default this whole ecosystem is written against.
