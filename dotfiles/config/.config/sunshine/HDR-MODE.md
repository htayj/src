# Sunshine HDR mode

The normal `sunshine.service` remains the non-disruptive SDR mode: it captures a private `Xvfb :99` display and does not touch the normal `:0` desktop.

HDR streaming on Linux needs Sunshine's KMS capture path and gamescope's DRM backend on a real connector. That is intentionally a disruptive mode.

## Start HDR mode

From the graphical desktop, switch to a real TTY and stop the display manager first:

```sh
# Ctrl+Alt+F3, log in
sudo systemctl stop display-manager.service
sunshine-gamescope-hdr --yes
```

Defaults:

- resolution: `1920x1080`
- refresh: `60`
- preferred DRM output: `DP-1`
- Sunshine config: `~/.config/sunshine/sunshine-hdr.conf`

Override as needed:

```sh
SUNSHINE_HDR_WIDTH=3840 \
SUNSHINE_HDR_HEIGHT=2160 \
SUNSHINE_HDR_REFRESH=120 \
SUNSHINE_HDR_OUTPUT=DP-1 \
sunshine-gamescope-hdr --yes
```

If Sunshine chooses the wrong KMS output, pass an output id/name reported in the Sunshine log:

```sh
SUNSHINE_HDR_OUTPUT_NAME=DP-1 sunshine-gamescope-hdr --yes
```

## Return to normal mode

Stop HDR mode with `Ctrl+C`, then restart your desktop and the normal SDR Sunshine service:

```sh
sudo systemctl start display-manager.service
sunshine-sdr-mode
```
