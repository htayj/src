(use-modules (gnu)
             (gnu packages cups)
             (gnu packages networking)
             (gnu system accounts)
             (guix build-system copy)
             (guix download)
             (guix gexp)
              (guix packages)
              (sops secrets)
              (sops services sops)
              ((guix licenses) #:prefix license:)
             (nongnu packages linux)
             (nongnu system linux-initrd))
(use-service-modules containers cups dbus desktop networking nfs nix shepherd ssh xorg)

(use-package-modules package-management)

(define %tailscale
  (package
    (name "tailscale-bin")
    (version "1.102.2")
    (source
     (origin
       (method url-fetch)
       (uri (string-append
             "https://pkgs.tailscale.com/stable/tailscale_"
             version "_amd64.tgz"))
       (sha256
        (base32
         "1n04mcwfnh8pzcrhmmmr88yn0719abk0210y7awzg5fyz09dwb5d"))))
    (build-system copy-build-system)
    (arguments
     (list
      #:install-plan
      #~'(("tailscale" "bin/tailscale")
          ("tailscaled" "bin/tailscaled"))))
    (supported-systems '("x86_64-linux"))
    (synopsis "Tailscale mesh VPN client and daemon")
    (description
     "Tailscale creates a WireGuard-based private mesh network.  This package
installs Tailscale's official static Linux client and daemon binaries.")
    (home-page "https://tailscale.com/")
    (license license:bsd-3)))

(define %tailscale-activation
  #~(begin
      (use-modules (guix build utils))
      (mkdir-p "/var/lib/tailscale")
      (chmod "/var/lib/tailscale" #o700)
      (mkdir-p "/var/run/tailscale")))

(define %basedbox-secrets
  (local-file
   "/home/tay/src/guix-config/secrets/hosts/basedbox.sops.yaml"
   "basedbox-secrets.sops.yaml"))

(define %tay-secrets
  (local-file
   "/home/tay/src/guix-config/secrets/users/tay-basedserv.sops.yaml"
   "tay-secrets.sops.yaml"))

(define (tay-secret key path)
  (sops-secret
   (key key)
   (file %tay-secrets)
   (user "tay")
   (group "users")
   (output-type "binary")
   (permissions #o600)
   (path path)))

(define %tay-runtime-secrets
  (list
   (tay-secret '("sunshine" "cakey")
               "/home/tay/.config/sunshine/credentials/cakey.pem")
   (tay-secret '("sunshine" "state")
               "/home/tay/.config/sunshine/sunshine_state.json")
   (tay-secret '("basedserv" "authinfo") "/home/tay/.authinfo")
   (tay-secret '("basedserv" "botircoper") "/home/tay/botircoper.txt")
   (tay-secret '("basedserv" "claudeoauth") "/home/tay/claudeoauth")
   (tay-secret '("basedserv" "private_claudeoauth")
               "/home/tay/.config/private/claudeoauth.txt")
   (tay-secret '("basedserv" "ircduserpass") "/home/tay/ircduserpass")
   (tay-secret '("basedserv" "kloakkey") "/home/tay/kloakkey")
   (tay-secret '("basedserv" "kubekey") "/home/tay/kubekey")
   (tay-secret '("basedserv" "sloppass") "/home/tay/sloppass")
   (tay-secret '("basedserv" "clawmacs" "token")
               "/home/tay/.config/clawmacs/token")
   (tay-secret '("basedserv" "clawmacs" "claude_max_token")
               "/home/tay/.config/clawmacs/claude-max-token")
   (tay-secret '("basedserv" "pi_a2a" "token")
               "/home/tay/.config/pi-a2a-bridge/token")
   (tay-secret '("basedserv" "pi_a2a" "hermes_peer")
               "/home/tay/.config/pi-a2a-bridge/peers/hermes-192.168.1.111-token")
   (tay-secret '("basedserv" "pi_a2a" "openclaw_peer")
               "/home/tay/.config/pi-a2a-bridge/peers/openclaw-192.168.1.111-token")
   (tay-secret '("basedserv" "routebraid_stage1_token")
               "/home/tay/.config/routebraid/stage1-token")
   (tay-secret '("basedserv" "openclaw_remote_gateway_token")
               "/home/tay/.openclaw/remote-gateway-token")
   (tay-secret '("basedserv" "private_env" "ggn")
               "/home/tay/.local/share/private-env.d/ggn.sh")
   (tay-secret '("basedserv" "private_env" "gitea_mcp")
               "/home/tay/.local/share/private-env.d/gitea-mcp.sh")
   (tay-secret '("basedserv" "private_env" "gramps_mcp")
               "/home/tay/.local/share/private-env.d/gramps-mcp.sh")
   (tay-secret '("basedserv" "private_env" "mobygames_mcp")
               "/home/tay/.local/share/private-env.d/mobygames-mcp.sh")
   (tay-secret '("basedserv" "private_env" "omniroute")
               "/home/tay/.local/share/private-env.d/omniroute.sh")))

(define %tay-secret-directories
  #~(begin
      (use-modules (guix build utils))
      (for-each
       (lambda (directory)
         (mkdir-p directory)
         (chown directory
                (passwd:uid (getpwnam "tay"))
                (group:gid (getgrnam "users")))
         (chmod directory #o700))
       '("/home/tay/.config/sunshine/credentials"
         "/home/tay/.config/private"
         "/home/tay/.config/clawmacs"
         "/home/tay/.config/pi-a2a-bridge"
         "/home/tay/.config/pi-a2a-bridge/peers"
         "/home/tay/.config/routebraid"
         "/home/tay/.openclaw"
         "/home/tay/.local/share/private-env.d"))))

(define %tailscaled-service
  (shepherd-service
   (documentation "Run the Tailscale mesh VPN daemon.")
   (provision '(tailscaled))
   (requirement '(networking))
   (respawn? #t)
   (start
    #~(make-forkexec-constructor
       (list #$(file-append %tailscale "/bin/tailscaled")
             "--state=/var/lib/tailscale/tailscaled.state"
             "--socket=/var/run/tailscale/tailscaled.sock")
       #:log-file "/var/log/tailscaled.log"))
   (stop #~(make-kill-destructor))))

(define %always-on-service
  (shepherd-service
   (documentation "Block suspend, hibernate, and idle sleep requests.")
   (provision '(always-on))
   (requirement '(elogind))
   (respawn? #t)
   (start
    #~(make-forkexec-constructor
       (list #$(file-append (specification->package "elogind")
                            "/bin/elogind-inhibit")
             "--what=sleep:idle:handle-suspend-key:handle-hibernate-key"
             "--who=basedbox-availability"
             "--why=Keep basedbox remotely reachable"
             "--mode=block"
             #$(file-append (specification->package "coreutils") "/bin/sleep")
             "infinity")
       #:log-file "/var/log/always-on.log"))
   (stop #~(make-kill-destructor))))

(define %wake-on-lan-service
  (shepherd-service
   (documentation "Enable magic-packet Wake-on-LAN on enp3s0.")
   (provision '(wake-on-lan))
   (requirement '(networking))
   (one-shot? #t)
   (start
    #~(lambda _
        (zero? (system* #$(file-append (specification->package "ethtool")
                                      "/sbin/ethtool")
                        "--change" "enp3s0" "wol" "g"))))))

(define %my-os
  (operating-system
    (kernel linux)
    (initrd microcode-initrd)
    (firmware (list linux-firmware))
    (locale "en_US.utf8")
    (timezone "America/New_York")
    (keyboard-layout (keyboard-layout "us" "intl"))
    (host-name "basedbox")

    (groups (cons (user-group (system? #t) (name "uinput"))
                  %base-groups))
    (users (cons* (user-account
                    (name "tay")
                    (comment "Tay")
                    (group "users")
                    (home-directory "/home/tay")
                    (supplementary-groups
                      '("wheel" "cgroup" "netdev" "audio" "video" "lp" "input" "uinput")))
                  %base-user-accounts))

    (packages
     (append
        (list (specification->package "alsa-utils")
              (specification->package "pulseaudio")
              (specification->package "pavucontrol")
              (specification->package "bluez")
              (specification->package "xrandr")
               (specification->package "efibootmgr")
               (specification->package "ethtool")
               (specification->package "iptables")
              %tailscale
              (specification->package "font-gnu-unifont")
              (specification->package "font-gnu-freefont")
            (specification->package "autorandr")
            (specification->package "remmina")
            (specification->package "font-unscii")
            (specification->package "font-tex-gyre")
            (specification->package "font-sun-misc")
            (specification->package "font-sony-misc")
            (specification->package "font-spleen")
            (specification->package "font-terminus")
            (specification->package "font-util")
            (specification->package "font-space-grotesk")
            (specification->package "bluez-qt")
            (specification->package "nix")
            (specification->package "blueman")
            (specification->package "mesa-utils")
             (specification->package "xinit")
             (specification->package "xset")
            (specification->package "xinitrc-xsession")
            (specification->package "stumpwm")
            (specification->package "sbcl")
            (specification->package "sbcl-alexandria")
            (specification->package "sbcl-stumpwm-hostname")
            (specification->package "sbcl-stumpwm-winner-mode")
            (specification->package "sbcl-stumpwm-tomato")
            (specification->package "sbcl-stumpwm-swm-gaps")
            (specification->package "sbcl-stumpwm-screenshot")
            (specification->package "sbcl-stumpwm-notify")
            (specification->package "sbcl-stumpwm-disk")
            (specification->package "sbcl-stumpwm-battery-portable")
            (specification->package "sbcl-stumpwm-globalwindows")
            (specification->package "sbcl-stumpwm-stumptray")
            (specification->package "sbcl-stumpwm-net")
            (specification->package "sbcl-stumpwm-mem")
             (specification->package "sbcl-stumpwm-cpu")
             (specification->package "podman")
             (specification->package "pciutils")
             (specification->package "usbutils"))
       %base-packages))

    (services
     (append
      (list (service lxqt-desktop-service-type)
            (service bluetooth-service-type
                     (bluetooth-configuration
                      (fast-connectable? #t)
                      (privacy 'device)
                      (just-works-repairing 'always)))
            (service openssh-service-type
                     (openssh-configuration
                      (x11-forwarding? #t)))
            (service cups-service-type
                     (cups-configuration
                      (web-interface? #t)
                      (extensions (list cups-filters brlaser hplip))))
            (service iptables-service-type)
            (service rootless-podman-service-type
                     (rootless-podman-configuration
                      (subgids (list (subid-range (name "tay"))))
                      (subuids (list (subid-range (name "tay"))))))
            (service nfs-service-type (nfs-configuration))
            (service nix-service-type)
            (service sops-secrets-service-type
                     (sops-service-configuration
                      (age-key-file "/root/.config/sops/age/keys.txt")
                       (secrets
                        (cons
                          (sops-secret
                           (key '("canary"))
                           (file %basedbox-secrets)
                           (permissions #o400))
                          %tay-runtime-secrets))))
            (simple-service
              'tay-secret-directories
              activation-service-type
              %tay-secret-directories)
            (simple-service
             'tailscale-state
             activation-service-type
             %tailscale-activation)
            (simple-service
             'tailscaled
             shepherd-root-service-type
             (list %tailscaled-service))
            (simple-service
             'always-on
             shepherd-root-service-type
             (list %always-on-service))
            (simple-service
             'wake-on-lan
             shepherd-root-service-type
             (list %wake-on-lan-service))
            (simple-service 'blueman dbus-root-service-type (list blueman))
            (udev-rules-service
             'uinput
             (udev-rule
              "50-kanata.rules"
              "ACTION!=\"remove\", KERNEL==\"uinput\", MODE=\"0660\", GROUP=\"uinput\", OPTIONS+=\"static_node=uinput\""))
            (set-xorg-configuration
             (xorg-configuration (keyboard-layout keyboard-layout))))
       (modify-services
        %desktop-services
        (elogind-service-type
         config =>
         (elogind-configuration
          (inherit config)
          (idle-action 'ignore)
          (handle-suspend-key 'ignore)
          (handle-hibernate-key 'ignore)
          (handle-lid-switch 'ignore)
          (handle-lid-switch-external-power 'ignore)))
        (guix-service-type
        config =>
        (guix-configuration
         (inherit config)
         (substitute-urls
          (cons* "https://substitutes.nonguix.org"
                 %default-substitute-urls))
         (authorized-keys
          (append
           (list
            (plain-file
             "non-guix.pub"
             "(public-key \n  (ecc \n   (curve Ed25519)\n   (q #C1FD53E5D4CE971933EC50C9F307AE2171A2D3B52C804642A7A35F84F3A4EA98#)\n   )\n  )"))
           %default-authorized-guix-keys)))))))

    (bootloader
     (bootloader-configuration
      (bootloader grub-efi-bootloader)
      (targets (list "/boot/efi"))
      (keyboard-layout keyboard-layout)))
    (swap-devices
     (list (swap-space
            (target (uuid "d23519bc-ece4-4a0d-b4db-224d6e2c6f58")))))
    (file-systems
     (cons* (file-system
             (mount-point "/boot/efi")
             (device (uuid "521A-DCFF" 'fat32))
             (type "vfat"))
            (file-system
             (mount-point "/")
             (device
              (uuid "b19ca7a2-0762-4d14-91fd-484dbd9d7ee9" 'btrfs))
             (type "btrfs"))
            (file-system
             (mount-point "/mnt/sas-main")
             (device "truenas:/mnt/sas-main/main")
             (type "nfs")
             (mount? #f)
             (create-mount-point? #t)
             (options "soft,timeo=100,rsize=32768,wsize=32768")
             (flags '(no-atime)))
             %base-file-systems))))

%my-os
