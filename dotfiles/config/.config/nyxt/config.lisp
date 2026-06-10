;;;; Nyxt configuration managed by ~/src/dotfiles.
;;;; Use Nyxt's built-in vi/vim-style keybindings.

(setf (uiop/os:getenv "WEBKIT_DISABLE_COMPOSITING_MODE") "1")

(define-configuration browser
    ((theme theme:+dark-theme+)))

(define-configuration web-buffer
    ((default-modes (pushnew 'nyxt/mode/style:dark-mode %slot-value%))))
