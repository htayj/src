(use-modules (gnu home)
             (gnu home services)
             (gnu home services shepherd)
             (gnu home services syncthing)
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
     "imagemagick"
     "kitty-bitmap"
     "libnotify"
     "mpd-mpc"
     "mpd"
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

(home-environment
 (packages (append %core-home-packages %workstation-home-packages))
 (services
  (append %core-home-services
           (list (service home-syncthing-service-type)
                 (simple-service 'workstation-daemons
                                 home-shepherd-service-type
                                 (list %mpd-service)))
           %base-home-services)))
