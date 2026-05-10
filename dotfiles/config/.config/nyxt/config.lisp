;;;; Nyxt configuration managed by ~/src/dotfiles.
;;;; Hybrid "Emacs + Evil" key style:
;;;; - Vim/vi normal mode for page-local navigation and editing.
;;;; - Emacs-like C-x/M-x bindings kept globally for buffer/window management.

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
      (pushnew 'nyxt/mode/vi:vi-normal-mode modes)))
   (override-map
    (let ((map (make-keymap "emacs-management-override-map")))
      (define-key map
        ;; Command entry.
        "M-x" 'execute-command
        "C-M-x" 'execute-extended-command
        "C-space" 'execute-command
        "C-M-space" 'execute-extended-command

        ;; Buffer management, mirroring Nyxt's Emacs keyscheme.
        "C-x b" 'switch-buffer
        "C-x k" 'delete-buffer
        "C-x C-k" 'delete-current-buffer
        "C-x C-b" 'nyxt/mode/buffer-listing::list-buffers
        "C-x left" 'switch-buffer-previous
        "C-x C-left" 'switch-buffer-previous
        "C-x right" 'switch-buffer-next
        "C-x C-right" 'switch-buffer-next

        ;; Window/prompt management.
        "C-x o" 'toggle-prompt-buffer-focus
        "C-x 5 2" 'make-window
        "C-x 5 0" 'delete-current-window
        "C-x 5 1" 'delete-window

        ;; File/browser utilities.
        "C-x C-f" 'nyxt/mode/file-manager:open-file
        "C-x C-c" 'quit
        "C-M-l" 'copy-url
        "C-M-t" 'copy-title)
      map))))

;; Use C-g instead of Escape to leave vi insert mode, matching Emacs/Evil
;; muscle memory.  Unbinding Escape lets it pass through to web pages.
(define-configuration nyxt/mode/vi:vi-insert-mode
  ((keyscheme-map
    (define-keyscheme-map "vi-insert-mode-c-g" (list :import %slot-value%)
      keyscheme:vi-insert
      (list "C-g" 'nyxt/mode/vi:switch-to-vi-normal-mode
            "escape" nil)))))

;; Prompts/minibuffers are closer to Emacs than web pages, so force Emacs-style
;; line editing there instead of inheriting vi normal/insert modes.
(define-configuration prompt-buffer
  ((default-modes
    (let ((modes (remove-if
                  (lambda (mode)
                    (member mode
                            '(nyxt/mode/vi:vi-normal-mode
                              nyxt/mode/vi:vi-insert-mode)
                            :test #'eq))
                  %slot-value%)))
      (pushnew 'nyxt/mode/emacs:emacs-mode modes)))))
