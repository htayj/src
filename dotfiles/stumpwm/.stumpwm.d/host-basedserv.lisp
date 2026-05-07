;; -*-lisp-*-
;; basedserv stumpwm fragment — loaded by ~/.stumpwmrc.

(in-package :stumpwm)

;; basedserv installs stumpwm modules under the NixOS multi-user profile
;; tree, so point *module-dir* there before any (load-module ...) calls
;; in the shared rc file fire.
(setf *module-dir* "/run/current-system/profile/share/common-lisp/sbcl/")
(init-load-path *module-dir*)

(run-shell-command "emacs --daemon")
(run-shell-command "~/generic_setup.sh")
