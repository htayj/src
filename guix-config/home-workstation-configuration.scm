(use-modules (gnu home)
             (gnu home services)
             (gnu home services shepherd)
             (gnu home services syncthing)
             (gnu home services xdg)
             (gnu packages)
             (gnu services)
             (gnu services shepherd)
             (guix gexp)
             (tay home-common))

(define %workstation-home-packages
  (specifications->packages
   '("cadr-fonts-latin"
     "cadr-fonts-symbols"
     "calibre"
     "claude-code"
     "curl"
     "dec-fonts"
     "dunst"
     "emacs"
     "firefox"
     "font-unscii"
     "genera-fonts-latin"
     "genera-fonts-symbols"
     "git"
     "github-cli"
     "gucharmap"
     "imagemagick"
     "kitty-bitmap"
     "libnotify"
     "kwallet"
     "mpd-mpc"
     "mpd"
     "opencode"
     "opencode-desktop"
     "pavucontrol"
     "remmina"
     "ripgrep"
     "rofi"
     "rsync"
     "scrot"
     "signal-desktop"
     "syncthing"
     "syncthing-gtk"
     "telegram-desktop"
     "tmux"
     "weechat"
     "xfd"
     "xfontsel"
     "xlsfonts"
     "xterm"
     "yt-dlp")))

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
 (packages (append %core-home-packages %workstation-home-packages))
 (services
  (append %core-home-services
           (list (service home-syncthing-service-type)
                 (simple-service 'workstation-daemons
                                 home-shepherd-service-type
                                 (list %mpd-service
                                       %ksecretd-service
                                       %kwalletd6-service))
                 (simple-service 'signal-kwallet-desktop-entry
                                 home-xdg-data-files-service-type
                                 `(("applications/signal-desktop.desktop"
                                    ,%signal-desktop-entry))))
           %base-home-services)))
