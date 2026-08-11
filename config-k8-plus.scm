(use-modules (gnu)
             (gnu packages cups)
             (gnu packages networking)
             (gnu system accounts)
             (nongnu packages linux)
             (nongnu system linux-initrd))
(use-service-modules containers cups dbus desktop networking nfs nix ssh xorg)

(use-package-modules package-management)

(define %my-os
  (operating-system
    (kernel linux)
    (initrd microcode-initrd)
    (firmware (list linux-firmware))
    (locale "en_US.utf8")
    (timezone "America/New_York")
    (keyboard-layout (keyboard-layout "us" "intl"))
    (host-name "k8plus")

    (groups (cons (user-group (system? #t) (name "uinput"))
                  %base-groups))
    (users (cons* (user-account
                    (name "tay")
                    (comment "Tay")
                    (group "users")
                    (home-directory "/home/tay")
                    (supplementary-groups
                     '("wheel" "cgroup" "netdev" "audio" "video" "lp" "uinput")))
                  %base-user-accounts))

    (packages
     (append
       (list (specification->package "alsa-utils")
             (specification->package "efibootmgr")
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
     (list (swap-space (target (file-system-label "k8-swap")))))
    (file-systems
     (cons* (file-system
             (mount-point "/home")
             (device (file-system-label "k8-home"))
             (type "ext4"))
            (file-system
             (mount-point "/boot/efi")
             (device (file-system-label "K8EFI"))
             (type "vfat"))
            (file-system
             (mount-point "/")
             (device (file-system-label "k8-root"))
             (type "ext4"))
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
