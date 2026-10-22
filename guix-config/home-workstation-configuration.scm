(use-modules (gnu home)
             (gnu home services)
             (gnu home services desktop)
             (gnu home services shepherd)
             (gnu home services sound)
             (gnu home services syncthing)
             (gnu home services xdg)
             (gnu packages)
             (gnu services)
             (gnu services shepherd)
             (guix gexp)
             (guix modules)
             (tay packages caelestia-cli)
             (tay packages caelestia-shell)
             (tay packages caelestia-panes)
             (tay home-common)
             (tay catgirl))

(define %workstation-home-packages
  (append
   (specifications->packages
    '("binutils"
     ;; btmon, bluetoothctl, l2ping. Note that BlueZ 5.79 no longer ships
     ;; hcitool, hciconfig or btmgmt; they were removed upstream, so btmon
     ;; is the supported way to observe link quality and RSSI.
     "bluez"
     "cadr-fonts-latin"
     "cadr-fonts-symbols"
     "calibre"
     "claude-code"
     ;; CUPS client commands (lp, lpstat, lpoptions, lpadmin); the scheduler
     ;; itself is the system config's cups-service-type.
     "cups"
     "curl"
     "dec-fonts"
     "direnv"
     "dmenu"
     "dunst"
     "dconf"
     "gsettings-desktop-schemas"
     "xdg-desktop-portal-gtk"
     "xdg-desktop-portal-hyprland"
     "emacs"
     "firefox"
     "font-unscii"
     "genera-fonts-latin"
     "genera-fonts-symbols"
     "git"
     "github-cli"
     "gucharmap"
     ;; IRC client for the TrueNAS ZNC bouncer; upstream release binary
     ;; packaged in ~/projects/guix-channel (tay packages halloy).
     "halloy"
     "glirc"
     ;; The local libtls/OpenSSL variant accepts the existing ZNC leaf pin.
     ;; Stock catgirl's LibreSSL verifier rejects its self-signed CA:FALSE cert.
     "herdr"
     "htop"
     ;; Optional Wayland session; StumpWM and its X clients stay available.
     "hyprland"
     ;; Version-matched manual tree layout; local channel pins the plugin ABI.
     "hy3"
     ;; Community tiling plugin; declares ABI compat with this Hyprland.
     "hyprland-dualmaster"
     ;; Caelestia shell 2.5.0 pins its own Quickshell; the Hyprland session
     ;; helper owns its lifecycle and a standalone polkit-gnome agent.
     "polkit-gnome"
     "cliphist"
     "grim"
     "slurp"
     "wl-clipboard"
     "python"
     "dbus"
     "xdg-utils"
     "papirus-icon-theme"
     "qt6ct"
     "imagemagick"
     "kitty-bitmap"
     "libnotify"
     "kwallet"
     ;; YubiKey / security-key tooling. The system config runs pcscd and
     ;; installs the udev rules; these are only the user-facing commands.
     ;;   ykman             - configure the key (FIDO2, PIV, OATH, OTP)
     ;;   fido2-token       - low-level FIDO2, from libfido2
     ;;   pamu2fcfg         - enroll a key for PAM, if that is ever wanted
     ;;   opensc/pcsc-tools - smart-card debugging, including the NFC reader
     "libfido2"
     "moonlight-qt"
     "mpd-mpc"
     "mpd"
     ;; PDF/document viewer; prints through the system CUPS scheduler.
     "okular"
     "opencode"
     "opencode-desktop"
     "opensc"
     "openssl"
     "pam-u2f"
     "pavucontrol"
     "pcsc-tools"
     "pinentry-tty"
     ;; For the client tools only: pactl, pacmd, pa-info. PipeWire ships
     ;; pw-* utilities but no pactl, and pavucontrol and various scripts
     ;; still expect it. The pulseaudio *daemon* is not started; PipeWire's
     ;; pipewire-pulse provides the server side, and having the binary on
     ;; PATH does not autospawn it while a PulseAudio socket already exists.
     "pulseaudio"
     "python-yubikey-manager"
     "rbw"
     "remmina"
     "ripgrep"
     "rofi"
     "rsync"
     ;; Network scanning for the HP Officejet 7610 over eSCL/AirScan.
     ;; sane-backends supplies scanimage and the SANE_CONFIG_DIR /
     ;; SANE_BACKEND_LIB_PATH search paths; sane-airscan must share its
     ;; profile so its dll.d entry and airscan.conf are found. The system
     ;; sane-backends (sane-service-type) has no eSCL backend.
     "sane-airscan"
     "sane-backends"
     "scrot"
     "simple-scan"
     "signal-desktop"
     "syncthing"
     "syncthing-gtk"
     "telegram-desktop"
     "thunar"
     "tmux"
     "unzip"
     "vim"
     "weechat"
     "xdotool"
     "xdpyinfo"
     "xfd"
     "xfontsel"
     "xlsclients"
     "xlsfonts"
     "xprop"
     "xterm"
     ;; Provides the xvfb-run wrapper; it hardcodes the store path to the
     ;; Xvfb server from its xorg-server input, so no separate package is
     ;; needed. Guix has no plain "xvfb" package.
     "xvfb-run"
     "xwininfo"
     "yt-dlp"
     "yubico-piv-tool"
     "zip"))
   (list catgirl-openssl)))

(define %mpd-service
  (shepherd-service
   (documentation "Run MPD against ~/.config/mpd/mpd.conf.")
   (provision '(mpd))
   (modules '((shepherd support)))
   (start #~(make-forkexec-constructor
             (list #$(file-append (specification->package "mpd") "/bin/mpd")
                   "--no-daemon"
                   "/home/tay/.config/mpd/mpd.conf")
             #:log-file (string-append %user-log-dir "/mpd.log")))
   (stop #~(make-kill-destructor))))

;; Rootless Podman ha-mcp 8.5.0 + loopback Caddy bearer proxy.
;; Containers are created separately (names ha-mcp-admin / ha-mcp-admin-proxy);
;; Shepherd only starts/stops them. Stop must stop the container, not just the
;; wait client. `podman start --attach` exits 125 when already running, so
;; start uses podman-attach.sh (start-if-needed + wait). No secrets here.
(define %podman "/run/current-system/profile/bin/podman")
(define %ha-mcp-attach "/home/tay/.config/ha-mcp-admin/podman-attach.sh")

(define %ha-mcp-admin-service
  (shepherd-service
   (documentation "Run pinned ha-mcp 8.5.0 HTTP server in a rootless container.")
   (provision '(ha-mcp-admin))
   (auto-start? #t)
   (respawn? #t)
   (respawn-delay 5)
   (respawn-limit #~'(5 . 60))
   (modules '((shepherd support)))
   (start #~(make-forkexec-constructor
             (list "/bin/sh" #$%ha-mcp-attach "ha-mcp-admin")
             #:log-file (string-append %user-log-dir "/ha-mcp-admin.log")))
   (stop #~(lambda _
             (system* #$%podman "stop" "--time" "15" "ha-mcp-admin")
             #f))))

(define %ha-mcp-admin-proxy-service
  (shepherd-service
   (documentation "Loopback Caddy bearer proxy in front of ha-mcp-admin.")
   (provision '(ha-mcp-admin-proxy))
   (requirement '(ha-mcp-admin))
   (auto-start? #t)
   (respawn? #t)
   (respawn-delay 5)
   (respawn-limit #~'(5 . 60))
   (modules '((shepherd support)))
   (start #~(make-forkexec-constructor
             (list "/bin/sh" #$%ha-mcp-attach "ha-mcp-admin-proxy")
             #:log-file (string-append %user-log-dir "/ha-mcp-admin-proxy.log")))
   (stop #~(lambda _
             (system* #$%podman "stop" "--time" "15" "ha-mcp-admin-proxy")
             #f))))



;; KWallet, so Electron/Chromium apps can use a real secret store instead of
;; writing their encryption keys to disk in plaintext.
;;
;; Two daemons are needed, and both were verified necessary by experiment:
;;
;;   ksecretd  owns the wallet files and claims org.freedesktop.secrets.
;;   kwalletd6 is a shim over it that claims org.kde.kwalletd6.
;;
;; Chromium's `kwallet6' backend talks to org.kde.kwalletd6 specifically, so
;; running ksecretd alone is NOT enough: Signal still fails to unwrap its key
;; and dies with SQLITE_NOTADB.
;;
;; Both are Qt applications and abort at startup if no QPA plugin loads.
;; Shepherd starts them outside the X session with no DISPLAY/XAUTHORITY, so
;; pin QT_QPA_PLATFORM=offscreen: verified to serve secrets fine headless.
;; Inheriting the session's DISPLAY would only re-break this at logout, and
;; the wallet carries no password, so no unlock dialog is ever needed.
;;
;; They also need the D-Bus *session* bus, which is the awkward part here.
;; This host logs in through GDM, whose .gdm-x-session spawns the session bus
;; on a random /tmp/dbus-XXXXXXXX socket long after user Shepherd has already
;; started, and there is no /run/user/1000/bus to fall back on. So the address
;; cannot be baked in or inherited: scan /proc at service start time for a
;; process that already carries DBUS_SESSION_BUS_ADDRESS.
;;
;; D-Bus activation from share/dbus-1/services would normally start these on
;; demand, but that has the same bus-discovery problem, and this bare StumpWM
;; session's bus comes up before the home profile lands on XDG_DATA_DIRS.
;; Run them as Shepherd services instead so they are always present.
(define (kwallet-daemon-service provision program requirement)
  (shepherd-service
   (documentation (string-append "Run the KWallet daemon " program "."))
   (provision (list provision))
   (requirement requirement)
   (modules '((shepherd support)
              (ice-9 ftw)
              (ice-9 rdelim)
              (srfi srfi-1)
              (srfi srfi-13)))
   (start
    #~(lambda args
        (define (process-environment pid)
          ;; /proc/PID/environ, split on NUL. Unreadable for alien uids.
          (catch #t
            (lambda ()
              (call-with-input-file (string-append "/proc/" pid "/environ")
                (lambda (port)
                  (let loop ((entries '()) (current '()))
                    (let ((char (read-char port)))
                      (cond
                       ((eof-object? char) (reverse entries))
                       ((char=? char #\nul)
                        (loop (cons (list->string (reverse current)) entries)
                              '()))
                       (else (loop entries (cons char current)))))))))
            (lambda _ '())))

        (define (session-bus-from-processes)
          ;; Prefer a live X session leader: its bus is the one desktop apps
          ;; and Signal actually use.
          (let* ((pids (scandir "/proc"
                                (lambda (name)
                                  (string-every char-numeric? name))))
                 (addresses
                  (filter-map
                   (lambda (pid)
                     (find (lambda (variable)
                             (string-prefix? "DBUS_SESSION_BUS_ADDRESS="
                                             variable))
                           (process-environment pid)))
                   (or pids '()))))
            (and (pair? addresses) (first addresses))))

        (let* ((discovered (session-bus-from-processes))
               (environment
                (cons* "QT_QPA_PLATFORM=offscreen"
                       (or discovered "DBUS_SESSION_BUS_ADDRESS=")
                       (remove
                        (lambda (variable)
                          (or (string-prefix? "DISPLAY=" variable)
                            (string-prefix? "QT_QPA_PLATFORM=" variable)
                            (string-prefix? "DBUS_SESSION_BUS_ADDRESS="
                                            variable)))
                        (default-environment-variables)))))
          (unless discovered
            (format (current-error-port)
                    "~a: no D-Bus session bus found; \
 starting anyway, restart after logging in~%"
                    #$program))
          (apply (make-forkexec-constructor
                  (list #$(file-append (specification->package "kwallet")
                                       (string-append "/bin/" program)))
                  #:environment-variables environment
                  #:log-file (string-append %user-log-dir "/" #$program ".log"))
                 args))))
   (stop #~(make-kill-destructor))))

(define %ksecretd-service
  (kwallet-daemon-service 'ksecretd "ksecretd" '()))

(define %kwalletd6-service
  (kwallet-daemon-service 'kwalletd6 "kwalletd6" '(ksecretd)))

;; Chromium picks its safe-storage backend from XDG_CURRENT_DESKTOP, which is
;; empty under StumpWM, so Signal would silently fall back to `basic_text'
;; and keep its SQLCipher key unencrypted on disk. Pin the backend instead.
;; This entry shadows the package's own via XDG_DATA_HOME precedence.
(define %signal-desktop-entry
  (mixed-text-file
   "signal-desktop.desktop"
   "[Desktop Entry]\n"
   "Name=Signal\n"
   "Comment=Private messaging from your desktop\n"
   "Exec=" (specification->package "signal-desktop")
   "/bin/signal-desktop --password-store=kwallet6 %U\n"
   "Terminal=false\n"
   "Type=Application\n"
   "Icon=signal-desktop\n"
   "StartupWMClass=Signal\n"
   "Categories=Network;InstantMessaging;Chat;\n"
   "MimeType=x-scheme-handler/sgnl;x-scheme-handler/signalcaptcha;\n"))

(home-environment
 (packages (append %core-home-packages %workstation-home-packages
                   (list caelestia-shell caelestia-cli caelestia-panes)))
 (services
  (append %core-home-services
           (list (service home-syncthing-service-type)
                 ;; PipeWire replaces PulseAudio. enable-pulseaudio? starts
                 ;; pipewire-pulse, so existing PulseAudio clients (pactl,
                 ;; pavucontrol, browsers) keep working unchanged.
                 ;;
                 ;; The motivation is Bluetooth: PulseAudio 16.1 only offers
                 ;; SBC, while PipeWire ships LDAC, AptX, AAC and Opus codecs
                 ;; that negotiate bitrate down as signal weakens instead of
                 ;; simply dropping out, and its bluez5 transport recovers
                 ;; from A2DP errors that PulseAudio needed a manual profile
                 ;; cycle to clear.
                 ;;
                 ;; pulseaudio must also be removed from the system profile
                 ;; in config-k8-plus.scm, otherwise its autospawn competes
                 ;; with PipeWire for the same devices.
                 ;; PipeWire's shepherd service requires dbus. The X session
                 ;; already starts a session bus, but shepherd needs one it
                 ;; declares itself to order startup correctly.
                 (service home-dbus-service-type)
                 (service home-pipewire-service-type)
                 ;; basedbox's DP sink and game/browser streams underrun at
                 ;; PipeWire's default 256-frame quantum under load; keep the
                 ;; graph and pulse floor at 1024 frames on this host only.
                 (simple-service
                  'basedbox-pipewire-min-quantum
                  home-xdg-configuration-files-service-type
                  `(("pipewire/pipewire.conf.d/10-basedbox-min-quantum.conf"
                     ,(local-file
                       "/home/tay/src/dotfiles/config/.config/pipewire/pipewire.conf.d/10-basedbox-min-quantum.conf"
                       "pipewire-10-basedbox-min-quantum.conf"))
                    ("pipewire/pipewire-pulse.conf.d/10-basedbox-min-quantum.conf"
                     ,(local-file
                       "/home/tay/src/dotfiles/config/.config/pipewire/pipewire-pulse.conf.d/10-basedbox-min-quantum.conf"
                       "pipewire-pulse-10-basedbox-min-quantum.conf"))))
                 ;; The symlink manager runs first and removes the old store
                 ;; link on the initial transition. Recover that generation's
                 ;; bytes before using the seed; subsequent regular state is
                 ;; left untouched so GUI edits survive every activation.
                 (simple-service
                  'seed-g9-hdr-config
                  home-activation-service-type
                  (with-imported-modules
                      (source-module-closure '((guix build utils)))
                    #~(begin
                        (use-modules (guix build utils))
                        (let* ((destination
                                (string-append (getenv "HOME")
                                               "/.config/hypr/g9-hdr.conf"))
                               (state
                                (catch 'system-error
                                  (lambda () (lstat destination))
                                  (lambda args
                                    (if (= ENOENT (system-error-errno args))
                                        #f
                                        (apply throw args))))))
                          (when (or (not state)
                                    (eq? 'symlink (stat:type state)))
                            (let* ((old-home (getenv "GUIX_OLD_HOME"))
                                   (old-file
                                    (and old-home
                                         (string-append
                                          old-home
                                          "/files/.config/hypr/g9-hdr.conf")))
                                   (source
                                    (cond
                                     (state destination)
                                     ((and old-file (access? old-file R_OK))
                                      old-file)
                                     (else
                                      #$(local-file
                                         "/home/tay/src/dotfiles/config/.config/hypr/g9-hdr.conf"
                                         "g9-hdr.conf-seed")))))
                              (mkdir-p (dirname destination))
                              (let* ((temporary
                                      (string-append destination ".XXXXXX"))
                                     (output (mkstemp! temporary))
                                     (installed? #f))
                                (dynamic-wind
                                  (lambda () #t)
                                  (lambda ()
                                    (call-with-ascii-input-file source
                                      (lambda (input)
                                        (sendfile output input
                                                  (stat:size (stat input))
                                                  0)))
                                    (close-port output)
                                    (chmod temporary #o600)
                                    (rename-file temporary destination)
                                    (set! installed? #t))
                                  (lambda ()
                                    (dynamic-wind
                                      (lambda () #t)
                                      (lambda ()
                                        (unless (port-closed? output)
                                          (close-port output)))
                                      (lambda ()
                                        (unless installed?
                                          (delete-file temporary)))))))))))))
                 (simple-service 'workstation-daemons
                                 home-shepherd-service-type
                                 (list %mpd-service
                                       %ksecretd-service
                                       %kwalletd6-service
                                       %ha-mcp-admin-service
                                       %ha-mcp-admin-proxy-service))
                 (simple-service 'signal-kwallet-desktop-entry
                                 home-xdg-data-files-service-type
                                 `(("applications/signal-desktop.desktop"
                                    ,%signal-desktop-entry)))
                 (simple-service 'basedserv-gaming-desktop-entry
                                 home-xdg-data-files-service-type
                                 `(("applications/basedserv-gaming.desktop"
                                    ,(mixed-text-file
                                      "basedserv-gaming.desktop"
                                      "[Desktop Entry]\n"
                                      "Type=Application\n"
                                      "Name=basedserv Gaming\n"
                                      "Comment=Stream the Steam Headless desktop at 1440p/60\n"
                                      "Icon=moonlight\n"
                                      "Terminal=false\n"
                                      "Categories=Game;\n"
                                      "Exec="
                                      (file-append
                                       (specification->package "moonlight-qt")
                                       "/bin/moonlight")
                                      " stream 192.168.7.119 Desktop"
                                      " --resolution 2560x1440 --fps 60 --bitrate 40000"
                                      " --video-codec HEVC --video-decoder hardware"
                                      " --display-mode fullscreen --no-hdr\n")))))
           %base-home-services)))
