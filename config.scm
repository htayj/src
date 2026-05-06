;; This is an operating system configuration generated
;; by the graphical installer.
;;
;; Once installation is complete, you can learn and modify
;; this file to tweak the system configuration, and pass it
;; to the 'guix system reconfigure' command to effect your
;; changes.


;; Indicate which modules to import to access the variables
;; used in this configuration.
(use-modules (gnu)
             (gnu packages networking)
             (gnu system accounts)
						 (gnu packages cups))
(use-service-modules cups desktop dbus networking ssh containers xorg nfs nix)

(use-package-modules package-management)
;;(module-map)
;; use non-free software
(use-modules (nongnu packages linux)
						 (nongnu system linux-initrd)
						 (nongnu packages nvidia)
						 (guix transformations)
						 (nonguix transformations))
(define transform
  (options->transformation
   '((with-graft . "mesa=nvda"))))
(define %my-os
	(operating-system
	 (kernel linux)
 	 ;; (kernel-arguments (append '("modprobe.blacklist=nouveau")
	 ;; 									 %default-kernel-arguments))
					

;;	 (kernel-loadable-modules (list nvidia-driver))
			
  (initrd microcode-initrd)
  (firmware (list linux-firmware))
  (locale "en_US.utf8")
  (timezone "America/New_York")
  (keyboard-layout (keyboard-layout "us" "intl"))
  (host-name "guix")

  ;; The list of user accounts ('root' is implicit).
	(groups (cons (user-group (system? #t) (name "uinput"))
                %base-groups))
  (users (cons* (user-account
                  (name "tay")
                  (comment "Tay")
                  (group "users")
                  (home-directory "/home/tay")
                  (supplementary-groups '("wheel" "cgroup" "netdev" "audio" "video" "lp" "uinput" )))
                %base-user-accounts))

  ;; Packages installed system-wide.  Users can also install packages
  ;; under their own account: use 'guix search KEYWORD' to search
  ;; for packages and 'guix install PACKAGE' to install a package.
  (packages (append (list ;; (specification->package "hyprland")
                          
                          (specification->package "font-gnu-unifont")
                          (specification->package "font-gnu-freefont")
													(specification->package "autorandr")
													(specification->package "remmina")
;;													(specification->package "ollama@0.9.1")
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
													(specification->package "nvidia-container-toolkit")
                          ;; (specification->package "nfs-utils")
;;                          (specification->package "nss-certs")
                          )
                    %base-packages))

  ;; Below is the list of system services.  To search for available
  ;; services, run 'guix system search KEYWORD' in a terminal.
  (services
   (append (list ;; (service gdm-service-type)
								 ;; (service gdm-service-type
								 ;; 					(keyboard-layout keyboard-layout)
						 		 ;; 					 )
						
                 (service lxqt-desktop-service-type)
                 (service bluetooth-service-type
                          (bluetooth-configuration (fast-connectable? #t)
                              (privacy 'device)
                              (just-works-repairing 'always)))
                 ;; To configure OpenSSH, pass an 'openssh-configuration'
                 ;; record as a second argument to 'service' below.
                 (service openssh-service-type
                         (openssh-configuration
                          (x11-forwarding? #t)))
                 (service cups-service-type
													(cups-configuration
														(web-interface? #t)
														(extensions
														 (list cups-filters brlaser hplip))))

								 (service iptables-service-type)
								 (service rootless-podman-service-type
													(rootless-podman-configuration
													 (subgids
														(list (subid-range (name "tay"))))
													 (subuids
														(list (subid-range (name "tay"))))))
								 ;;								 (service nvidia-service-type)
								 ;; NFS service needed to mount or export NFS shares
								 (service nfs-service-type
													(nfs-configuration))

								 ;; Allow desktop users to also mount NTFS and NFS file systems
								 ;; without root.
								 ;; (simple-service 'mount-setuid-helpers setuid-program-service-type
								 ;; 								 (map (lambda (program)
								 ;; 												(setuid-program
								 ;; 												 (program program)))
								 ;; 											(list (file-append nfs-utils "/sbin/mount.nfs")
								 ;; 														(file-append ntfs-3g "/sbin/mount.ntfs-3g"))))
								 (service nix-service-type)

                 (simple-service 'blueman dbus-root-service-type (list blueman))
								 ;; (simple-service 
                 ;;     'custom-udev-rules udev-service-type 
                 ;;     (list nvidia-driver))
                 ;;    (service kernel-module-loader-service-type
                 ;;             '("ipmi_devintf"
                 ;;               "nvidia"
                 ;;               "nvidia_modeset"
                 ;;               "nvidia_uvm"))
								 (udev-rules-service 'autorandr
																		 (udev-rule
																			"90-autorandr.rules"
																			"ACTION==\"change\", SUBSYSTEM==\"drm\" RUN+=\"(echo $(date) trying to set monitor >> /home/tay/udev.log) ; autorandr --load g9andCrt --force && sleep 2 && autorandr --load g9andCrt --force\""
																			))
								 (udev-rules-service 'uinput
																		 (udev-rule
																			"50-kanata.rules"
																			"ACTION!=\"remove\", KERNEL==\"uinput\", MODE=\"0660\", GROUP=\"uinput\", OPTIONS+=\"static_node=uinput\""))
		 
                 (set-xorg-configuration
                  (xorg-configuration (keyboard-layout keyboard-layout)
																			;;(modules (cons* nvidia-driver %default-xorg-modules))
																			;; (server (transform xorg-server))
																			;; (drivers '("nvidia"))
																			)))
;;					 (service kernel-module-loader-service-type '("nvidia_uvm"))
;;					 (simple-service 'custom-udev-rules udev-service-type (list nvidia-driver))

           ;; This is the default list of services we
           ;; are appending to.
           ;; %desktop-services

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
	       (append (list (plain-file "non-guix.pub"
					 "(public-key 
 (ecc 
  (curve Ed25519)
  (q #C1FD53E5D4CE971933EC50C9F307AE2171A2D3B52C804642A7A35F84F3A4EA98#)
  )
 )"))
                  %default-authorized-guix-keys)))))))
  (bootloader (bootloader-configuration
                (bootloader grub-bootloader)
                (targets (list "/dev/nvme0n1"))
                (keyboard-layout keyboard-layout)))
  (swap-devices (list (swap-space
                        (target (uuid
                                 "bf0ffe06-d64c-4ee7-9f6f-56f6b8ee831f")))))

  ;; The list of file systems that get "mounted".  The unique
  ;; file system identifiers there ("UUIDs") can be obtained
  ;; by running 'blkid' in a terminal.
  (file-systems (cons* (file-system
                         (mount-point "/home")
                         (device (uuid
                                  "d60ede7a-59d0-4271-abdb-214112e32f1e"
                                  'ext4))
                         (type "ext4"))
                       (file-system
                         (mount-point "/boot/efi")
                         (device (uuid "A9C3-09E1"
                                       'fat32))
                         (type "vfat"))
                       (file-system
                         (mount-point "/")
                         (device (uuid
                                  "fe74d2a0-8416-4153-9616-5715d6ea5561"
                                  'ext4))
                         (type "ext4"))
											          ;; NFS share
											 (file-system
												(mount-point "/mnt/sas-main")
												(device "truenas:/mnt/sas-main/main")
												(type "nfs")
												(mount? #f)
												(create-mount-point? #t)
												(options "soft,timeo=100,rsize=32768,wsize=32768")
												(flags '(no-atime)))
											 %base-file-systems))))

((nonguix-transformation-nvidia #:configure-xorg? #t) %my-os)
;;%my-os
