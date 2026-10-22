# Basedbox deployment and hardware acceptance

Use this runbook with `/home/tay/src/config-k8-plus.scm`. The GMKtec K8 Plus is already installed. Do not repartition or format it.
## LAN Guix substitutes — source prepared 2026-10-18

`/home/tay/src/config-k8-plus.scm` now declares `http://192.168.7.140`
before Nonguix and the official substitute URLs. It adds only the public key
in `guix-config/guix-substitutes.pub`, retaining all existing authorized keys.
Exact public-file SHA256:
`89c32e63068356480cb8d30f02e28df30c47cf9c4501f2237d08a16adc5b47f9`.

This is **not activated**: noninteractive sudo required a password, so no
system reconfigure, daemon restart, or live ACL modification was performed.
The Guix reader parsed all 21 configuration forms successfully. The exact
prechange configuration is retained at
`/home/tay/src/config-k8-plus.scm.guix-substitutes-prechange-20261018`.

Activate only through a reviewed, channel-pinned system reconfigure with
administrative authentication; preserve an administrative recovery session
and the existing ACL first. Do not run the broader deferred-admin script just
to activate substitutes. Roll back both the URL and key declaration together;
restoring source alone does not revoke an already authorized live key.

Server deployment and verification are recorded in the kube repository's
`docs/runbooks/guix-substitutes.md`; source presence here does not establish
server availability or complete package coverage.

## Hardware and firmware map

The system configuration supplies Nonguix `linux`, `microcode-initrd`, and `linux-firmware` for these devices:

| Hardware | Linux support to verify |
| --- | --- |
| Ryzen 7 8845HS | AMD CPU microcode loaded by `microcode-initrd` |
| Radeon 780M | `amdgpu` kernel driver and Mesa renderer |
| MediaTek MT7922 Wi-Fi | `mt7921e` plus firmware |
| MediaTek MT7922 Bluetooth | `btusb`, `btmtk`, BlueZ, and firmware |
| Dual Intel I226-V Ethernet | `igc` kernel driver |
| USB4 ports | kernel USB, Type-C, and `thunderbolt` support |

## Verified installed layout

The installation uses one Btrfs filesystem for `/`, including `/home` and `/gnu/store`. Preserve this layout:

| Mount or use | Filesystem | UUID |
| --- | --- | --- |
| `/` | Btrfs | `b19ca7a2-0762-4d14-91fd-484dbd9d7ee9` |
| `/boot/efi` | FAT32 | `521A-DCFF` |
| swap | Linux swap | `d23519bc-ece4-4a0d-b4db-224d6e2c6f58` |

Confirm that the live system still matches before reconfiguration:

```sh
findmnt --target /
findmnt --target /boot/efi
swapon --show
lsblk -f
test -d /sys/firmware/efi && echo "UEFI boot confirmed"
```

Do not continue if these UUIDs differ from `config-k8-plus.scm`.

## Deferred privileged completion

Run the bounded administrative script after reviewing its `--check` output:

```sh
~/src/guix-config/deferred-basedbox-admin.sh --check
~/src/guix-config/deferred-basedbox-admin.sh
```

It reconfigures the pending `input` group membership, archives and disables
the Microsoft EFI loader, removes only the matching Windows NVRAM entry, and
records before/after evidence under `~/basedbox-admin-<timestamp>/`. Log out
and back in, or reboot, afterward so Kanata inherits the new group.

## Stage and validate

Copy `config-k8-plus.scm` and the complete `guix-config` directory to `/home/tay/src` on `basedbox`. Install the shared channel configuration for `tay`:

Before pulling channels, verify the existing store. If this reports modified paths, repair them as root before continuing:

```sh
guix gc --verify=contents
sudo guix gc --verify=repair,contents
guix gc --verify=contents
```

The final verification must report no modified paths. Do not build or activate a system generation against a corrupt store.

```sh
mkdir -p ~/.config/guix
cp ~/src/guix-config/channels.scm ~/.config/guix/channels.scm
guix pull -C ~/.config/guix/channels.scm
hash guix
guix describe
```

Evaluate both configurations before activating either one:

```sh
guix system build --dry-run ~/src/config-k8-plus.scm
guix home build --dry-run ~/src/guix-config/home-workstation-configuration.scm
```

Both commands must evaluate successfully before activation.

## Activate Guix Home

Authorize Nonguix substitutes before applying Home. This imperative command replaces the managed `/etc/guix/acl` symlink temporarily; the subsequent System reconfiguration restores it declaratively with the same key plus `%default-authorized-guix-keys`:

```sh
sudo ~/.config/guix/current/bin/guix archive --authorize <<'EOF'
(public-key
 (ecc
  (curve Ed25519)
  (q #C1FD53E5D4CE971933EC50C9F307AE2171A2D3B52C804642A7A35F84F3A4EA98#)))
EOF
```

Apply the shared Home configuration as `tay`, explicitly including Nonguix until the System configuration has activated its daemon settings:

```sh
guix home reconfigure \
  --substitute-urls="https://substitutes.nonguix.org https://bordeaux.guix.gnu.org https://ci.guix.gnu.org" \
  ~/src/guix-config/home-workstation-configuration.scm
```

The workstation Home configuration extends the tested core profile. Codex is
installed separately with npm and is not built from source by Guix Home.

## Activate the system

Use the same pinned Guix profile that evaluated the Home configuration.  The
profile contains immutable store links, so root can execute it directly; a
second root-owned pull is unnecessary.  Re-evaluate, activate the generation,
and reboot:

```sh
sudo ~/.config/guix/current/bin/guix system build --dry-run \
  /home/tay/src/config-k8-plus.scm
sudo ~/.config/guix/current/bin/guix system reconfigure \
  /home/tay/src/config-k8-plus.scm
sync
sudo reboot
```

After bootstrap, use `rbs` for System reconfiguration and `rbh` for Home.
Both functions explicitly use `~/.config/guix/current/bin/guix`, avoiding
sudo's restricted PATH and eliminating the need for `guix time-machine`.

They are shell functions defined in `dotfiles/home/.bashrc.d/host-basedbox`,
which `~/.bashrc` sources only when `$HOSTNAME` is `basedbox`, so they are
not available on other hosts and are not visible to non-interactive shells.
`rbs` targets `~/src/config-k8-plus.scm` and `rbh` targets
`home-workstation-configuration.scm`; neither needs `--allow-downgrades`
while the pulled channels are at or ahead of the running generation.

## Hyprland workspace layouts (2026-09-30; layout card and dualmaster updated 2026-10-02)

The live-linked config keeps `dwindle` as its default and loads the matched
`hy3` and `hyprland-dualmaster` plugins from
`$HOME/.guix-profile/lib/hyprland/libhy3.so` and
`$HOME/.guix-profile/lib/hyprland/libdualmaster.so`. Built-in scrolling uses
one-third-width columns (cycling through thirds, halves, two-thirds and full
width); master retains its centered main pane with a 0.5 size factor.

Press **Right Alt+Y**, release Alt, then **D** (dwindle), **M** (unchanged
centered master), **W** (dual centered masters), **S** (scrolling), or **H**
(hy3). Escape cancels. The helper
`~/.config/hypr/layout-controls.py` changes only the focused workspace,
including named/special workspace selectors. Choices last until config
reload or session restart; these shortcuts do not rewrite the default.
Right Alt+H/J/K/L and Shift variants use hy3's navigation when appropriate.
Right Alt+Shift+X/Z cycle scrolling column widths; Right Alt+Shift+M swaps
with master. The Alt+Y prefix also exposes hy3 group actions:
T new tab group, V horizontal split, B vertical split, U toggle existing
group tabs, K/J focus parent/child, E equalize. Alt+? lists live bindings.

**W / dualmaster** assigns the first two tiled windows to side-by-side masters
sharing an adjustable centered region: **60% of usable width by default**,
30% per master. Remaining windows alternate between left/right 20%-width
slave columns, stacked vertically on each side. One window occupies the
current combined centered width. Two masters reserve the side columns even
without slaves; removing a primary promotes the next tiled window. **M**
remains the built-in half-width centered master; **W** is runtime-only.

**Right Alt+right-button drag** uses the unchanged `resizewindow` binding and
built-in master mouse semantics: corner/side-aware direction, smart-resizing
scaling, 5%–95% combined-width clamp and vertical slave sizing. Horizontal
dragging resizes both masters together, preserving equal masters and symmetric
sides. Width is per-workspace runtime state, reset when its layout is recreated
or configuration reloads; it is not persisted in the config.

Alt+Y now opens `~/.config/hypr/layout-help.qml`, a persistent layout card
themed from the live Caelestia scheme, instead of a brief notification.
`layout-controls.py` populates its choices from current `layouts` bindings
and waits for the card to map before entering that submap. It has no display
timeout: a selection/action, Escape, an external submap reset/change, or a
config reload closes it. Invalid keys leave it visible. Reload also resets
the active `layouts` submap; repeated invocation retains the existing card.
The overlay takes no keyboard focus or mouse input: Hyprland owns the
bindings, and pointer input passes through to the desktop.

**Home snapshot helper-path repair, 2026-10-04:** after the accepted GDM
login, the operator reported Right Alt+Y missing `keybind-help.py`. The deployed
binding is `$mainMod = ALT`, `$layouts = python3 ~/.config/hypr/layout-controls.py`,
then `$layouts menu`. Home deployed that launcher as the standalone file
`/gnu/store/jzaw9hrklb07pa32wclyx2pa7ksv5rvz-home-dotfiles--config-hypr-layout-controls-py`.
Its `Path(__file__).resolve().with_name("keybind-help.py")` therefore selected
missing `/gnu/store/keybind-help.py`, not the existing separately stored
`~/.config/hypr/keybind-help.py`. The source launcher now imports through
`Path.home() / ".config/hypr/keybind-help.py"`, matching the direct help binding,
QML data/dismiss callers and the existing logical Home QML paths.

Scoped deployment links `~/.config/hypr/layout-controls.py` to
`~/src/dotfiles/config/.config/hypr/layout-controls.py`; the prior store symlink
is preserved at
`~/.local/state/hyprland-setup/20261004-ralt-y-help-path/layout-controls.py.before`.
No other binding/helper, Home activation or compositor reload/restart changed.
The corrected tracked source is used by future `rbh` snapshots.

Throwaway Python smoke exited0 for the exact deployed `...layout-controls.py
menu` argv and a private-HOME independent-file snapshot symlink. Both imported
the real deployed help module and resolved its real installed pinned
Quickshell0.3.1 dependency, stopping before the first `hyprctl` call. An audit
hook prohibited process launches/socket connections; an initial harness sentinel
hit launcher cleanup and its attempted process launch was blocked, then the
sentinel was corrected. No live IPC or UI action occurred. Receipt:
`~/.cache/ralt-y-help-path-20261004.json`; temporary harness/private files removed.
This proves helper/runtime command resolution, not physical Right Alt+Y or
rendered layout-card acceptance. No current-monitor test or input was issued.

**Startup plugin-path repair, 2026-10-04 (Home91 snapshot deployed; live workaround user-accepted):** tilde plugin paths
in the source config silently failed to load: Hyprland's config parser
expands `$VAR` references (so `$HOME` becomes an absolute path before the
plugin handler runs), but the legacy plugin handler does not expand a literal
`~` — unlike the `source` handler's `GLOB_TILDE`, it records the raw
right-hand side, and `dlopen` on the literal-tilde string returns NULL.
Plugin load failures appear only in logging/notifications, not
`configerrors`, so the plugins silently never load and `plugin[]` stays empty.
The actual cause is path resolution, not an ABI mismatch. Upstream at the
pinned `v0.55.4` tag:
`https://github.com/hyprwm/Hyprland/blob/v0.55.4/src/config/legacy/ConfigManager.cpp`
and
`https://github.com/hyprwm/Hyprland/blob/v0.55.4/src/plugins/PluginSystem.cpp`.
The `layout-controls.py` generic
message is unchanged: it cannot diagnose the load cause. Source
`dotfiles/config/.config/hypr/hyprland.conf` now uses
`$HOME/.guix-profile/lib/hyprland/...` for both directives with an explanatory
comment. Home91 now links `~/.config/hypr/hyprland.conf` to
`/gnu/store/av46dhfsclmw4fryia2d0rny16dwvfkv-home-dotfiles--config-hypr-hyprland-conf`,
which contains the corrected directives. The running compositor still parses
its startup-canonicalized `h646...-hyprland-conf` path; a normal reload does
not retarget an explicit config path to the new Home snapshot. The corrected
snapshot is deployed, but plugin startup persistence after logout/reboot is
**not confirmed**. The plugin ABI checks are unchanged.

Isolated verification used installed Hyprland0.55.4
(`a0136d8c04687bb36eb8a28eb9d1ff92aea99704`) under a private HOME/XDG
dbus/labwc nested session with the corrected source config: both plugins
load/map, `configerrors` is whitespace-only, and six disposable Kitty windows
confirmed centered master, dual centered masters and alternating side stacks
(hy3+dualmaster); the actual `layout-controls.py` switches exited0 with
workspace readbacks. Profile plugin SHA256: hy3
`74c5d77e165d943003b822ef1b25fa5e62ab902edadd35b72cf9ccad7a77c9a0`; dualmaster
`6f73a16a006e42f57f44a19825f7d34e0874df651e3d6598c2b6795e2529bb39`. Receipt:
`~/.cache/hyprland-plugin-path-proof-20261004.json`. The source repair did not
touch the running compositor (PID 2478). Immediate loads from the current
session are (no reload needed; HYPRLAND_INSTANCE_SIGNATURE is picked up from
the session environment):

```sh
/home/tay/.guix-profile/bin/hyprctl plugin load /home/tay/.guix-profile/lib/hyprland/libhy3.so
/home/tay/.guix-profile/bin/hyprctl plugin load /home/tay/.guix-profile/lib/hyprland/libdualmaster.so
```

On 2026-10-04, the operator confirmed “that worked” after instructions to
load both plugins from those absolute profile paths and select dualmaster.
This accepts the live-session workaround and dualmaster success as
user-reported evidence, not an independent runtime check. The subsequent
read-only Home91 snapshot readback confirms deployment of the corrected
directives; startup persistence after logout/reboot remains unconfirmed.

`(tay packages hy3)` in the local Guix channel pins source
`d7e0c58a1116df3d79f24a225f17b988112ca1ad` to Hyprland 0.55.4 and keeps the
runtime ABI check. Build/install with:

```sh
guix build -L ~/projects/guix-channel/guix hy3 --cores=1 --max-jobs=1
guix install -L ~/projects/guix-channel/guix hy3
```

The scoped user-profile installation is deployed; the Home package list
also includes hy3, but no full Home/System reconfiguration was activated.
Update the source pin and rebuild the plugin when upgrading Hyprland.

`(tay packages hyprland-dualmaster)` provides version `0.55.4-0.1.1` from local
source `guix/tay/packages/files/hyprland-dualmaster/` in the channel, with a
GCC 15 Release build and exact compositor ABI check. The recipe rejects a
different Hyprland package version; rebuild/upgrade them together.

```sh
guix build -L ~/projects/guix-channel/guix hyprland-dualmaster --cores=1 --max-jobs=1
guix install -L ~/projects/guix-channel/guix hyprland-dualmaster
```

On 2026-10-02 version `0.55.4-0.1.1` was built, scoped-installed and loaded into
the running compositor from
`/gnu/store/srab5n9r468z0gz27hqyxq3ggf13sh0w-hyprland-dualmaster-0.55.4-0.1.1`.
The plugin directive follows hy3; the workstation Home declaration includes
the package in `home-workstation-configuration.scm`. No compositor restart or
full Home/System activation was performed. The upgrade switched active
dualmaster workspaces to dwindle before unloading, then restored their layout
choices and exact master/slave slot order; no reload or monitor/DPMS command
was issued by the resize worker.

On 2026-09-30, three temporary Kitty windows verified switching all four layouts,
centered-master geometry, scrolling width/focus, hy3 tabs/navigation/group
actions, and execution of the registered H binding command. Named-workspace
selection also passed. Existing workspace layouts and monitor/HDR/gamma
settings were unchanged; temporary windows were removed and the original
workspace restored. Reload reports no errors and retains the plugin.
That run did not confirm physical key events or visual window layouts: wtype
did not trigger the bindings, and grim returned wallpaper-only captures both
with and without the plugin. Offline package metadata/derivation lint passed;
full lint timed out fetching the CVE database.
The wallpaper-only limitation is historical, superseded for the current `grim`
path by the HDR screenshot repair documented below on 2026-10-02. It does not
retroactively establish visual window-layout proof for that earlier run.

On 2026-10-02, live card smoke confirmed persistence beyond five seconds,
repeat invocation retaining the same card, invalid virtual A leaving it open,
and virtual Escape/D closing it with the default submap restored. External
reset, reload and forced Qt startup failure left no helper/card or active
`layouts` mode. D selected the already-dwindle workspace without changing it.
A QML-rendered capture showed the title, all 12 binding rows and footer
readably without overlap; compositor capture did not complete. Physical
Right Alt+Y and pointer pass-through remain untested. Virtual input required
a temporary device-specific bind-symbol override, removed by reload; reload's
changes to previous runtime master overrides were restored, leaving all
workspace layouts matching the baseline. No compositor restart or full
Home/System activation was performed.

**Resize verification, 2026-10-02:** old two-window horizontal-resize no-op
reproduced before replacement. Actual virtual evdev/uinput Right Alt,
right-button and pointer-motion events exercised the existing binding for
both masters and all four corners; IPC confirmed coupled growth/shrinkage,
equal masters and symmetric sides. Default 1/2/3/8 clients, 5%/95% width limits,
smart/non-smart slave sizing, cornerless/single-window resizing, fullscreen/
maximized guards and workspace isolation were exercised. All 14 original
clients, workspaces, exact slot order, floating/fullscreen state, focus/cursor
were restored; scratch windows/input removed. Workspace 1 remains dualmaster
at default 60% (master clients `x=1076/2588`, width `1506` each); other layouts,
monitor modes/positions preserved, no config errors, hy3 loaded. Physical
hand-operated dragging and compositor screenshots were not verified.

**Historical initial 0.1.0 smoke, earlier 2026-10-02:** fixed two-thirds center
(one-third masters, one-sixth sides) is superseded by the adjustable 60% default.
Real IPC covered 1/2/3/4/6 windows in logical usable `x=65 y=15 w=5040 h=1410`:
master clients `x=908/2588`, width `1674`; slave clients `x=66/4268`, width `836`;
six-window side stacks `y=16/723`, height `701` (gaps/borders included).
Fullscreen/maximized, directional movement, promotion/removal/addition,
slave sizing and virtual W/M selection passed. That run removed scratch,
restored baseline layouts to dwindle and returned both displays to DPMS off.

**Historical G9 recovery during this task, 2026-10-02:** user reported “mode not supported” before
any resize-worker monitor changes. IPC still showed DP-1 `5120x1440@119.979`,
XRGB2101010, HDR/VRR enabled. DP-1-only DPMS off/on recovered it, confirmed
by the user. Root cause unknown; saved G9 configuration/CRT and modes unchanged.

## Optional Hyprland session

The workstation Home package list includes `hyprland`,
`xdg-desktop-portal-hyprland`, and `thunar`; Kitty, Rofi, Emacs, and PipeWire's
`wpctl` remain provided by the existing packages/services. StumpWM is retained.
At the currently pinned Guix revision (`21c3d6748b65`), Hyprland is **0.55.4**
and the Hyprland portal is **1.3.12**. On 2026-09-27, `guix weather hyprland
xdg-desktop-portal-hyprland` reported both primary outputs substitutable from
`https://ci.guix.gnu.org`; this is not a guarantee for the complete closure.

The existing `config` stow package deploys `~/.config/hypr/hyprland.conf` and
`~/.config/xkb/keymap/spacecadet.xkb`. The latter is the canonical manna-cadet
keymap with physical RAlt (`Alt_L`) on Mod1, matching StumpWM's `A-x` modifier.
Libxkbcommon can resolve its stock component includes from `xkeyboard-config`;
no extra keymap compilation or system XKB installation is needed. Keep its
tracked stow symlink to `keyboard/manna-cadet/xkb/keymap/spacecadet.xkb` rather
than creating an independently maintained copy.

The pointer uses the conventional Adwaita XCursor theme at size 24
(`XCURSOR_THEME=Adwaita`, `XCURSOR_SIZE`/`HYPRCURSOR_SIZE=24` in
`hyprland.conf`). No hyprcursor-format theme is installed, so Hyprland uses its
XCursor fallback. The theme comes from `adwaita-icon-theme` in the system
profile (`/run/current-system/profile/share/icons/Adwaita/cursors`) via the
session's `XCURSOR_PATH`. To apply the theme in a running session without
restarting anything, run `hyprctl setcursor Adwaita 24`; GTK cursor settings
are left alone.

For a scoped deployment while unrelated Home/System changes are pending, add
only these packages to the existing user profile (this does not activate Home
services):

```sh
~/.config/guix/current/bin/guix install \
  hyprland xdg-desktop-portal-hyprland thunar
```

Do not use `--fallback` on a disk-constrained workstation. Review the download
and local-build plan before accepting it. A missing substitute is a reason to
stop and inspect the plan, not to start an unbounded source build.
Guix Home uses immutable store snapshots, so after a scoped user-package
installation the new Hyprland config/keymap must also be deployed separately;
the reviewed declarative Home command below installs both, including the local
channel module prerequisites, after all
pending Home changes have been reviewed. Do not run that command merely to
install Hyprland while unrelated Home changes are still pending.

On 2026-09-27, the scoped installation completed and `Hyprland --verify-config`
returned `config ok`. The two deployed config paths now link directly to their
dotfiles sources; prior store-backed symlinks are preserved under
`~/.local/state/hyprland-setup/20260927-093607/`. No Home services or running
X keyboard map were reloaded. The installation left only 2.4 GiB free on the
store filesystem; no user data or old generations were deleted.
An isolated nested session under headless labwc also mapped and rendered a
native Wayland Kitty window. Hyprland IPC reported no config errors, the
canonical keymap path and Mod1 bind mask 8. Evidence is retained at
`~/.cache/hyprland-manna-cadet-smoke.{png,json}`. No persistent graphics
workaround was needed; physical keyboard chords, monitor modes and GDM login
remain unverified. Pure `AQ_BACKEND=headless` is not supported by this
Hyprland version; it needs a usable DRM or Wayland parent allocator.

Launch from a newly logged-in local TTY as `tay`, not root, without stopping
the existing X session:

```sh
~/.guix-profile/bin/Hyprland --verify-config \
  --config ~/.config/hypr/hyprland.conf
~/.config/hypr/start-session.sh
```

### GDM Caelestia entry prepared, 2026-10-04

The System declaration now uses local `%hyprland-caelestia-session` instead of
the raw Hyprland package. It retains the upstream binaries/data through store
symlinks and replaces **the same** `hyprland.desktop` entry, avoiding duplicate
chooser items. StumpWM and LXQt remain unchanged. Guix's GDM searches the System
profile's `share/wayland-sessions`, not the user's Home/profile directory.
The chooser name is **Hyprland (Caelestia)**, with absolute immutable
`Exec`/`TryExec` pointing to `hyprland-caelestia-session`.

That launcher obtains `HOME` from the logged-in UID's passwd entry, respects a
nonempty `XDG_CONFIG_HOME`, and invokes the tracked
`${XDG_CONFIG_HOME:-$HOME/.config}/hypr/start-session.sh --gdm`. Missing startup
source, unreadable `hyprland.conf`, or absent GDM session bus fails clearly;
there is no silent raw-Hyprland fallback. GDM already runs its Guix login-shell
wrapper, so this launcher adds neither another login shell nor another bus.
It preserves the bus/runtime/authentication environment inherited by the
desktop entry; Guix Home's login setup can select its standard user bus before
that entry runs. This does not claim that GDM's private bus and Home's bus are
identical, or isolate multiple GDM sessions sharing one UID.

Both TTY and GDM use the same profile PATH, XDG data, Qt/QML and Kitty Meta
setup. Compositor resolution prefers the user profile, then Home, then System,
matching the configured user-profile plugin ABI. The TTY invocation above
still creates a private `dbus-run-session` to leave concurrent X-session
services untouched; `--gdm` requires and retains the inherited bus instead.

The historical prepared System build was
`/gnu/store/cia953aqn0zwfnh9xw3x5mmg6wwj83cv-system`; the historical refreshed
Home build was `/gnu/store/1rsna9xclg8z8gmm8hpyg6648cn9r75a-home`.
The operator subsequently activated both and rebooted. Earlier parent byte comparisons of built Home
`files/.config/hypr/start-session.sh` and `files/.bashrc.d/host-basedbox` with
the corrected sources exited0. Startup SHA256
`1701a88ec40ae0d5f9b28df48e8097fcdde7b28fe3ef41d12ecc25c444a157b4`
matches the isolated proof's exercised source bytes. The corrected host
fragment is deployed as a source link; its original is preserved at
`~/.local/state/host-basedbox-rbh-20261004/host-basedbox.before`.
The actual immutable System desktop Exec was exercised in isolated real
Hyprland under headless labwc, using private XDG config/runtime/cache/state/
data and a minimal no-autostart config with the tracked keymap. Actual IPC,
empty configerrors, keymap, process environment and active1280×720 headless
output passed; GDM-path inherited bus, distinct TTY-path bus/GetId, and
missing-script/config/bus failures were checked. Task-created sessions exited
cleanly; no live-session IPC or monitor was used.
Evidence: `~/.cache/gdm-hyprland-readiness-20261004.json`.
This verifies both complete builds and the launcher contract, **not physical
GDM/PAM login, first-login full Caelestia startup, or hardware/keyboard behavior**.

**Historical first reboot/GDM login failure on 2026-10-04; later operator-confirmed recovery below.**
At08:39, GDM opened a PAM Wayland session but full Home user-Shepherd load
failed with `source expression failed to match any pattern in form (5 . 60)`.
Home generation89's `/gnu/store/82kv1zprnfjr313v58c5nv0mi9phv2zw-shepherd.conf`
loads the two ha-mcp services with unquoted `#:respawn-limit (5 . 60)`.
The pinned Guix serializer emits this field as code, so the source pair's
ordinary quote was consumed too early. No captured evidence traced whether
the entry Exec or startup script's bus guard ran after the Home failure.
Later amdgpu framebuffer-teardown warnings are separate observations, not
proof of the login failure's cause or proof that the GPU is uninvolved.

Both source fields now stage the quote with `(respawn-limit #~'(5 . 60))`,
preserving five starts per sixty seconds and a five-second respawn delay.
Complete Home build exited0 with cores2/jobs1 and exactly these load paths:

```sh
~/.config/guix/current/bin/guix home build --cores=2 --max-jobs=1 \
  -L ~/src/guix-config/modules -L ~/projects/guix-channel/guix \
  -L ~/projects/ivory-key/guix \
  ~/src/guix-config/home-workstation-configuration.scm
```

Output: `/gnu/store/6kkq41d6rlzdkpvbs9pffy83lxjkngl9-home`; fixed startup
config: `/gnu/store/afr0hcng77bqnvs4n93jivwaa82afbv6-shepherd.conf`.
Generated ha-mcp files now contain `#:respawn-limit (quote (5 . 60))`.
Actual Shepherd1.0.9 evaluated the **whole generated registration prefix**
with private HOME/XDG directories/socket/logfile. A fail-closed Scheme
structure match omitted the original daemonize/auto-start expressions;
all15 original generated service files were loaded and their real services
registered, stopped/not running. Both real respawn-limit accessors returned
`(5 . 60)`, exit0. No service constructors/files were mocked or replaced and
no configured start/stop or credential operation ran. Receipt:
`~/.cache/shepherd-respawn-validation-20261004.json`.

**Activated as Home generation90; operator confirmed reboot/login recovery on 2026-10-04.**
The operator superseded the earlier activation hold and explicitly requested
the normal `rbh`, accepting its existing Home hooks rather than a separate
manual Shepherd hot-reload. This command completed successfully (exit0):

```sh
source ~/.bashrc.d/host-basedbox
rbh --cores=2 --max-jobs=1
```

The corrected helper supplies all three load paths. Readback confirms
`~/.guix-home` resolves to `/gnu/store/6kkq41d6rlzdkpvbs9pffy83lxjkngl9-home`,
the profile points to `guix-home-90-link`, and
`~/.config/shepherd/init.scm` resolves to the fixed `afr0...-shepherd.conf`.
Normal activation included the existing display-discovering keyboard reload
hook. It printed `error: Could not connect: No such file or directory` before
Shepherd load (origin not conclusively established), then loaded the corrected
config, daemonized as process8772 and printed `Starting services...`.
This does not prove that all configured services or the session bus recovered.

No separate manual Shepherd hot-reload/restart/service-start command was run.
After the reboot retry, the operator confirmed on 2026-10-04: “good. it works
now.” This accepts the reported GDM **Hyprland (Caelestia)** login/session
recovery after the Shepherd fix, superseding its pending acceptance. No System
reconfigure was needed. This is user-reported success, not an independent
physical GUI test or post-reboot service/bus inventory; it does not certify
every peripheral/service or keyboard/display behavior, or resolve the separate
causally-unproven GPU/early-boot observations. This documentation update ran
no tests/commands and changed no systems/runtime, services, credentials or rbw
vault session/settings. The repair task performed no GDM restart, reboot, VT
change, synthetic physical GUI input/IPC, credential access or rbw operation.
Existing unrelated package warnings remain. Reboot ends session processes/
companion PTYs; preserved state is not PTY migration.

The earlier 2026-09-27 scoped raw-Hyprland reconfigure expression is superseded:
it bypassed this shared startup and is not the prepared Caelestia login route.

### G9 HDR recovery and mapping history
**Home source-include error and mutable HDR ownership, 2026-10-04:** after the
operator's Home activation, read-only `hyprctl configerrors` still reports
`source= globbing error: found no match` at line17 of the running compositor's
old `h646...` main-config snapshot. Current Home91's include is at line18 and
the readable HDR file is linked to
`/gnu/store/316blrlacqn80vs492hfp8fvlmkkrq08-home-dotfiles--config-hypr-g9-hdr-conf`;
its bytes equal the tracked60Hz/VRR-off seed below. This is not a missing
file now, a plugin-path error, or a store-relative include: `source` expands
the process HOME with `GLOB_TILDE`.

The pinned Home manager deletes all previous store links before recreating
new links. Its exact generated script was exercised in a private HOME: the
HDR link disappears and an identical Hyprland inotify watch receives
`IN_IGNORED`. Hyprland0.55.4 forwards that event without mask filtering to a
synchronous config reload. Thus activation has a concrete absent-include
window and reload trigger. **The live incident's exact ordering was not
traced**, so the race is strongly supported, not a proven timeline. The
generated activation runs the manager before the keyboard hook; that hook
only handles XKB and does not issue a Hyprland reload.

Source correction excludes only `g9-hdr.conf` from immutable dotfiles. A
workstation-only `seed-g9-hdr-config` activation service creates a0600 regular
file atomically when absent or migrating a symlink, preserving current link
bytes or the previous Home generation before falling back to the tracked
seed. Existing regular settings are untouched. This also fixes the panel's
resolved-target writes otherwise trying to write into `/gnu/store`.
The required `source` declaration, errors, monitor values and reload hooks
are unchanged. **Source-only: not activated.** First migration follows the
manager's deletion and can still require one manual reload; subsequent Home
activations no longer remove/relink mutable HDR state.

Isolated proof: exact pinned manager and lowered source seed gexp; old-generation
and existing-symlink byte preservation, fresh seed, repeated regular-file
inode/settings preservation, real panel `atomic_write` on private settings,
strict dangling-link failure/temporary cleanup. Installed
`Hyprland --verify-config` reports the same error with the private include
absent (exit1) and `config ok` when restored/seeded (exit0), without starting
a compositor. Receipt: `~/.cache/hdr-home-source-proof-20261004.json`.
An initial full-declaration extraction stopped on `hy3: unknown package` in
the pinned package catalog; direct seed-expression lowering succeeded.
The parent subsequently evaluated the actual complete Home with `--dry-run`
and all three load paths (configuration modules, local channel, ivory-key):
exit0, planning only activate/files/Home derivations. This verifies declaration
evaluation, **not a build or activation**. No `rbh`, full build/activation,
physical reload/monitor/input, credential or rbw operation was performed.

To clear the current stale error, the operator may run once from their
Hyprland terminal (not executed by this repair):

```sh
/home/tay/.guix-profile/bin/hyprctl reload
```

This reapplies the saved monitor configuration, not a new experimental mode;
it does not load the new main snapshot or prove next-login plugin persistence.


**Current recovery (2026-10-03):** the live-linked DP-1 `g9-hdr.conf`
`monitorv2` block now uses **5120x1440@60, VRR off** (`vrr = 0`), 0x0,
scale 1, `bitdepth = 10`, `cm = hdr`, `sdr_min_luminance = 0.005`,
`sdr_max_luminance = 200`, brightness `1.2` and saturation `1.05`.
The saved SDR transfer curve remains `render:cm_sdr_eotf = gamma22`.
Only mode and VRR changed; the configuration watcher applied them without
an explicit reload, compositor restart or DPMS cycle. Parent IPC verifies
59.99900 Hz, HDR/XRGB2101010, VRR false, DPMS on, white 200, brightness 1.20,
saturation 1.05, gamma22 set and no config errors; black is rounded to 0.00
by IPC while the saved value is exactly 0.005. CRT settings are unchanged.
The user confirmed the preceding SDR 60 Hz recovery after DPMS cycling failed;
the restored HDR 60 Hz physical picture remains **unconfirmed**. Do not
return to the historical 120 Hz/VRR mode for recovery. These saved appearance
values are not instrument calibration or proof of HDR playback/stability.

**Historical VRR/HDR trial (2026-09-30):** the live-linked
`dotfiles/config/.config/hypr/hyprland.conf` sources `g9-hdr.conf`. During
that trial its DP-1 `monitorv2` block used 5120x1440@119.98 at 0x0,
scale 1, `vrr = 1`, `bitdepth = 10`, `cm = hdr`,
`sdr_min_luminance = 0.005`, `sdr_max_luminance = 200` and saturation 1.0,
without panel peak-luminance overrides. These 120 Hz/VRR settings are
historical, not the current recovery mode. The CRT remains SDR 800x600@75
at 4200x1440.

The user cleared a right-half bounce by switching to 60 Hz and back.
Initial HDR defaults looked muted except the cursor; SDR was restored before
retrying HDR with the adjusted SDR mapping above. Reload succeeded; IPC at
that trial reported VRR true, XRGB2101010, hdr, white 200 and no config errors.
At this stage the user confirmed better black-terminal contrast but Herdr/OMP
still looked washed out. A runtime-only `render:cm_sdr_eotf = gamma22` trial
perhaps helped slightly; it has since been saved in the live-linked
`hyprland.conf` as the baseline for reloads and sessions. The subsequent
reload succeeded with no config errors, and the user reported the picture
looks perfect afterward. HDR playback and sustained stability remain
unverified. G95SC EDID read on 2026-09-30 advertises PQ, BT.2020, 10-bit, HDR desired
max 400, frame-average 248.372 and min 0 cd/m²; these are not measured
calibration values. This is a mapping trial, not measured panel calibration.
Do not reuse the historical 120 Hz/VRR trial as a recovery command. Legacy
`keyword monitor` commands can reset the calibrated SDR mapping to defaults;
gamma22 belongs to `render:cm_sdr_eotf`, not the monitor `cm` preset.
For an SDR comparison, use the controls below while retaining the recovery
mode and VRR-off setting.

Reload restores the saved G9 file. Use `g9-hdr-controls` or launcher entry
**G9 HDR Controls** for persistent adjustments or an SDR comparison.
Sliders stage changes; **Apply & save** updates only `g9-hdr.conf` and reloads
Hyprland. **Restore starting settings** restores the opening snapshot.
Closing retains the last applied values. The panel preserves the runtime SDR
transfer curve across its reloads, while `hyprland.conf` now persists gamma22;
other runtime-only overrides may reset.

The small GTK panel uses a scoped Python/PyGObject environment at
`~/.local/share/hyprmod-venv` with GC-rooted Guix dependencies at
`~/.local/share/hyprmod-runtime`. These historical names come from a removed
HyprMod trial whose legacy monitor writer did not preserve this monitorv2
setup. No full Home/System reconfiguration. See the dotfiles README for
source/launcher details and controls. Actual GUI Apply at 205 and Restore
to 200 verified the saved file, HDR/VRR and unchanged CRT. The later gamma22
reload had no config errors and the user reported satisfactory appearance;
this remains a visual judgment, not instrument calibration.

### Caelestia shell on Guix (2.5.0)

The Hyprland session shell is [Caelestia](https://github.com/caelestia-dots/shell)
2.5.0 with its CLI 1.1.3, packaged in the local channel as `caelestia-shell`
(`~/projects/guix-channel/guix/tay/packages/caelestia-shell.scm`) and
`caelestia-cli` (`caelestia-cli.scm`). The upstream installer, `caelestia
install`/`caelestia update`, its keymaps and its systemd conventions are not
used. The shell package pins its own `quickshell-for-caelestia` build and
launches it through `bin/caelestia-shell`, a wrapper that takes Quickshell (`qs`)
arguments (for example `caelestia-shell -n` or `caelestia-shell ipc ...`); there
is no `run` subcommand. Channel patches adapt the lock screen to Guix's `login`
PAM stack, port to Qt 6.9, and add a `services.weatherEnabled` switch (default
true). When that switch is false, every weather and IP-geolocation request, reply
handler and timer is disabled.

The declared workstation Home packages are `caelestia-shell`, `caelestia-cli`,
`caelestia-panes` and the standalone `polkit-gnome` agent, plus `cliphist`, `grim`, `slurp`,
`wl-clipboard`, Python, D-Bus, `papirus-icon-theme` and `qt6ct`. Caelestia
contains no polkit agent, so GUI privilege prompts in the Hyprland session come
from `polkit-gnome`. The session helper starts that agent, which runs only in
the Hyprland session and not in the StumpWM/X session. To add the shell to the
user profile without activating unrelated Home changes:

```sh
~/.config/guix/current/bin/guix install \
  -L ~/projects/guix-channel/guix --cores=1 --max-jobs=1 \
  caelestia-shell caelestia-cli caelestia-panes polkit-gnome
~/.config/guix/current/bin/guix remove dank-material-shell-shell-only quickshell
```

Keep the build parallelism bounded on this host. An earlier higher-load build
lost `cc1`, and the 2026-09-28 install used one core and one job. These commands
change packages only; they do not deploy the repository configuration. After
reviewing the pending changes, the exact declarative Home deployment is:

```sh
~/.config/guix/current/bin/guix home reconfigure \
  -L ~/src/guix-config/modules -L ~/projects/guix-channel/guix \
  -L ~/projects/ivory-key/guix \
  ~/src/guix-config/home-workstation-configuration.scm
```

The Home common module imports `(ivory-key packages)` for its Kanata package.
That module lives in the local Ivory-Key checkout, not in the currently pulled
channels, so keep the Ivory-Key load path above. Omitting it makes the
`(tay home-common)` import fail and leaves `%core-home-packages` unbound.

This deploys all files from the existing `config` Stow package. For a scoped
deployment, preserve the previous destinations first, then link these source
files into `~/.config/hypr/`: `caelestia-session.py`, `keybind-help.py`,
`keybind-help.qml`, `layout-controls.py`, `layout-help.qml`, `screenshot.sh`,
`start-session.sh`, `hyprland.conf`, and the `wallpapers/`
directory. Also deploy `xdg-desktop-portal/hyprland-portals.conf` to the
corresponding `~/.config/xdg-desktop-portal/` path, and link the tracked seeds
into `~/.config/caelestia/`:

- `cli.seed.json`
- `shell.seed.json`
- `monitors/HDMI-A-1/shell.seed.json`

Never link the mutable `cli.json` or `shell.json` to immutable store files. The
supervisor copies each seed to a regular `0600` file with the same name minus
`.seed`, and only when that file is absent, so later edits from the GUI (Nexus)
are preserved. The existing X desktop `portals.conf` stays unchanged.

From a fresh local TTY login, `~/start-hyprland.sh` delegates to
`sh ~/.config/hypr/start-session.sh`, which creates a private D-Bus session with
`XDG_CURRENT_DESKTOP=Hyprland`. This leaves the concurrent X session's Dunst and
portal ownership intact. The prepared **Hyprland (Caelestia)** GDM entry uses
the immutable wrapper and shared `start-session.sh --gdm`, retaining the bus
inherited by that entry rather than creating a private bus. The supervisor
refuses to start if another process already owns the notification name.
Private-bus TTY KWallet activation, fresh full Caelestia startup and physical
GDM login need separate verification. Existing shared-bus Home wallet and
PipeWire services are not restarted.

#### Session supervisor lifecycle

Hyprland's only autostart is:

```text
exec-once = python3 ~/.config/hypr/caelestia-session.py run
```

`caelestia-session.py run` performs these steps:

1. It resolves `caelestia-shell`, `caelestia`, `caelestia-panes`, `wl-paste`,
   `cliphist` and `libexec/polkit-gnome-authentication-agent-1` from
   `~/.guix-profile`, then `~/.guix-home/profile`. Missing tools fail startup.
2. It holds the per-user `flock` `$XDG_RUNTIME_DIR/caelestia-hyprland.lock`. A
   second `run` exits 0 without doing anything.
3. It seeds the absent mutable config from the tracked `*.seed.json` files. It
   refuses to start unless `~/.config/caelestia/cli.json` sets **all 15**
   `theme.enable*` flags explicitly to `false`.
4. It refuses to start if `org.freedesktop.Notifications` already has an owner
   on the session bus. It never kills Dunst or another shell.
5. It starts `caelestia-panes serve` hidden, the `wl-paste --watch cliphist store`
   watcher and the `polkit-gnome` agent, then checks an actual companion
   status reply within ten seconds before starting `caelestia-shell -n`.
   Panes is optional: failed readiness is logged and that owned pane process
   is stopped individually; the healthy shell/watcher/agent still start.
   Output goes to `~/.local/state/caelestia/hyprland-session.log`.
6. It records `{instance, pid, shell, panes}` in
   `$XDG_RUNTIME_DIR/caelestia-hyprland.json`, mode 0600; `panes` is null
   when the optional companion is unavailable.

The children get `QT_QPA_PLATFORMTHEME=qt6ct`, so the Papirus-Dark icons from
`~/.config/qt6ct/qt6ct.conf` apply to them. No global Qt platform-theme variable
is set. The supervisor removes `QML_IMPORT_PATH` and `QML2_IMPORT_PATH` from the
children's environment, because any plain `quickshell` QML modules still in a
profile would shadow the pinned build.

The supervisor stops at compositor exit, SIGTERM/SIGINT, or a clipboard
watcher or polkit-agent exit. An optional **panes exit is logged once with
its exit code**, changes recorded `panes` to null, and does not stop the
healthy shell/watcher/agent. There is no automatic pane retry. A
**Quickshell-only exit restarts just the shell**, updating its recorded PID
while preserving any healthy companion's WebView, native draft and pane-owned
glirc. `hyprctl reload` does not rerun `exec-once` or duplicate these processes.
For a complete supervisor restart, terminate only its recorded `pid`, then
run the helper from a Hyprland-spawned terminal; unlike a shell-only restart,
this ends the pane daemon and its glirc PTY. Inspect the log above for failures.

Cleanup terminates only owned children. The companion is signaled individually,
not as a process group that could include a user-owned rbw agent. Never use
global `pkill`, `killall quickshell`, or systemd user units for this shell;
never lock/logout/reset/stop rbw as cleanup. State file and session clipboard
database are removed at supervisor exit, not reader profile/native draft.

The helper's other subcommands check that the state file belongs to the current
`HYPRLAND_INSTANCE_SIGNATURE`:

```sh
python3 ~/.config/hypr/caelestia-session.py ipc drawers toggle launcher
python3 ~/.config/hypr/caelestia-session.py ipc nexus open
python3 ~/.config/hypr/caelestia-session.py clipboard
python3 ~/.config/hypr/caelestia-session.py lock
```

`ipc TARGET FUNCTION [ARGS]` runs
`caelestia-shell ipc --pid <shell> call TARGET FUNCTION [ARGS]`, which targets
only the recorded instance.

#### Input wake repair and scoped recovery (2026-10-04)

The host remained active, not suspended; the compositor received input while
DPMS was off. The shell's 1200-second `dpms off`/`dpms on` pair is correctly
configured, but its return-action owner was absent after supervisor teardown.
Hyprland0.55.4's native key/mouse wake controls both default false and were
unset. Source now explicitly enables both in `misc`, so input wake does not
depend on the shell. Optional-pane failure isolation above prevents a future
pane exit from taking down healthy shell/watcher/polkit children.

The session log's `Gdk-Message: 11:53:38.129: Error 22 (Invalid argument)
dispatching to Wayland display` has no PID or protocol interface/object/code.
Attribution to the GTK panes process is inference; the Qt shell logged a
monitor-null burst about two seconds earlier. Compositor verbose logging was
disabled. These logs do not establish a particular invalid Wayland request,
GPU cause or pane-source correction, so no speculative native patch/build was
made. The separate Quickshell timeout-registration bug was not reproduced in
this changed path; no broad backport was applied.

Installed0.55.4 in a private headless-labwc/nested Hyprland session passed six
actual virtual-key/pointer DPMS assertions with shell/idle daemon absent:
each option independently wakes on its own input; both-disabled and opposite
input controls stay off. Private compositor cleanup segfaulted after the
assertions; all task-owned processes/directories were removed. This is native
DPMS-state proof, not physical G9/DRM/visible wake acceptance. The unchanged
supervisor `run()` passed45 lifecycle contract checks across pane exit37,
startup readiness failure and healthy cleanup using private subprocess/socket
stand-ins; healthy children survive, failure logs once, state becomes null,
and shell-only restart does not retry panes.

Live recovery targeted only PID2478's exact signature
`a0136d8c04687bb36eb8a28eb9d1ff92aea99704_1791120301_1384389477`:
two `hyprctl keyword misc:*_enables_dpms true` calls and **one** `dispatch dpms on`,
all returning `ok`; no off, injected input, whole reload or monitor-setting
change. Both options read `int1,settrue`. DP-1 briefly disappeared during a
logged disconnect/reconnect; subsequent read-only IPC shows both outputs on,
G9 `5120x1440@59.999` HDR/XRGB2101010/VRR-off and CRT `800x600@75`.
Saved HDR bytes are unchanged; `configerrors` is whitespace-only at final
readback. **Neither this state nor the hotplug recovery proves GPU faults fixed
or a visible physical picture.**

Only `~/.config/hypr/caelestia-session.py` was source-linked, with its prior link
at `~/.local/state/hyprland-setup/20261004-dpms-wake/caelestia-session.py.before`.
After bus/tool/theme readiness and unowned Notifications were checked, the
absent supervisor was launched through exact-instance `dispatch exec`:
supervisor1521, shell1550, panes1526, watcher1527 and polkit1528 alive; actual
pane status replies `ok`, all panes hidden/uncreated. No live pane/glirc was
terminated and no credential/rbw session or settings were touched.

The immutable main config link was deliberately **not** replaced, avoiding its
autoreload path and preserving existing plugin/HDR changes. Native options are
live for this compositor and persistent in tracked source; next `rbh` must
capture them before next-login persistence can be claimed. No Home activation
or physical acceptance ran. Receipts:
`~/.cache/hyprland-native-dpms-proof-20261004.json`,
`~/.cache/caelestia-wake-supervisor-proof-20261004.json`,
`~/.cache/hyprland-wake-recovery-20261004.json`.

#### Persistent GTK4 service panes (2026-10-03)

`caelestia-panes` is a native C/GTK4 layer-shell companion integrated with
Caelestia IPC and live theme/output selection, not a normal browser/Kitty
scratchpad, foreign-window embed or QtWebEngine patch. Right Alt+B/M/I opens
bottom SilverBullet/top Memos/left glirc; repeat the same chord hides. One pane
owns focus, hidden surfaces unmap, no workspace retile/reservation or edge
hover. Right Alt+S and Left Alt application Meta are unchanged. Reader/capture
Escape hides; chat Escape stays with glirc.

Compact drawer update: no companion title/close header or reader toolbar;
Ctrl+K opens Silversearch, F5/Ctrl+R explicitly reloads/retries reader setup,
and F1 shows help. Empty/normal ready feedback stays hidden. Chat Connect
disappears once started and returns after exit. The fixed transparent surface
reveals/retracts a `surface`-coloured shape with rounded outer corners and
concave 28px frame joins, no shadow/outline and shape-only pointer input.
Anchoring uses Caelestia's existing border/bar exclusions (including border0).
EXCLUSIVE keyboard interactivity is retained until unmap: the former mapped
NONE commit hit Hyprland 0.55.4's same-window/null-surface early return and left
seat keyboard focus empty. This is not repaired by repeatedly focusing the
same reported activewindow address.

Accepted output `/gnu/store/f4wb442qxwh0rac9aw6z0kjs92i2j5vb-caelestia-panes-1.0.0`
was built serially with cores2/jobs1 and installed as profile target
`/gnu/store/q0adkzynyr5nyag0rishmbrp2bakrkqr-profile` (2026-10-04). Isolated
nested Hyprland checks covered all three panes at two cursor positions, pane
switch, closed previous window, BIG border10/CRT border0 shapes, partial
reveal/retract and shell-only persistence. CRT captures selected `--output CRT`
explicitly because nested QML focusedMonitor remained BIG. The user then
authorized a live companion restart, accepting volatile chat PTY/draft/scrollback
and reader position loss. New supervisor/shell/companion31724/31772/31728;
live verification was process executable/health plus whitespace-only
`configerrors`, without input/toggles/screenshots. Saved Memos draft hash and
reader profile/cookie file were retained; independent glirc32575 remained.
Evidence: `~/.cache/caelestia-panes-polish-20261004/`.

```sh
python3 ~/.config/hypr/caelestia-session.py ipc panes toggle silverbullet
python3 ~/.config/hypr/caelestia-session.py ipc panes toggle memos
python3 ~/.config/hypr/caelestia-session.py ipc panes toggle chat
python3 ~/.config/hypr/caelestia-session.py ipc panes close
```

The runtime's private socket is `$XDG_RUNTIME_DIR/caelestia-panes.sock` (0600).
The actual WebKitGTK reader stays allocated across toggles; current page,
history/search/selection/scroll survive hide/show and Quickshell-only restart.
Use SilverBullet's own search, wiki links and native topbar Mark read.
First use requires the real login form in a dedicated WebKit profile; no
inherited browser cookies. **`http://192.168.7.135/` is deliberate LAN HTTP,
not TLS: login/password and cookies cross the wire as HTTP.** No HTTPS reader
endpoint was established. Mark read and some plugins write files; hidden
editor chrome is not read-only authorization.

Reader state: `$XDG_STATE_HOME/caelestia-panes/reader/{data,cache}` (default
`~/.local/state/caelestia-panes/reader/`), directories 0700,
`data/cookies.sqlite` 0600. Sensitive plaintext storage is owner-only, not
encrypted at rest; arbitrary UI-state restoration after daemon crash is not
guaranteed. Reload/Retry is explicit, never triggered by toggling.

Native Memos Enter inserts newline; Ctrl+Enter / Submit PRIVATE submits.
Authenticate displays a genuine rbw terminal re-prompt for the existing
workstation PAT; credential stdout uses a private FD, not terminal/argv/env/
disk/log. The operator unlocks rbw if needed. Successful authentication caches
only in memory and **does not auto-submit**: submit explicitly afterward.
Draft text+cursor are atomically saved/restored at
`$XDG_STATE_HOME/memos-capture/draft-pane.json`, mode 0600/parent 0700, separate
from the existing TUI `draft.txt`. Unsafe storage fails closed.
Verified HTTPS `https://elitedesk.tail53428b.ts.net:8443/api/v1/memos` receives
one request at a time with a 30-second deadline; editing is disabled during
submission. Only HTTP 200 with valid `memos/<uid>` and PRIVATE acknowledgement
clears text. Cancel/error/timeout/ambiguous response keeps it. No automatic
write/auth retries/redirects; check Memos before deliberate ambiguous resubmit.

Chat initially shows **Connect glirc**. Click deliberately to start a separate
PTY with existing `~/.config/glirc/config` (13 ZNC networks, password.command,
public cert pin, strict IP-SAN TLS). Saved ZNC MultiClients was read back
enabled; client identifiers do not isolate shared normal history buffers.
The existing Kitty/glirc and unsent draft are not migrated or touched. The
pane's own glirc process/draft/buffer/scrollback survives hides/shell reload,
not daemon/session exit. Meta+a/s, Ctrl+n/p/x remain navigation;
Ctrl+Shift+C/V copy/paste. Connect/startup/auth errors require deliberate
operator action; the companion never autoconnects or restarts exited glirc.
It adds no local history archive; the existing glirc network policy is retained.

**Authentication acceptance limits:** native Memos creation, authenticated
WebKit SilverBullet search/read/Mark read and new-pane glirc network auth are
not verified without the operator's login/mandatory re-prompt. Prior browser/
TUI/service acceptance is not evidence for these new sessions. No current PTY
migration, phone voice/Wi-Fi-off or route approval was performed; Second Brain
expansion/lint limits remain on its OKF service page. Credentials/vault
session/autolock were not changed.

Historical 2026-10-03 live pane acceptance observed all three layer namespaces and legible
controls on the real 800×600 CRT, including the genuine reader HTTP login.
Hyprland B/M/I binding readback and a Quickshell-only restart retained the
companion/widgets; existing compositor, Kitty/glirc and Kanata stayed intact,
and DPMS-off was restored. Isolated evidence covers 1080p/CRT layers, rapid
toggle/unmap behavior, offline actual glirc PID/draft across five toggles,
native draft/cursor restoration and private unavailable-auth draft retention.
These are not authenticated service or physical-keypress acceptance.
Evidence: `~/.cache/caelestia-panes-smoke-live.json`,
`~/.cache/caelestia-panes-smoke-isolated.json` and adjacent pane PNG captures.
Parent scoped no-network Guix lint checks (description, synopsis, input
classification and patch-file names) exited 0; full lint was not claimed.

No dedicated pre-pane configuration backup was established. Earlier Guix
profile generations provide **package-only** rollback. Reverting live-linked
dotfiles/package source changes requires an explicit reviewed manual revert
preserving unrelated edits; a package rollback alone is not a full session
rollback. Do not overwrite native draft/reader profile or the existing TUI
draft as part of that operation. The older general Caelestia cutover backup
below is historical, not a new pre-pane snapshot.

Historical scoped installed/live outputs (2026-10-03, superseded by polish above):
`/gnu/store/vis0g8vibcl9b6qqls1pdqg82vp19gwi-caelestia-shell-2.5.0` and
`/gnu/store/n5jir4sn4y8mdavj3max188zgpd4d5kg-caelestia-panes-1.0.0`, profile
target `/gnu/store/0annq1kzwb1a4ndr8lc0ndd9h8i0z0hk-profile`.
Final supervisor/shell/companion were 30433/30457/30435, same compositor12814;
old glirc32575/Kanata2447 preserved. All panes left hidden and DPMS off.
Final live CRT captures `~/.cache/caelestia-panes-smoke-final-live-*.png`
were visually inspected. Final private auth-terminal container rendered the
genuine helper's unavailable-vault error/status legibly, retained the draft
and shut down with exit 0; no real vault/pending re-prompt cancellation test.
Home dry-run with the three load paths above and Hyprland configuration
verification exited 0; unrelated existing nhfourk warning remains. Earlier
package paths/PIDs in evidence are historical, not final installed targets.


#### Seeded Caelestia configuration

- **Application theming off.** `cli.json` disables every CLI theme target: the
  terminal, Hyprland, GTK, Qt, Fuzzel, btop/htop/nvtop, Discord, Spicetify,
  Pandora, Warp, Chromium, Zed and Cava targets. As a result, `caelestia scheme`
  and `caelestia wallpaper` never rewrite the dotfiles-tracked GTK3/GTK4 CSS,
  qt6ct, Kitty colours or `~/.config/hypr/scheme/current.conf`. Check this file
  **before** any scheme or wallpaper operation. Do not create
  `~/.config/caelestia/templates/`.
- **Monitors.** `shell.json` sets `bar.excludedScreens: ["HDMI-A-1"]`, so the
  bar stays on the DP-1 ultrawide. The CRT's per-monitor seed only reduces its
  border (`border.thickness` 0, which the shell clamps to 2 px). The CRT stays
  usable and keeps the wallpaper. Do not set a per-monitor `enabled: false`: that
  also removes the CRT's wallpaper window.
- **Idle.** `general.idle.timeouts` is exactly one entry: `dpms off` after 1200
  seconds, with `dpms on` on return. `lockBeforeSleep` and `inhibitWhenAudio`
  are false. This replaces upstream's default list, which locks at 180 s and
  suspends at 600 s. Do not delete the `timeouts` key, because the upstream
  defaults would come back. There is no automatic lock or suspend, and the
  host's elogind sleep inhibitor is unchanged. The old `hypridle.conf` is not
  autostarted. Hyprland's explicit `misc:mouse_move_enables_dpms = true` and
  `misc:key_press_enables_dpms = true` independently wake outputs on input,
  even if the shell's idle return-action owner has exited.
- **Lock screen.** `lock.enableFprint` and `lock.enableHowdy` are false. Manual
  lock authenticates through Guix's `login` PAM stack and the root-setuid
  `/run/privileged/bin/unix_chkpwd`. Do not hand-write PAM files or loosen
  helper permissions. Test a real password unlock from a spare logged-in TTY
  before relying on the locker.
- **Weather.** `services.weatherEnabled` is false, and the dashboard weather tab
  is hidden.
- **Applications and wallpaper.** The shell's apps are Kitty, pavucontrol and
  Thunar. `paths.wallpaperDir` is `~/Pictures/Wallpapers` in both the mutable
  `~/.config/caelestia/shell.json` and the tracked `shell.seed.json`. This is
  the picker directory and matches the directory already used by CLI random
  wallpaper selection; it does not turn on rotation or choose a new wallpaper.
  The seed supplies this value only when the mutable file is absent. On
  2026-09-30, read-only `env WAYLAND_DISPLAY=wayland-1 caelestia shell
  wallpaper list` returned 22 absolute paths, all under
  `/home/tay/Pictures/Wallpapers`, and `env WAYLAND_DISPLAY=wayland-1 caelestia
  shell wallpaper get` returned the unchanged
  `/home/tay/Pictures/Wallpapers/1767891491823566.png`. No visual picker
  screenshot verification was performed.

The tracked tidal-dusk wallpaper now lives at the neutral path
`~/.config/hypr/wallpapers/`, as `tidal-dusk.svg` plus a 5120x1440
`tidal-dusk.png`; the CLI rejects SVG. After `cli.json` has been checked, select
it with:

```sh
caelestia wallpaper -f ~/.config/hypr/wallpapers/tidal-dusk.png
```

The current selection is stored in `~/.local/state/caelestia/wallpaper/path.txt`.

#### Controls

All chords below use physical **RAlt / Mod1**; physical LAlt remains
application Meta / Mod3. No terminal, focus, window movement, workspace,
group, special workspace, or Alt+x prefix binding was moved:

| Chord | Action |
|---|---|
| Alt+Space | Caelestia launcher (`drawers toggle launcher`; replaces Rofi here only) |
| Alt+D | Dashboard (`drawers toggle dashboard`) |
| Alt+A | Utilities / quick controls (`drawers toggle utilities`) |
| Alt+Comma | Nexus settings window (`nexus open`) |
| Alt+N | Sidebar with notification centre (`drawers toggle sidebar`) |
| Alt+B | Bottom SilverBullet pane (`panes toggle silverbullet`); same chord hides |
| Alt+M | Top native Memos pane (`panes toggle memos`); same chord hides |
| Alt+I | Left glirc pane (`panes toggle chat`); same chord hides |
| Alt+Shift+V | Clipboard history (`caelestia clipboard`); Alt+V still toggles tiling split |
| Alt+Ctrl+L | Manual Caelestia lock (`lock lock`) |
| Alt+G / Alt+Shift+G | Area / full desktop screenshot (replaces Print-key chords, 2026-10-02) |
| Alt+Shift+A | pavucontrol audio mixer |
| Alt+Shift+N | NetworkManager connection editor |
| Alt+Shift+E | Screenshots folder in Thunar |
| Alt+Shift+/ (Alt+?) | Toggle keybinding help (`keybind-help.py`) |

Alt+? is bound by keysym as `bindd = $mainMod SHIFT, slash, ...`; the
manna-cadet XKB key `<AB10>` produces `slash`/`question`, and Hyprland matches
the unshifted keysym with the Shift modifier. The binding is unchanged; it now
opens a transient **Quickshell overlay**, not Kitty/less. A centered card uses
the monitor focused when opened; other monitors dim and capture pointer input.
The sole exclusive keyboard grab and shortcut inhibitor follow Hyprland's
focused monitor, while the card remains on its opening monitor. Each opening
reads `hyprctl -j binds`, categorizes the current bindings, and includes submaps such as Alt+x `stumpwm`
and Alt+y layout controls. Rows prefer `bindd` descriptions; complete repeated
families are compacted while partial/custom families stay explicit. Colors
track Caelestia's `$XDG_STATE_HOME/caelestia/scheme.json` (by default
`~/.local/state/caelestia/scheme.json`).

Any **new key or mouse-button press** dismisses the card. It consumes the
matching release before the process exits, preventing desktop shortcuts and
click-through; the opening chord's releases and held-key autorepeat are ignored.
The wheel scrolls long lists without dismissing. A second helper invocation
closes only this QML instance, leaving Caelestia and other Quickshell instances
alone. After the consumed release, QML invokes internal `--dismiss PID`:
configuration, process owner and executable are checked before pidfd-scoped
SIGTERM. This avoids a hanging `Qt.quit()` teardown in the installed runtime
and leaves no invisible help process. The old terminal window rule is removed.

Deploy both `keybind-help.py` and `keybind-help.qml`. The helper resolves the
exact `qs` runtime dependency of the installed Guix `caelestia-shell` wrapper,
not a generic `qs` from `PATH`, and launches a standalone QML configuration on
demand. No new package, persistent daemon or Caelestia IPC extension is required.
Runtime failures are reported on stderr, not hidden behind a terminal fallback.

2026-09-30 live smoke: real QML `grabToImage` captures visually confirmed
readable grouped themed keycaps without clipping on G9 (2100×1392 card) and
CRT (752×552 with a scroll affordance). Injected Escape dismissed the card and
the process exited; right-click on the displayed monitor and middle-click on
the other monitor also dismissed it. Caelestia PID 7291 remained unchanged.
**Limits:** `grim` compositor captures excluded the overlay, so the visual
evidence is QML render captures, not physical-desktop screenshots. Physical
RAlt+? and actual wheel scrolling are not established by this smoke evidence.
The 2026-09-28 Kitty-popup captures are historical only.
The overlay-exclusion limitation describes that earlier smoke and is
superseded for the current `grim` path by the 2026-10-02 repair below;
it does not retroactively provide a compositor image of the help card.

Screenshot helpers run only on explicit invocation. Cancelling an area
selection saves nothing. Successful captures save unique PNGs under
`~/Pictures/Screenshots` (or `XDG_SCREENSHOTS_DIR`) and copy the **image bytes**
to the Wayland clipboard.

**HDR screenshot repair, deployed 2026-10-02:** persisted
`render:keep_unmodified_copy = 0` next to `render:cm_sdr_eotf = gamma22` in
live-linked `dotfiles/config/.config/hypr/hyprland.conf`. This repairs observed
stale-frame/wallpaper-only `grim` captures while retaining display color:
monitor modes, HDR/VRR, gamma22, SDR brightness 200, brightness 1.2 and
saturation 1.05 unchanged. No compositor restart or modeset; no config errors.
Matching Hyprland 0.55.4 source makes 0 consult `needsACopyFB()` for an
on-demand unmodified copy, rather than keeping a persistent mirror/second
attachment (1 unconditionally; 2 with HDR PQ/HLG plus SDR modifiers). It is
not a global disable of capture copies. **[INFERENCE]** The persistent buffer
path is implicated by comparison, but the exact stale-frame cause is unproven;
this session's verified workaround gives no long-term guarantee.

Real bounded `grim` PNGs were inspected: modes 1/2 stayed stale after replacing
the synthetic window; 0 captured animated counters **1216 → 1222** across a
mixed-monitor workspace transition, replacement **9981**, and **1372 → 1378**
after saving. Geometry `1810,460 880x480` was wholly inside a synthetic 900×500
Kitty at `1800,450`; no private desktop images were retained. Unchanged
`screenshot.sh area` and `full` each exited 0 and produced PNG counter **9981**.
PATH adapters supplied deterministic `slurp` geometry and bounded full mode
to the same region using real `grim`; clipboard/notification sinks preserved
the user's clipboard. Real interactive selection failed. Selection UI, actual
clipboard transfer, physical Right Alt+G / Right Alt+Shift+G and unrestricted
full-desktop capture were **not reverified**. All smoke files removed; original
focus, DP-1 workspace 1 / HDMI-A-1 workspace 10, workspace 1 dualmaster and the
other original dwindle layouts restored. Exact cursor restoration was not
established after the verification kernel lost its baseline. Retained earlier
capture limitations are historical and superseded for the current `grim` path,
not retroactive visual proof of the earlier layout/help-card smokes.

Clipboard history is **session-only**. The watcher and the picker share
`CLIPHIST_DB_PATH=$XDG_RUNTIME_DIR/caelestia-clipboard.db` and a 50-item cap
(`CLIPHIST_MAX_ITEMS`). The supervisor removes this database at start and on
exit, and it never opens or deletes existing persistent cliphist data.
Cliphist 0.7.0 ignores selections that wl-clipboard or password managers mark
`CLIPBOARD_STATE=sensitive`. Unmarked copied secrets can still enter the
temporary history, so do not treat it as a vault. Development must not read
existing clipboard contents or capture the physical desktop as a test.

Hyprland-specific portal routing sends ScreenCast, Screenshot and
GlobalShortcuts to `hyprland`, keeps Settings/default on `gtk` (dark preference)
and Secret on `kwallet`. It is desktop-specific so X clients retain their
existing portal configuration. No shared portal daemon is killed on startup.
Caelestia applies its own blur layer rules only to its `caelestia-drawers`
namespace, at runtime, and does not edit `hyprland.conf`. Direct monitor
recording through `gsr-kms-server` would need privileges that are not
configured. Portal and window capture are unaffected.

`KITTY_WAYLAND_DETECT_MODIFIERS=1` lets Kitty's Wayland GLFW detect the
application Meta/Mod3 key. It affects **new Kitty windows** only. To pick up the
environment, restart the windows, not Kanata or the compositor. The canonical
`input:kb_file` and the physical RAlt/LAlt modifier split are preserved, as are
the Adwaita size-24 cursor settings.

**Which Kitty runs.** `kitty-bitmap` can live in both the user profile and the
Home profile. Login shells search `~/.guix-home/profile/bin` before
`~/.guix-profile/bin`, but the Hyprland session searches them the other way
round. The tracked wrappers `dotfiles/home/.local/bin/{kitty,kitten}` make every
caller agree:

- They exec `~/.guix-profile/bin/<cmd>` when it exists and otherwise fall back
  to the Home profile.
- `~/.local/bin` is already first on both `PATH`s, so no `PATH` change is
  needed.
- The tracked `dotfiles/home/.local/share/applications/{kitty,kitty-open}.desktop`
  entries point `Exec` at the wrapper.

To upgrade Kitty without a Home activation, run
`guix package -L ~/projects/guix-channel/guix -i kitty-bitmap --cores=2
--max-jobs=1`. To go back to the Home copy, remove `kitty-bitmap` from the user
profile. Kitty windows that are already open keep their old binary until they
are reopened. Since 2026-09-28 the user profile has had Kitty 0.49.1
(generation 27); Home generation 88 still has 0.46.2.

#### Deployment and verification, 2026-09-28

The running Hyprland session (PID 12814, instance `…_1571388922`) was switched
from DMS to Caelestia **live**. Hyprland, Kanata, StumpWM and the portals were
not restarted. No full Guix Home or System activation was performed.

**Profile changes.** User profile generation 26 added `caelestia-shell`
(`/gnu/store/ddnpmp15djmaz3y8chw61gm0d3a0fsg5-caelestia-shell-2.5.0`, which
includes the weather-toggle patch), `caelestia-cli`
(`/gnu/store/vfxi9pj8n1df3wzgmknm3qm3bqvyz8r5-caelestia-cli-1.1.3`) and
`polkit-gnome` 0.105. It removed `dank-material-shell-shell-only` and plain
`quickshell`. The earlier unpatched `m5sf2h8g…` shell build is not installed.

**Home configuration check.** The three-load-path
`guix home build --dry-run` of `home-workstation-configuration.scm` exited 0,
with nothing to build. `Hyprland --verify-config` reported ok. A single
`hyprctl reload` returned no config errors and activated the Caelestia binds,
and `kb_file` still points to `spacecadet.xkb`.

**Handover.** The DMS supervisor PID was confirmed from
`/run/user/1000/dms-hyprland.json`, its command line and its parent PID, and
then sent TERM. It tore down only its own process groups and the notification
name was released. Caelestia was then launched with
`hyprctl dispatch exec 'python3 ~/.config/hypr/caelestia-session.py run'`.
`cli.json` was checked before selecting the wallpaper. No
`hypr/scheme/current.conf` and no `templates/` directory were created.

**Smoke results.** The live smoke test verified the following:

- **Bar and monitors.** The DP-1 bar and frame render. The CRT has no bar but
  keeps its wallpaper and drawers.
- **Drawers.** Launcher, dashboard, sidebar and utilities each opened and closed
  over IPC. The launcher fits the 800x600 CRT.
- **Nexus.** The settings window opened.
- **Notifications and system integration.** `notify-send` produced a popup on
  DP-1, and the shell owns Notifications. The volume OSD appeared, and volume
  was restored afterwards. The bar shows wired Ethernet.
- **Clipboard.** The watcher stored a synthetic entry. The user's selection was
  restored byte-identical and the synthetic entry deleted. The `caelestia
  clipboard` picker opened.
- **Weather.** The shell opened no sockets while the dashboard was open, and the
  log shows no weather or geolocation requests.
- **polkit.** polkitd reported that `polkit-gnome` is registered for session
  `c3`.
- **Singleton and lifecycle.** A second `run` exited on the lock. TERM to the
  supervisor removed the shell, watcher, agent, state file and clipboard
  database, and released Notifications. A relaunch restored all of them.
- **Preservation.** Hashes of GTK3/4, qt6ct, Kitty, btop, xkb, `.gtkrc-2.0`,
  portals, the dconf dump and the GNOME interface gsettings were unchanged.

**Evidence.** `~/.cache/caelestia-cutover-smoke.json`,
`~/.cache/caelestia-cutover-smoke/*.png`, and
`~/.cache/caelestia-cutover/{pre,post}-hashes.txt`.

**Not tested.** Real-password unlock, and any lock trigger at all. The 1200 s
display-off timer firing. An actual pkexec authentication dialog. Notification
popups on the CRT. Suspend. Also not yet exercised: a fresh private-bus TTY
login, GDM login, and physical-keyboard chords. On the tiled 800x600 CRT the
Nexus window is cramped and its labels are truncated.

**Log warnings.** The shell log has benign warnings: no `~/.face`, no
PowerProfiles, startup null-screen TypeErrors, and DDC brightness on monitors
without DDC.

**Leftovers.** The stale runtime files `dms-hyprland.lock`,
`danklinux-18982.pid` and old Quickshell by-id/by-pid directories were left
untouched.

#### Rollback data

The 2026-09-28 cutover kept `~/.config/DankMaterialShell/`,
`~/.local/state/DankMaterialShell/`, the superseded DMS settings/session files
and the GTK/Kitty `dank-*` files as inert user data. Nothing reads them any
more, and they were not deleted. Pre-cutover copies of the tracked and live
Hyprland and DMS files, and of this document and the Home package declaration,
are under `~/.local/state/caelestia-cutover-backup/20260928T182913Z/`.

Rolling back means restoring those files and the repository history. The DMS
packages are in user profile generation 25 (`guix package --roll-back`). Stop
the Caelestia supervisor first. Only one shell may own the notification name,
so never run both shells at the same time.

### Historical: DankMaterialShell 0.5.1 (superseded 2026-09-28)

> **Not active instructions.** The shell below was replaced by Caelestia on
> 2026-09-28. Its helper (`dms-session.py`), seeds, and package declaration were
> removed from the repositories. This record keeps the verification that was
> performed at the time; it is not a current procedure.

Before the cutover, the session ran
[DankMaterialShell v0.5.1](https://github.com/AvengeMedia/DankMaterialShell/tree/v0.5.1)
as the channel's `dank-material-shell-shell-only` variant on Quickshell 0.3.0.
It was supervised by `dms-session.py`, which ran `dms -c
~/.guix-profile/share/quickshell run --session` in the foreground and had the
same singleton, compositor-ownership and scoped-teardown design as the current
supervisor. Its differences from the current setup were:

- It used the clipboard database `$XDG_RUNTIME_DIR/dms-clipboard.db`.
- It set `DMS_DISABLE_MATUGEN=1` and `DMS_DISABLE_HOT_RELOAD=1`.
- It relied on DMS's built-in polkit agent.
- Display-off happened at 600 s according to the seed; the GUI setting had
  been changed to 1200 s.

Isolated runtime verification on 2026-09-27 exercised supervisor singleton,
Spotlight/control-center/settings/notification IPC and visible surfaces, owned
test-text clipboard history with sensitive-state exclusion, and a full screenshot
on the isolated compositor yielding a valid PNG and `image/png` clipboard.
Compositor exit stopped the supervisor and removed its ephemeral clipboard DB
and runtime state. A manual lock surface rendered; real password unlock was not
attempted. Evidence: `~/.cache/hyprland-dms-shell-smoke.json` and the associated
launcher/controls/notifications/settings/lock smoke images. This is isolated
proof, not fresh GDM login or physical keyboard verification.

The final shell-only variant was installed and started in the actual running
Hyprland session on 2026-09-27 through compositor `exec`, inheriting its real
elogind session `c3` rather than stale agent-shell session variables. DMS's
polkit agent initialized without errors, and NetworkManager/BlueZ registered.
The parent deliberately terminated only the verified old Dunst PID 29199;
the notification bus owner became Quickshell PID 18995, and `notify-send` worked.
Live layers confirmed bar/dock on DP-1 only, with only wallpaper on the CRT.
The launcher and control center visibly rendered Papirus icons, Ethernet
connected, Bluetooth off, the real HD-Audio Generic output and Yeti Nano input.
GTK3/GTK4 and qt6ct file hashes/symlinks remained unchanged across startup.
Settings/session seeds initialized regular mutable files, and duplicate startup
returned zero without changing existing settings. Evidence:
`~/.cache/hyprland-dms-live-smoke.json` and cropped surface images
`~/.cache/hyprland-dms-live-{controls,launcher}.png`.

At that time, real password unlock, a fresh private-bus login, GDM session
discovery/login, physical keyboard shortcuts and actual portal screen sharing
had not been exercised. No Kanata, input service, compositor, wallet agent or
shared Home service was restarted by that integration.

## Halloy IRC client

Halloy 2026.8 is declared in `home-workstation-configuration.scm` and packaged
locally at `~/projects/guix-channel/guix/tay/packages/halloy.scm`. For the
scoped user-profile install, without activating unrelated pending Home changes:

```sh
~/.config/guix/current/bin/guix install \
  -L ~/projects/guix-channel/guix --cores=2 --max-jobs=1 halloy
```

The live `~/.config/halloy` directory links to the `config` Stow package at
`~/src/dotfiles/config/.config/halloy/` (`config.toml`, public pinned ZNC
certificate and theme). Halloy retrieves the ZNC password from the existing
`rbw` vault at connection time; no secret is in the package, dotfiles or Guix
store. Unlock the vault yourself if needed; preserve its session. The public
certificate trusts only the corrected TrueNAS ZNC endpoint, not system-wide
TLS. The running Hyprland session launched Halloy directly; there is no
Caelestia popup. Client selection, ZNC certificate/rollback details and the
terminal trials are recorded in
[`~/okf/network/services/irc-clients.md`](../../okf/network/services/irc-clients.md).

### Terminal IRC clients alongside Halloy

Stock Guix glirc 2.41 and locally packaged `catgirl-openssl` 2.2a are
declared in the workstation Home package list and installed in tay's user
profile. The final scoped `guix install` transaction succeeded (36 packages);
**no full Home reconfigure** was activated. The local package module at
`~/src/guix-config/modules/tay/catgirl.scm` replaces catgirl's LibreSSL input
with LibreTLS 3.8.1 over OpenSSL; to install it with the pinned Guix:

```sh
~/.config/guix/current/bin/guix install \
  -L ~/src/guix-config/modules catgirl-openssl glirc
```

No new channel joins, parts, nick changes or private/channel messages were
made. Keep Halloy and the existing ZNC settings unchanged.

Run `glirc` in a real terminal for all 13 *existing* ZNC networks at once.
The live `~/.config/glirc/config` symlinks directly to
`~/src/dotfiles/config/.config/glirc/config`. ZNC owns the saved channel list;
the config has no join commands. Built-in `password.command` calls `rbw get`
with the vault item identifier when each connection starts; no environment
wrapper or stored password is needed. It trusts the existing public
`~/.config/halloy/znc-truenas.pem` and verifies the endpoint IP SAN on TLS
`:8887`; do not turn verification off. If rbw is locked, unlock it yourself;
do not lock/logout or reset its agent as cleanup. Avoid printing IRC content.

In glirc, Ctrl+n/p cycles windows, Ctrl+x cycles network windows, Alt+a jumps
to activity, Alt+s returns to the previous window; F2/F3/F5 toggle detail,
activity-bar and split views. `/keymap` shows built-in bindings and `/exit`
leaves the client. During passive trials do **not** enter a plain chat line,
`/msg`, `/query`, `/join`, `/part`, `/nick`, `/quote` or `/quit`. A live Kitty
session displayed received server text, status and activity; Ctrl+x switched
focus. Passive readback showed 15 established TLS sockets to ZNC, but neither
all upstream network health nor historical replay was proven.

Run `catgirl-znc` for `libera`, or `catgirl-znc NETWORK` for one of the
13 existing ZNC networks; `catgirl-znc --help` lists them. Its tracked
launcher and endpoint config are at `~/src/dotfiles/home/.local/bin/catgirl-znc`
and `~/src/dotfiles/config/.config/catgirl/znc`, directly linked at
`~/.local/bin/catgirl-znc` and `~/.config/catgirl/znc`. It passes the rbw
password through a pipe, not process arguments, environment, Git or store.
Stock catgirl's LibreSSL 4.2.1 rejected the existing `CA:FALSE` self-signed
endpoint certificate. The local LibreTLS/OpenSSL variant successfully
connected to the existing PEM, without catgirl's insecure mode or ZNC change.
**Catgirl's upstream `trust` checks that certificate but disables hostname/IP
verification**, unlike glirc's IP-SAN check. A desktop Kitty
`catgirl-znc libera` session showed received server status with no visible
TLS/auth error and one established TLS socket to `:8887`; Ctrl+n/p navigated
locally. Exit with Ctrl+c. Do not type messages or channel/nick-changing
commands. Other networks and historical replay remain unverified.

On 2026-09-29, networks `no` and `nog` were deleted through ZNC webadmin
and removed from all three managed client configurations. The remaining
13 networks matched the persisted ZNC configuration. Existing glirc sessions
can use the local `/reload` command to reread configuration; no client restart
or automatic command injection was performed, preserving any draft input.

## Printing

The system configuration already runs `cups-service-type` (web interface,
`cups-filters`, `brlaser`, `hplip`). The workstation Home package list adds
`okular` and `cups` (client commands such as `lp`, `lpstat` and `lpoptions`).

On 2026-09-27 both were installed imperatively into the user profile with
`guix install okular cups` (Okular 25.12.3, CUPS 2.4.14). No Guix Home or
System reconfiguration was run for this; the already-running CUPS 2.4.14
scheduler on `localhost:631` was used unchanged. A later `guix home
reconfigure` supplies the same packages declaratively.

The Brother HL-L2350DW is a monochrome laser printer with duplex, used with
Letter paper. It is queued as a driverless IPP Everywhere printer at its
documented address `192.168.1.218`. Its `.local` name resolves through Avahi
but not through libc name resolution, so the queue uses the IP. Reproduce the
queue, per-user default printer and per-user double-sided (long-edge) default
with:

```sh
sudo lpadmin -p Brother -E -v ipp://192.168.1.218/ipp/print -m everywhere \
  -D 'Brother HL-L2350DW'
lpoptions -d Brother
lpoptions -p Brother -o sides=two-sided-long-edge -o Duplex=DuplexNoTumble
```

The `lpoptions` settings are per-user and persist in `~/.cups/lpoptions`; they
do not change the system queue's defaults. Double-sided long-edge
(`DuplexNoTumble`) is the default for `tay`; choose one-sided in the print
dialog or with `lp -o sides=one-sided` when needed.

Check with `lpstat -p Brother -d` and `lpoptions -p Brother -l` (the `Duplex`
line should show `*DuplexNoTumble`), then print from Okular (File → Print) and
select `Brother`.

On 2026-09-27 the live Okular Print dialog was visually verified with `Brother`
selected and Type `HL-L2350DW series - IPP Everywhere`. A test PDF was opened in
Okular and its print dialog was submitted; CUPS job `Brother-1` (one page,
14k) completed at 16:16:33 EDT. The printed page's physical output and quality
have not yet been confirmed. The double-sided default was applied afterwards
the same day. `~/.cups/lpoptions` then contained `Default Brother
Duplex=DuplexNoTumble sides=two-sided-long-edge`, and `lpoptions -p Brother -l`
showed `*DuplexNoTumble`. The Okular Print dialog was then reopened and a second
one-page test (`brother-print-test.pdf`) was submitted. For CUPS job
`Brother-2`, an IPP Get-Job-Attributes check expecting `sides` =
`two-sided-long-edge` passed, and the job reported `job-state` completed. This
shows the job was submitted in double-sided mode. Physical two-sided output
is still untested, because a one-page document prints on only one side.

### HP Officejet 7610

An HP Officejet 7610 was discovered on the LAN at `192.168.1.120`. It is
queued, like the Brother, as a driverless IPP Everywhere printer by IP. The
Brother remains the per-user default printer.

The HP does not do automatic duplex printing. Its IPP attributes advertise
long/short-edge duplex, but the user reports the device lacks it, and no duplex
accessory has been verified; the IPP advertisement is not proof that the
hardware can print two-sided. The per-user HP default is therefore one-sided.
The queue was created on 2026-09-27 with the user's authorized `sudo`;
reproduce the queue and the current preference with:

```sh
sudo lpadmin -p HP_Officejet_7610 -E -v ipp://192.168.1.120/ipp/print \
  -m everywhere
lpoptions -p HP_Officejet_7610 -o sides=one-sided -o Duplex=None
```

Do not run `lpoptions -d` for this queue unless the HP should become the
default; `lpstat -d` should still report `Brother`. Check with
`lpstat -p HP_Officejet_7610 -d` and `lpoptions -p HP_Officejet_7610 -l`
(`Duplex` should show `*None`), then print from Okular and select
`HP_Officejet_7610`. Do not select two-sided printing for the HP.

After the correction on 2026-09-27, `lpoptions -p HP_Officejet_7610 -l` showed
`Duplex` `*None`, and `~/.cups/lpoptions` contained `Default Brother
Duplex=DuplexNoTumble sides=two-sided-long-edge` and `Dest HP_Officejet_7610
Duplex=None sides=one-sided`. No new print job was submitted for this check.

Historical record (superseded): the HP queue was first given the same
long-edge duplex preference as the Brother (`-o sides=two-sided-long-edge -o
Duplex=DuplexNoTumble`), because the printer advertised duplex over IPP.
`lpstat -d` then reported `Brother` as the default destination, and
`~/.cups/lpoptions` contained `Dest HP_Officejet_7610 Duplex=DuplexNoTumble
sides=two-sided-long-edge`.

On 2026-09-27, before the one-sided correction, the live Okular Print dialog
was visually verified with `HP_Officejet_7610` selected, the correct printer
Type shown and the Print button enabled. Test job `HP_Officejet_7610-3` was
rendered, accepted by the device and submitted with `sides` =
`two-sided-long-edge`. After a 300-second wait, CUPS still reported `Waiting
for job to complete`, and the printer reported `processing` with
`maintenanceInProgress` and `spool-area-full-report`, with one job queued. A
direct IPP Get-Jobs query to the printer showed its job 1
(`hp-print-test.pdf`) with `job-impressions-completed` = 2 and
`job-media-sheets-completed` = 1, which match the job's totals. The job was
still `job-state` = `processing`. The job's completion and physical output are
not confirmed, and its cause is not established; this historical test is not
evidence that the HP can duplex. The printer's maintenance state is still
unresolved. Resolve it at the device before retrying. The device was not reset
and no further jobs were submitted.

### HP Officejet 7610 scanning

The Officejet 7610 scans over eSCL (AirScan) through `sane-airscan`, found by
Avahi auto-discovery; no scanner configuration file is edited and `hplip` or
`xsane` is not needed. The system's `sane-service-type` (from
`%desktop-services`, `sane-backends` 1.4.0) has no eSCL backend and needs no
change. The workstation Home package list declares `sane-backends` (for
`scanimage` and the `SANE_CONFIG_DIR` / `SANE_BACKEND_LIB_PATH` search paths),
`sane-airscan` and `simple-scan`. Keep `sane-backends` and `sane-airscan` in the
same profile so the `dll.d/airscan` entry and `airscan.conf` are on the search
path.

On 2026-09-27 the three packages were installed imperatively into the user
profile with `guix install sane-backends sane-airscan simple-scan`
(sane-backends 1.4.0, sane-airscan 0.99.36, simple-scan 49.1). No Guix Home or
System reconfiguration was run; a later `guix home reconfigure` supplies the
same packages declaratively.

The profile's search paths take effect at login. A desktop session started
before installation keeps the old system-only SANE paths (set by
`sane-service-type` through `/etc/environment`), so GUI apps started from
existing launchers do not see the scanner until relogin. For the current
session on 2026-09-27, two temporary workarounds were applied:

- Runtime only: `hyprctl -i 0 keyword env` put the user-profile
  `SANE_CONFIG_DIR` and `SANE_BACKEND_LIB_PATH` ahead of the system ones in the
  live Hyprland session. This is lost at logout.
- A plain user file `~/.local/share/applications/org.gnome.SimpleScan.desktop`
  was added. It is a copy of the installed entry with only this line changed:

  ```
  Exec=env SANE_CONFIG_DIR=/home/tay/.guix-profile/etc/sane.d SANE_BACKEND_LIB_PATH=/home/tay/.guix-profile/lib/sane /home/tay/.guix-profile/bin/simple-scan
  ```

  It is deliberately not declared in Guix Home. After a relogin the login
  profile exports these paths, so the file is optional and safe to delete.

The equivalent launch from a shell in the old session is:

```sh
SANE_CONFIG_DIR=$HOME/.guix-profile/etc/sane.d \
SANE_BACKEND_LIB_PATH=$HOME/.guix-profile/lib/sane simple-scan
```

Check and scan from a fresh login shell:

```sh
scanimage -L
scanimage -d 'airscan:e0:Officejet 7610 series [6B0888]' -A
scanimage -d 'airscan:e0:Officejet 7610 series [6B0888]' --source Flatbed \
  --mode Gray --resolution 75 -x 215.9 -y 279.4 --format=png -o scan.png
```

On 2026-09-27, in a fresh `bash -l` environment, `scanimage -L` listed
`airscan:e0:Officejet 7610 series [6B0888]` (IP `192.168.1.120`), and
`scanimage -A` showed sources Flatbed and ADF, modes Color and Gray, and
75–1200 dpi. The Letter-size flatbed scan above produced a valid 637x825 8-bit
grayscale PNG in 5.7 s. The image content was not viewed, and the test file
was then deleted. Simple Scan 49.1 was then started through the override entry
(`gio launch`) on Hyprland. Its process environment had the user-profile SANE
paths. A screenshot showed Document Scanner at "Ready to Scan" with "eSCL
Officejet 7610 series [6B0888]" selected, no "No scanners detected" error, and
the Scan button enabled. No scan was run from the GUI. ADF scans, color scans
and a scan from the Simple Scan GUI have not been exercised.


## Hardware acceptance checks

Run these early in the return window. Save failures and relevant kernel output before changing the configuration.

### Storage and EFI

```sh
findmnt --target /
findmnt --target /boot/efi
swapon --show
test -d /sys/firmware/efi && echo "UEFI boot confirmed"
```

Expect Btrfs UUID `b19ca7a2-0762-4d14-91fd-484dbd9d7ee9` on `/`, FAT32 UUID `521A-DCFF` on `/boot/efi`, and swap UUID `d23519bc-ece4-4a0d-b4db-224d6e2c6f58`. There is no separate `/home` filesystem.

### CPU microcode and Radeon 780M

```sh
sudo dmesg | grep -i microcode
lspci -nnk | grep -A3 -Ei 'VGA|Display'
ls -l /dev/dri
glxinfo -B
```

Expect `amdgpu` as the kernel driver, `/dev/dri/card0` and `/dev/dri/renderD128`, and the Radeon 780M rather than `llvmpipe` as the renderer.

### Wired and wireless networking

```sh
lspci -nnk | grep -A3 -Ei 'Ethernet|Network'
ip -brief link
sudo dmesg | grep -Ei 'igc|mt7921|firmware'
nmcli device status
```

Expect both I226-V controllers to use `igc` and the MT7922 to use `mt7921e`. Test each interface separately with a sustained transfer. Disconnect Ethernet while testing Wi-Fi so traffic cannot silently use the wired route.

### Bluetooth

```sh
rfkill list bluetooth
bluetoothctl show
bluetoothctl scan on
```

Confirm that discovery, pairing, and reconnection work with a real device. Stop scanning with `bluetoothctl scan off`.

### USB4

```sh
lspci -nnk | grep -A3 -Ei 'USB4|Thunderbolt'
lsmod | grep -E 'thunderbolt|typec'
sudo dmesg | grep -Ei 'usb4|thunderbolt|type-c|typec'
```

Test every USB4-capable port with a known-good USB4 or Thunderbolt device, including transfer, hot-plug, unplug, and display output where applicable.

### Audio

```sh
aplay -l
pactl list short sinks
pactl list short sources
```

Test analog, HDMI or DisplayPort, Bluetooth, and every microphone path that matters.

#### Real-time scheduling and quantum floor (2026-10-07)

Choppy audio on the DP sink `alsa_output.pci-0000_c6_00.1.hdmi-stereo`
(Odyssey G95SC) came from two causes. First, `pw-top` error counters rose on
the sink, WoW and Firefox at quantum 256 / 48 kHz. Second, PipeWire's
data-loop thread ran at normal priority. Shepherd's `herd` logs showed RTKit
`ServiceUnknown` because `%desktop-services` does not include
`rtkit-service-type`, and tay's `RLIMIT_RTPRIO` is 0.

**Permanent configuration.**

- `config-k8-plus.scm` adds `(service rtkit-service-type)` from
  `(gnu services dbus)`. It sets up the D-Bus activation file, the polkit
  actions and the `rtkit` system account. A `pam-limits` rtprio entry would not
  help, because pam_limits only covers login, greetd, gdm-password, sshd and
  similar PAM services. **Deployed:** System generation 19
  (`/gnu/store/f8nxsswlgg9lbckvn15pabh62z3i0ixs-system`). Its scope review
  found the kernel, initrd and profile unchanged. The only additions were the
  rtkit 0.14 package and its account, D-Bus and polkit wrappers. Activation
  used the deployed channels and exited 0:

  ```sh
  sudo ~/.config/guix/current/bin/guix time-machine \
    -C /run/current-system/channels.scm -- \
    system reconfigure ~/src/config-k8-plus.scm
  ```

  A root `ReloadConfig` of the system bus also exited 0. RealtimeKit1 now
  answers and reports a `MaxRealtimePriority` of 20.
- `home-workstation-configuration.scm` adds the basedbox-only simple-service
  `basedbox-pipewire-min-quantum`, and `modules/tay/home-common.scm` keeps
  `.config/pipewire` out of the shared stow. It installs two fragments:
  - `dotfiles/config/.config/pipewire/pipewire.conf.d/10-basedbox-min-quantum.conf`
    sets `default.clock.min-quantum = 1024` and
    `module.rt.args = { rtportal.enabled = false }`.
  - The matching `pipewire-pulse.conf.d` fragment sets
    `module.rt.args = { rtportal.enabled = false }` and
    `pulse.min.quantum = 1024/48000`.

  `rtportal.enabled = false` is needed because module-rt tries the
  xdg-desktop-portal Realtime interface before RTKit. In portal 1.20.3,
  `map_pid` fails with `ENOTDIR` on its pidfd and module-rt does not fall back.
  A restarted PipeWire therefore spent about 3 × 25 s in startup and ended up
  with no RT priority.

  Both fragments are linked directly from source into `~/.config/pipewire/`
  until the next `rbh`. Home was not activated; its dry run completed, with
  warnings from the existing nhfourk/winrm module syntax. The parent checked
  the parse with `pw-config -n pipewire.conf merge context.properties`, which
  showed `default.clock.min-quantum = 1024` and
  `module.rt.args = { rtportal.enabled = false }`. The pulse config showed the
  same `context.properties` and a `pulse.properties` `pulse.min.quantum` of
  `1024/48000`. Only the `pw-config` parser was run; no isolated PipeWire
  process was started. The `rtportal.enabled =
  false` setting reaches the running daemons through these source links. It
  only takes effect on a fresh-login start of PipeWire, and that has not
  happened yet.

**Current session, after the PipeWire restart (2026-10-07).** PipeWire and
pipewire-pulse were restarted without a reboot or a Home activation. Home
Shepherd started them at first login, and they still start under the dead
elogind session `c2`. RTKit's stock policy denies requests from that session.
There is deliberately no custom polkit rule and no desktop restart, so this
stale-session authorization stays unresolved for daemons that start
automatically in this login.

- Real-time priority comes only from a manual graphical polkit `chrt`. Both
  new data-loop threads were verified at `SCHED_FIFO` 20: tid 5388 in PipeWire
  PID 5379, and tid 5962 in pipewire-pulse PID 5959. Another restart loses it.
- The min-quantum 1024 floor is loaded and `clock.force-quantum` is 0. The
  sink actually ran at 2048/48000, which the parent judged a valid result of
  the pulse floor.
- `wpctl` showed Firefox Nightly (node 85) active and routed to the Odyssey
  G95SC monitor sink (node 54). The Yeti source was unchanged.
- Over 60 s, all 59 active samples had the sink (node 54) at 2048/48000. Sink
  errors stayed at 0 and Firefox (node 85) errors stayed at 0.
- WoW had no stream after the restart, so it was not tested in this final
  configuration.

Before the restart, at a forced quantum of 1024, a 60 s sample with all 59
active samples on the sink at 1024/48000 showed no new errors. The sink (node
109) stayed at 541, WoW (node 112) at 900, and Firefox Nightly (node 108) at 0.

Direct RTKit scheduling needs both the disabled portal path and an active
session. It first applies after the next fresh reboot or login and has not
been verified yet. Do not reboot just for this.

Checks to run after the next fresh login:

```sh
busctl --system call org.freedesktop.DBus /org/freedesktop/DBus \
  org.freedesktop.DBus ListActivatableNames | grep -o RealtimeKit1
herd log pipewire          # no portal ENOTDIR retries, no RTKit errors
chrt -p <data-loop tid>    # SCHED_FIFO/RR, priority capped at RTKit's max of 20
pw-metadata -n settings 0 clock.min-quantum   # expect 1024
pw-top                     # ERR should stay flat under load
```

### Suspend and resume

```sh
loginctl suspend
```

After resuming, verify networking, audio, and display output, then inspect recent warnings:

```sh
journalctl -b -p warning --since "10 minutes ago"
```

Repeat after using Wi-Fi and Bluetooth and with the display attached.

### 5120x1440 at 240 Hz

Use a cable and port rated for the required bandwidth:

```sh
xrandr --query
xrandr --verbose
```

If `5120x1440` at `240` Hz is offered, select it in LXQt and confirm the active mode with `xrandr`. Test fullscreen motion, display sleep, suspend and resume, and reconnect.
