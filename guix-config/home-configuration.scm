;; This "home-environment" file can be passed to 'guix home reconfigure'
;; to reproduce the content of your profile.  This is "symbolic": it only
;; specifies package names.  To reproduce the exact same profile, you also
;; need to capture the channels being used, as returned by "guix describe".
;; See the "Replicating Guix" section in the manual.

(use-modules (gnu home)
             (gnu home services)
             (gnu home services desktop)
             (gnu home services containers)
             (gnu home services dict)
						 (gnu home services syncthing)
             (gnu home services dotfiles)
             (gnu packages)
             (gnu packages containers)
             (gnu services)
             (guix gexp)
             (gnu home services shells)
             (ice-9 ftw)
             (tay home-common))

(home-environment
  ;; Below is the list of packages that will show up in your
  ;; Home profile, under ~/.guix-home/profile.
 (packages (append %core-home-packages
                   (specifications->packages (list "steam"
																					 "tmux"
																					 "bind:utils"
																					 "rsync"
																					 "podman"
																					 "telegram-desktop"
																					 "remmina"
																					 "unzip"
																					 "imagemagick"
                                           "htop"
                                           "yt-dlp"
																					 "kmonad"
																					 "xev"
																					 "setxkbmap"
																					 "weechat"
																					 "cvs"
																					 "syncthing"
																					 "syncthing-gtk"
																					 "xmodmap"
                                           "blueman"
                                           "bluedevil"
																					 "ripgrep"
																					 "sword"
																					 "pipx"
																					 "xiphos"
																					 "sbcl"
																					 "sbcl-slime-swank"
																					 "cl-croatoan"
																					 "cl-charms"
																					 "clisp"
																					 "docker"
																					 "cl-mcclim"
																					 "stumpwm"
																					 "stumpish"
																					 "rust:cargo"
																					 "sbcl-slime-swank"
                                           "sbcl-stumpwm-stumptray"
                                           "sbcl-alexandria"
																					 "sbcl-stumpwm-hostname"
																					 "sbcl-stumpwm-winner-mode"
																					 "sbcl-stumpwm-tomato"
																					 "sbcl-stumpwm-swm-gaps"
																					 "sbcl-stumpwm-stump-nm"
																					 "sbcl-stumpwm-screenshot"
																					 "sbcl-stumpwm-rofi"
																					 "sbcl-stumpwm-pass"
																					 "sbcl-stumpwm-pamixer"
																					 "sbcl-stumpwm-numpad-layouts"
																					 "sbcl-stumpwm-notify"
																					 "sbcl-stumpwm-kbd-layouts"
																					 "sbcl-stumpwm-disk"
																					 "sbcl-stumpwm-battery-portable"
																					 "sbcl-stumpwm-globalwindows"
																					 "sbcl-stumpwm-binwarp"
																					 "sbcl-stumpwm-wifi"
																					 "sbcl-stumpwm-ttf-fonts"
																					 "sbcl-stumpwm-stumptray"
																					 "sbcl-stumpwm-net"
																					 "sbcl-stumpwm-mem"
																					 "sbcl-stumpwm-cpu"
                                           "firefox"
                                           "python-gyp"
                                           "filezilla"
																					 "libnotify"
                                           "node"
                                           "calibre"
                                           "recutils"
                                           "tuxemon"
                                           "pandoc"
                                           "less"
                                           "ncurses"
                                           "flex"
                                           "bison"
                                           "make"
                                           "parallel"
                                           "shell-functools"
                                           "scrot"
                                           "signal-desktop"
                                           "rofi"
                                           "librewolf"
                                           "emacs"
                                           "guile-gcrypt"
																					 "emacs-slime"
                                           "emacs-guix"
																					 "tree-sitter"
																					 "emacs-treesit-auto"
																						 "texlive-scheme-full"
                                           "glibc-locales"
                                           "xlsfonts"
                                           "xset"
                                           "fontconfig"
                                           "rizin"
                                           "radare2"
                                           "cutter"
                                           "font-unscii"
                                           "xrandr"
                                           "gnome-font-viewer"
                                           "xfontsel"
																					 "xsetroot"
                                           "pavucontrol"
                                           "screen"
                                           "font-misc-misc"
                                           "xrdb"
                                           "font-gnu-unifont"
                                           "rsync"
                                           "xterm"
                                           "gnuplot"
                                           "cmake"
                                           "curl"
                                           "git"
                                           "xdot"
                                           "graphviz"
                                           "vim"
                                           "dico"
																					 "v4l2loopback-linux-module"
																					 "rsync"
																					 "interception-tools"
																					 "texinfo"
																					 "texlive-scheme-small"
																					 "texlive-texinfo"
																					 "autorandr"
																					 "dvdbackup"
																			 "acl"))))

  ;; Below is the list of Home services.  To search for available
  ;; services, run 'guix home search KEYWORD' in a terminal.
  (services
   (append %core-home-services
            (list (service home-syncthing-service-type))
            %base-home-services)))
