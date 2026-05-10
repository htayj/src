;;;; Nyxt configuration managed by ~/src/dotfiles.
;;;; Use Nyxt's built-in vi/vim-style keybindings.

(setf (uiop/os:getenv "WEBKIT_DISABLE_COMPOSITING_MODE") "1")

(define-configuration browser
  ((theme theme:+dark-theme+)))

(define-configuration web-buffer
  ((default-modes (pushnew 'nyxt/mode/style:dark-mode %slot-value%))))

(define-configuration input-buffer
  ((default-modes
    (let ((modes (remove-if
                  (lambda (mode)
                    (member mode
                            '(nyxt/mode/emacs:emacs-mode
                              nyxt/mode/vi:vi-insert-mode)
                            :test #'eq))
                  %slot-value%)))
      (pushnew 'nyxt/mode/vi:vi-normal-mode modes)))))

(define-configuration prompt-buffer
  ((default-modes
    (let ((modes (remove-if
                  (lambda (mode)
                    (member mode
                            '(nyxt/mode/emacs:emacs-mode
                              nyxt/mode/vi:vi-normal-mode)
                            :test #'eq))
                  %slot-value%)))
      (pushnew 'nyxt/mode/vi:vi-insert-mode modes)))))
