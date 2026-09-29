# Basedbox deployment and hardware acceptance

Use this runbook with `/home/tay/src/config-k8-plus.scm`. The GMKtec K8 Plus is already installed. Do not repartition or format it.

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
~/.guix-profile/bin/start-hyprland -- \
  --config ~/.config/hypr/hyprland.conf
```

The system package list also includes Hyprland for **future** GDM discovery.
Guix's GDM service searches the system profile's `share/wayland-sessions`, not
the user's Home/profile directory. The package supplies
`share/wayland-sessions/hyprland.desktop` with `Exec=start-hyprland`. It becomes
available in GDM only after an authorized system deployment; user installation
alone does not add the chooser entry. Root authorization is not needed for the
TTY route. Do not loosen device/store permissions or restart GDM to add it.

To deploy only this package addition, instead of unrelated edits in
`~/src/config-k8-plus.scm`, an administrator can inherit the immutable running
configuration. First review the pinned channels and dry-run plan, then run the
same command without `--dry-run` only with approval:

```sh
sudo ~/.config/guix/current/bin/guix system reconfigure --dry-run -e '
(begin
  (use-modules (gnu) (gnu packages))
  (let ((base (load "/run/current-system/configuration.scm")))
    (operating-system
      (inherit base)
      (packages (cons (specification->package "hyprland")
                      (operating-system-packages base))))))'
```
The unprivileged dry-run of this expression succeeded on 2026-09-27 and
reported 282.5 MB of downloads. It was not activated: `sudo -n` requires the
operator's password.


This still requires administrator authorization and a normal Guix System
activation; it is not an unprivileged GDM workaround. Do not execute the full
repository System reconfigure just for Hyprland, and leave the active
StumpWM/Xorg session running.

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
and the standalone `polkit-gnome` agent, plus `cliphist`, `grim`, `slurp`,
`wl-clipboard`, Python, D-Bus, `papirus-icon-theme` and `qt6ct`. Caelestia
contains no polkit agent, so GUI privilege prompts in the Hyprland session come
from `polkit-gnome`. The session helper starts that agent, which runs only in
the Hyprland session and not in the StumpWM/X session. To add the shell to the
user profile without activating unrelated Home changes:

```sh
~/.config/guix/current/bin/guix install \
  -L ~/projects/guix-channel/guix --cores=1 --max-jobs=1 \
  caelestia-shell caelestia-cli polkit-gnome
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
`screenshot.sh`, `start-session.sh`, `hyprland.conf`, and the `wallpapers/`
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
portal ownership intact. GDM's stock session entry still uses `start-hyprland`.
The supervisor also works there, but it refuses to start if another process
already owns the notification name. Private-bus KWallet activation and a fresh
GDM login need separate verification. Existing shared-bus Home wallet and
PipeWire services are not restarted.

#### Session supervisor lifecycle

Hyprland's only autostart is:

```text
exec-once = python3 ~/.config/hypr/caelestia-session.py run
```

`caelestia-session.py run` performs these steps:

1. It resolves `caelestia-shell`, `caelestia`, `wl-paste`, `cliphist` and
   `libexec/polkit-gnome-authentication-agent-1` from `~/.guix-profile`, then
   from `~/.guix-home/profile`. If any of them is missing, it refuses to start.
2. It holds the per-user `flock` `$XDG_RUNTIME_DIR/caelestia-hyprland.lock`. A
   second `run` exits 0 without doing anything.
3. It seeds the absent mutable config from the tracked `*.seed.json` files. It
   refuses to start unless `~/.config/caelestia/cli.json` sets **all 15**
   `theme.enable*` flags explicitly to `false`.
4. It refuses to start if `org.freedesktop.Notifications` already has an owner
   on the session bus. It never kills Dunst or another shell.
5. It starts three children, each in its own process group: `caelestia-shell -n`
   in the foreground, `wl-paste --watch cliphist store`, and the `polkit-gnome`
   agent. Their output goes to `~/.local/state/caelestia/hyprland-session.log`.
6. It records `{instance, pid, shell}` in `$XDG_RUNTIME_DIR/caelestia-hyprland.json`.

The children get `QT_QPA_PLATFORMTHEME=qt6ct`, so the Papirus-Dark icons from
`~/.config/qt6ct/qt6ct.conf` apply to them. No global Qt platform-theme variable
is set. The supervisor removes `QML_IMPORT_PATH` and `QML2_IMPORT_PATH` from the
children's environment, because any plain `quickshell` QML modules still in a
profile would shadow the pinned build.

The supervisor stops when the compositor exits, when it receives SIGTERM/SIGINT,
or when any of its children exits. Before exiting it terminates only its own
process groups and removes its state file and the clipboard database. Never use
a global `pkill`, `killall quickshell`, or systemd user units for this shell.
`hyprctl reload` applies Hyprland config edits without running `exec-once`
again, so it neither duplicates nor restarts the shell. To restart the shell,
send SIGTERM to the supervisor `pid` recorded in the state file, then run the
helper again from a Hyprland-spawned terminal. Check the log above when startup
fails.

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
  autostarted.
- **Lock screen.** `lock.enableFprint` and `lock.enableHowdy` are false. Manual
  lock authenticates through Guix's `login` PAM stack and the root-setuid
  `/run/privileged/bin/unix_chkpwd`. Do not hand-write PAM files or loosen
  helper permissions. Test a real password unlock from a spare logged-in TTY
  before relying on the locker.
- **Weather.** `services.weatherEnabled` is false, and the dashboard weather tab
  is hidden.
- **Applications and wallpaper.** The shell's apps are Kitty, pavucontrol and
  Thunar. `paths.wallpaperDir` is `~/.config/hypr/wallpapers`.

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
| Alt+Shift+V | Clipboard history (`caelestia clipboard`); Alt+V still toggles tiling split |
| Alt+Ctrl+L | Manual Caelestia lock (`lock lock`) |
| Alt+Print / Alt+Shift+Print | Area / full desktop screenshot |
| Alt+Shift+A | pavucontrol audio mixer |
| Alt+Shift+N | NetworkManager connection editor |
| Alt+Shift+E | Screenshots folder in Thunar |
| Alt+Shift+/ (Alt+?) | Toggle keybinding help (`keybind-help.py`) |

Alt+? is bound by keysym as `bindd = $mainMod SHIFT, slash, ...`; the
manna-cadet XKB key `<AB10>` produces `slash`/`question`, and Hyprland matches
the unshifted keysym with the Shift modifier. The helper opens a floating,
centred Kitty window (class `hypr-keybind-help`, half the monitor width and 80 %
of its height) running `less` over a table generated at open time from
`hyprctl -j binds`. Every loaded bind, including the Alt+x `stumpwm` submap, is
listed, so the sheet cannot drift from the config. Rows use the `bindd`
description when one exists and otherwise the dispatcher and argument. `q`
quits, `/` searches, and pressing Alt+? again closes only that window. Kitty's
close confirmation is disabled for this window only. Caelestia 2.5.0 has no
native keybinding cheat sheet or IPC target for one.

Deployed live on 2026-09-28 with one `hyprctl reload` (no compositor or shell
restart; every previously loaded bind unchanged). Dispatching the bind's exact
command in the live instance mapped the popup on DP-1, and a second dispatch
closed it.
Evidence: `~/.cache/hyprland-keybind-help-smoke.json` and
`~/.cache/hyprland-keybind-help.png`. The physical RAlt+Shift+/ chord has not
been pressed as part of that test.

Screenshot helpers run only on explicit invocation. Cancelling an area
selection saves nothing. Successful captures save unique PNGs under
`~/Pictures/Screenshots` (or `XDG_SCREENSHOTS_DIR`) and copy the **image bytes**
to the Wayland clipboard.

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

Run `glirc` in a real terminal for all 15 *existing* ZNC networks at once.
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
15 existing ZNC networks; `catgirl-znc --help` lists them. Its tracked
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
