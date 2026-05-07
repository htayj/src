;; =============================================================================
;; evil mode
;; =============================================================================
(use-package evil
  :init
  (setq evil-want-integration t)
  (setq evil-want-keybinding nil)
  :custom
  (evil-undo-system 'undo-tree)
  (evil-search-module 'isearch)
  :config
  (evil-mode 1)
  (setq evil-search-module 'isearch)
  (define-key evil-insert-state-map (kbd "C-g") 'evil-normal-state))

(use-package evil-collection
  :after evil
  :config
  (evil-collection-init)
  (setq evil-want-keybinding t)
  (evil-set-initial-state 'eaf-mode 'emacs)
  (evil-set-initial-state 'exwm-mode 'emacs))

(use-package evil-surround
  :config
  (global-evil-surround-mode 1))

(use-package undo-tree
  :config
  (setq undo-tree-history-directory-alist '(("." . "~/.emacs.d/undo")))
  (global-undo-tree-mode))
