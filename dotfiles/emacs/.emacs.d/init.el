;;; init.el --- Description -*- lexical-binding: t; -*-
;;
;; Copyright (C) 2025 Taylor Hardy
;;
;; Author: Taylor Hardy
;; Maintainer: Taylor Hardy 
;; Created: April 15, 2025
;; Modified: April 15, 2025
;; Version: 0.0.1
;; Homepage: https://github.com/tay/emacs.d
;; Package-Requires: ((emacs "30.1"))
;;
;; This file is not part of GNU Emacs.
;;
;;; Commentary:
;;
;;  Description
;;
;;; Code:


;; =============================================================================
;; bootstrapping package stuff
;; =============================================================================

;; default emacs package management
;; DONE maybe do this in early-init.el?
;; (require 'package)
;; (setq package-enable-at-startup nil)
;; TODO maybe move the rest out of early-init?
;; (setq package-archives '(("ELPA"  . "http://tromey.com/elpa/")
;;                          ("gnu"   . "http://elpa.gnu.org/packages/")
;;                          ("melpa" . "https://melpa.org/packages/")
;;                          ("org"   . "https://orgmode.org/elpa/")))
;; (package-initialize)

;; bootstrap use-package
(require 'use-package)

;;; Bootstrapping straight
(defvar bootstrap-version)
(let ((bootstrap-file
       (expand-file-name "straight/repos/straight.el/bootstrap.el" user-emacs-directory))
      (bootstrap-version 5))
  (unless (file-exists-p bootstrap-file)
    (with-current-buffer
        (url-retrieve-synchronously
         "https://raw.githubusercontent.com/raxod502/straight.el/develop/install.el"
         'silent 'inhibit-cookies)
      (goto-char (point-max))
      (eval-print-last-sexp)))
  (load bootstrap-file nil 'nomessage))

(use-package straight
  :custom (straight-use-package-by-default t))

;; Emacs 30 ships an older built-in `compat' that `use-package' loads before
;; straight is bootstrapped.  Newer straight packages (e.g. Vertico/Corfu) may
;; call functions from compat-31 such as `set-local'; require that layer from
;; straight explicitly so find-file/completion does not fail with
;; "void-function set-local".
(straight-use-package 'compat)
(require 'compat-31)

;; have to install org early for some reason
(straight-use-package 'org)
;; =============================================================================
;; Custom use-package bindings
;; =============================================================================

;; =============================================================================
;; basic UX things
;; =============================================================================
(tool-bar-mode -1)
(menu-bar-mode -1)
(scroll-bar-mode -1)
(global-auto-revert-mode 1)

(global-set-key (kbd "C-x k") 'kill-current-buffer)
(global-unset-key (kbd "<menu>"))

(set-face-attribute 'default nil
                    :foundry "DIGITAL"
										:family "vt220"
                    :height 150
                    :inverse-video nil
										:box nil
										:strike-through nil
										:overline nil
										:underline nil
										:slant 'normal
										:weight 'medium
										:width 'normal  )

;; (set-face-attribute 'default nil
;;                     :foundry "GNU" :family "unifont"
;;                     :height 120
;;                    :inverse-video nil :box nil :strike-through nil :overline nil :underline nil :slant 'normal :weight 'medium  :width 'normal  )
(set-fontset-font t nil (font-spec :size 20 :name "vt220" ))
(set-fontset-font t nil (font-spec :size 16 :name "unifont"))

;; use camelCase word delim
(global-subword-mode 1)

;; which key
(which-key-mode 1)

(use-package s)
;; set backup directory so that we dont litter around every directory
(setq backup-directory-alist '(("." . "~/.emacs-file-backups")))

;; =============================================================================
;; irc
;; =============================================================================
(use-package erc-hl-nicks
  :straight t
  :config
  (erc-update-modules))
(setq erc-nick "htayj")
(setq erc-prompt (lambda () (concat "[" (buffer-name) "]")))
(setq erc-hide-list '("JOIN" "PART" "QUIT"))
(setq erc-interpret-mirc-color t)
(setq erc-modules
			'(completion log notifications hl-nicks netsplit fill button match track readonly networks ring autojoin noncommands irccontrols move-to-prompt stamp menu list))
'(erc-prompt-for-password nil)
(add-to-list 'erc-mode-hook (lambda ()
                              (set (make-local-variable 'scroll-conservatively) 100)))
(require 'erc-goodies)


(setq erc-track-exclude-types '("JOIN" "KICK" "NICK" "PART" "333" "353"))
(setq erc-server-history-list '("irc.libera.chat"
                                "irc.deft.com"
                                "localhost"))
(setq erc-autojoin-channels-alist '( ("libera.chat" "#pine64" "#fsf" "#searx" "#guix" "#emacs" "#hurd" "#guix" "#lisp" "##trans" "##transgeeks") ))

(setq erc-autojoin-timing 'ident)

(setq erc-track-exclude
			'("##latinitas" "##latin" "#EsperantoAmeriko#1" "#kulupupitokipona#1"))
(setq erc-interpret-mirc-color t)
;; Keep ERC credentials in auth-source or a private environment variable.

(use-package znc
  :config
  (let ((password (getenv "ZNC_PASSWORD")))
    (when (and password (not (string= password "")))
      (setq znc-servers
            `(("192.168.1.242" 6667 t
               ((GGn "tay" ,password)
                (aither "tay" ,password))))))))
;; circe for znc
;; =============================================================================
;; emacs 29 included treesit and eglot
;; =============================================================================

;; treesit config
(require 'treesit)
(use-package treesit-auto
  :custom
  (treesit-auto-install 'prompt)
  :config
  (treesit-auto-add-to-auto-mode-alist 'all)
  (global-treesit-auto-mode))

;;eglot config
(require 'eglot)
(add-to-list 'eglot-server-programs
             '((tsx-mode) "~/.nvm/versions/node/v18.14.2/bin/typescript-language-server" "--stdio"))
(add-to-list 'eglot-server-programs
             '((tsx-ts-mode) "~/.nvm/versions/node/v18.14.2/bin/typescript-language-server" "--stdio"))
(add-to-list 'eglot-server-programs
             '((typescript-ts-mode) "~/.nvm/versions/node/v18.14.2/bin/typescript-language-server" "--stdio"))
;; (add-to-list 'eglot-server-programs
;;              '((js-json-mode) "vscode-json-languageserver" "--stdio"))
;; (add-to-list 'eglot-server-programs
;;              '((tsx-mode) "npx typescript-language-server""--stdio"))
;; (add-to-list 'eglot-server-programs
;;              '((tsx-ts-mode) "npx typescript-language-server" "--stdio"))
(add-to-list 'eglot-server-programs
             '((js-json-mode) "vscode-json-languageserver" "--stdio"))

(add-hook 'typescript-ts-mode-hook 'eglot-ensure)
(add-hook 'tsx-ts-mode-hook 'eglot-ensure)
(add-hook 'js-json-mode-hook 'eglot-ensure)

(use-package markdown-mode) ;; required for eglot eldoc
;; =============================================================================
;; handle delimiters
;; =============================================================================
(show-paren-mode 1)
(setq show-paren-style 'expression)


(use-package rainbow-delimiters
  :straight t
  :init
  (add-hook 'prog-mode-hook #'rainbow-delimiters-mode))

;; =============================================================================
;; Common Lisp
;; =============================================================================
(use-package slime
  :init
  (setq inferior-lisp-program
        (or (executable-find "sbcl")
            (executable-find "ecl")
            "sbcl"))
  :custom
  (slime-contribs '(slime-fancy slime-asdf slime-quicklisp)))
;; =============================================================================
;; evil mode
;; =============================================================================
(load-file "~/.emacs.d/evil.el")

;; =============================================================================
;; meow mode
;; =============================================================================
;;(load-file "~/.emacs.d/meow.el")

;; =============================================================================
;; ibuffer
;; =============================================================================
(use-package ibuffer
  :bind
  ("C-x b" . ibuffer))


;; =============================================================================
;; AI tools
;; =============================================================================

(use-package eat
  :straight (:host codeberg :repo "akib/emacs-eat" :files ("*.el" ("term" "term/*.el") "*.texi"
                                                           "*.ti" ("terminfo/e" "terminfo/e/*")
                                                           ("terminfo/65" "terminfo/65/*")
                                                           ("integration" "integration/*")
                                                           (:exclude ".dir-locals.el" "*-tests.el")))
  :config
  (evil-collection-eat-setup)
  (evil-collection-define-key 'normal 'eat-mode-map
    "p" 'eat-yank
    "P" 'eat-yank)
  (defun eat--auto-scroll-to-bottom ()
    (when eat-terminal
      (let ((pos (eat-term-display-cursor eat-terminal)))
        (goto-char pos)
        (dolist (window (get-buffer-window-list nil nil t))
          (set-window-point window pos)))))
  (add-hook 'eat-update-hook #'eat--auto-scroll-to-bottom))

(use-package claude-code
  :straight (:host github :repo "stevemolitor/claude-code.el")
  :after eat
  :config
  (claude-code-mode)
  :bind-keymap ("C-c c" . claude-code-command-map)
  :custom
  (claude-code-terminal-backend 'eat)
  (claude-code-term-name "eat-truecolor")
  (claude-code-display-window-fn #'switch-to-buffer)
  (claude-code-process-environment-functions
   '((lambda (_buf _dir) '("COLORTERM=truecolor")))))

;; model context provider
;; (use-package mcp
;;   :straight (:host github :repo "lizqwerscott/mcp.el" :files ("*.el"))
;;   :ensure t
;;   :after gptel
;;   :custom (mcp-hub-servers
;;            '(("filesystem-emacs" . (:command "npx" :args ("-y" "@modelcontextprotocol/server-filesystem" "~/.emacs.d/")))))
;;   :config (require 'mcp-hub)
;;   :hook (after-init . mcp-hub-start-all-server))
;; (setq mcp-hub-servers
;;       '(("filesystem-emacs" . (:command "npx" :args ("-y" "@modelcontextprotocol/server-filesystem" "~/.emacs.d/")))))

;; (setq mcp-default-server "filesystem-emacs")

;; copilot autocomplete
;; (use-package copilot
;;   :straight (:host github :repo "copilot-emacs/copilot.el" :files ("*.el"))
;;   :ensure t
;;   :hook (prog-mode . copilot-mode)
;;   :bind (:map copilot-completion-map
;;               ("C-M-<tab>" . 'copilot-accept-completion)
;;               ("C-M-w" . 'copilot-accept-completion-by-word))
;;   :config
;;   (add-to-list 'copilot-major-mode-alist '("typescript-ts" . "typescript"))
;;   (add-to-list 'copilot-major-mode-alist '("tsx-ts" . "typescriptreact")))

;; copilot agentic interface
;; (use-package copilot-chat
;;   :straight (:host github :repo "chep/copilot-chat.el" :files ("*.el"))
;;   :after (request org markdown-mode))


;; =============================================================================
;; completion framework
;; =============================================================================

;; minibuffer completion engine
(use-package vertico
  :bind
  ("C-x C-b" . switch-to-buffer)
  :init
  (vertico-mode))
;; todo: add directory up
;; "C-h" (cmds! (eq 'file (vertico--metadata-get 'category)) #'vertico-directory-up)
;; "C-l" (cmds! (eq 'file (vertico--metadata-get 'category)) #'+vertico/enter-or-preview))

;; fuzzy find
(use-package orderless
  :custom
  ;; Configure a custom style dispatcher (see the Consult wiki)
  ;; (orderless-style-dispatchers '(+orderless-consult-dispatch orderless-affix-dispatch))
  ;; (orderless-component-separator #'orderless-escapable-split-on-space)
  (completion-styles '(orderless basic))
  (completion-category-defaults nil)
  (completion-category-overrides '((file (styles partial-completion)))))

;; show more info in minibuffer 
(use-package marginalia
  ;; Bind `marginalia-cycle' locally in the minibuffer.  To make the binding
  ;; available in the *Completions* buffer, add it to the
  ;; `completion-list-mode-map'.
  :bind (:map minibuffer-local-map
              ("M-A" . marginalia-cycle))

  :init
  (marginalia-mode))

;; TODO consult
(use-package consult
  ;; Replace bindings. Lazily loaded by `use-package'.
  :bind (;; C-c bindings in `mode-specific-map'
         ("C-c M-x" . consult-mode-command)
         ("C-c h" . consult-history)
         ("C-c k" . consult-kmacro)
         ("C-c m" . consult-man)
         ("C-c i" . consult-info)
         ([remap Info-search] . consult-info)
         ;; C-x bindings in `ctl-x-map'
         ("C-x M-:" . consult-complex-command)     ;; orig. repeat-complex-command
         ("C-x C-b" . consult-buffer)                ;; orig. switch-to-buffer
         ("C-x 4 b" . consult-buffer-other-window) ;; orig. switch-to-buffer-other-window
         ("C-x 5 b" . consult-buffer-other-frame)  ;; orig. switch-to-buffer-other-frame
         ;; ("C-x t b" . consult-buffer-other-tab)    ;; orig. switch-to-buffer-other-tab
         ("C-x r b" . consult-bookmark)            ;; orig. bookmark-jump
         ("C-x p b" . consult-project-buffer)      ;; orig. project-switch-to-buffer
         ;; Custom M-# bindings for fast register access
         ("M-#" . consult-register-load)
         ("M-'" . consult-register-store)          ;; orig. abbrev-prefix-mark (unrelated)
         ("C-M-#" . consult-register)
         ;; Other custom bindings
         ("M-y" . consult-yank-pop)                ;; orig. yank-pop
         ;; M-g bindings in `goto-map'
         ("M-g e" . consult-compile-error)
         ("M-g f" . consult-flymake)               ;; Alternative: consult-flycheck
         ("M-g g" . consult-goto-line)             ;; orig. goto-line
         ("M-g M-g" . consult-goto-line)           ;; orig. goto-line
         ("M-g o" . consult-outline)               ;; Alternative: consult-org-heading
         ("M-g m" . consult-mark)
         ("M-g k" . consult-global-mark)
         ("M-g i" . consult-imenu)
         ("M-g I" . consult-imenu-multi)
         ;; M-s bindings in `search-map'
         ("M-s d" . consult-find)                  ;; Alternative: consult-fd
         ("M-s c" . consult-locate)
         ("M-s g" . consult-grep)
         ("M-s G" . consult-git-grep)
         ("M-s r" . consult-ripgrep)
         ("M-s l" . consult-line)
         ("M-s L" . consult-line-multi)
         ("M-s k" . consult-keep-lines)
         ("M-s u" . consult-focus-lines)
         ;; Isearch integration
         ("M-s e" . consult-isearch-history)
         :map isearch-mode-map
         ("M-e" . consult-isearch-history)         ;; orig. isearch-edit-string
         ("M-s e" . consult-isearch-history)       ;; orig. isearch-edit-string
         ("M-s l" . consult-line)                  ;; needed by consult-line to detect isearch
         ("M-s L" . consult-line-multi)            ;; needed by consult-line to detect isearch
         ;; Minibuffer history
         :map minibuffer-local-map
         ("M-s" . consult-history)                 ;; orig. next-matching-history-element
         ("M-r" . consult-history))                ;; orig. previous-matching-history-element

  ;; Enable automatic preview at point in the *Completions* buffer. This is
  ;; relevant when you use the default completion UI.
  :hook (completion-list-mode . consult-preview-at-point-mode)

  ;; The :init configuration is always executed (Not lazy)
  :init

  ;; Tweak the register preview for `consult-register-load',
  ;; `consult-register-store' and the built-in commands.  This improves the
  ;; register formatting, adds thin separator lines, register sorting and hides
  ;; the window mode line.
  (advice-add #'register-preview :override #'consult-register-window)
  (setq register-preview-delay 0.5)

  ;; Use Consult to select xref locations with preview
  (setq xref-show-xrefs-function #'consult-xref
        xref-show-definitions-function #'consult-xref)

  ;; Configure other variables and modes in the :config section,
  ;; after lazily loading the package.
  :config

  ;; Optionally configure preview. The default value
  ;; is 'any, such that any key triggers the preview.
  ;; (setq consult-preview-key 'any)
  ;; (setq consult-preview-key "M-.")
  ;; (setq consult-preview-key '("S-<down>" "S-<up>"))
  ;; For some commands and buffer sources it is useful to configure the
  ;; :preview-key on a per-command basis using the `consult-customize' macro.
  (consult-customize
   consult-theme :preview-key '(:debounce 0.2 any)
   consult-ripgrep consult-git-grep consult-grep consult-man
   consult-bookmark consult-recent-file consult-xref
   consult--source-bookmark consult--source-file-register
   consult--source-recent-file consult--source-project-recent-file
   ;; :preview-key "M-."
   :preview-key '(:debounce 0.4 any))

  ;; Optionally configure the narrowing key.
  ;; Both < and C-+ work reasonably well.
  (setq consult-narrow-key "<") ;; "C-+"

  ;; Optionally make narrowing help available in the minibuffer.
  ;; You may want to use `embark-prefix-help-command' or which-key instead.
  ;; (keymap-set consult-narrow-map (concat consult-narrow-key " ?") #'consult-narrow-help)
  )
;; TODO embark

;; autocomplete in buffer
(use-package corfu
  ;; Optional customizations
  :custom

  (corfu-auto t)               ;; Enable auto completion
  (corfu-preselect 'directory) ;; Select the first candidate, except for directories
  ;; (corfu-cycle t)                ;; Enable cycling for `corfu-next/previous'
  ;; (corfu-quit-at-boundary nil)   ;; Never quit at completion boundary
  ;; (corfu-quit-no-match nil)      ;; Never quit, even if there is no match
  ;; (corfu-preview-current nil)    ;; Disable current candidate preview
  ;; (corfu-preselect 'prompt)      ;; Preselect the prompt
  ;; (corfu-on-exact-match nil)     ;; Configure handling of exact matches

  ;; Enable Corfu only for certain modes. See also `global-corfu-modes'.
  ;; :hook ((prog-mode . corfu-mode)
  ;;        (shell-mode . corfu-mode)
  ;;        (eshell-mode . corfu-mode))

  :init

  ;; Recommended: Enable Corfu globally.  Recommended since many modes provide
  ;; Capfs and Dabbrev can be used globally (M-/).  See also the customization
  ;; variable `global-corfu-modes' to exclude certain modes.
  (global-corfu-mode)

  ;; Enable optional extension modes:
  ;; (corfu-history-mode)
  (corfu-popupinfo-mode))

;; =============================================================================
;; magit
;; =============================================================================
(use-package magit
  :straight t
  :config
  (setq magit-push-always-verify nil)
  (setq git-commit-summary-max-length 180))

;; =============================================================================
;; magit-delta — syntax-highlighted diffs in magit via the `delta' CLI.
;; Subprocess cost is non-trivial on huge diffs; toggle off with
;; `M-x magit-delta-mode' if a giant MR drags.  Skipped entirely on hosts
;; without the `delta' binary so this config stays portable.
;;
;; NB: magit-delta does `(require 'dash)' but does NOT declare dash in its
;; Package-Requires, so straight will not pull it in transitively.  Declare
;; it explicitly here to register dash's load-path entry before magit-delta
;; loads (otherwise: "no such file or directory `dash'" at first diff).
;; =============================================================================
(use-package dash :straight t)

(use-package magit-delta
  :straight t
  :after magit
  :if (executable-find "delta")
  :hook (magit-mode . magit-delta-mode))

;; =============================================================================
;; tramp
;; =============================================================================
;; (add-to-list 'tramp-remote-path
;;              '(tramp-own-remote-path
;;                tramp-default-remote-path
;;                "/bin" "/usr/bin"
;;                "/sbin" "/usr/sbin" "/usr/local/bin"
;;                "/usr/local/sbin" "/local/bin"
;;                "/local/freeware/bin" "/local/gnu/bin"
;;                "/usr/freeware/bin" "/usr/pkg/bin"
;;                "/usr/contrib/bin" "/opt/bin" "/opt/sbin"
;;                "/opt/local/bin" "/opt/homebrew/bin"
;;                "/opt/homebrew/sbin"
;;                "/run/current-system/profile/bin"))
;; (add-to-list 'tramp-methods
;; 	           '("guix"
;; 	             (tramp-login-program "nsenter")
;; 	             (tramp-login-args (("-a" "-t" "%h")
;; 				                          ("/run/current-system/profile/bin/bash" "--login")))
;; 	             (tramp-remote-shell "/run/current-system/profile/bin/bash")
;; 	             (tramp-remote-shell-args ("-c"))))
;; =============================================================================
;; ocaml
;; =============================================================================
(use-package tuareg
  :ensure t
  :mode ("\\.ml\\'" . tuareg-mode))


(use-package ocaml-eglot
  :ensure t
  :after tuareg
  :hook
  (tuareg-mode . ocaml-eglot)
  (ocaml-eglot . eglot-ensure))

;; =============================================================================
;; prot's themes
;; =============================================================================
;; (use-package standard-themes)
;; (use-package ef-themes)

;; use modus as fallback
(use-package modus-themes
  :config
  (load-theme 'modus-vivendi t))

;; =============================================================================
;; other themes
;; =============================================================================
;; (use-package cyberpunk-theme
;;   :config
;;   (load-theme 'cyberpunk t))
;; use moe as the main theme
(setq moe-dark-bg "#000")
(use-package moe-theme
  :config
  (load-theme 'moe-dark t))

;; add color to compilation
(defun my/ansi-colorize-buffer ()
  (let ((buffer-read-only nil))
    (ansi-color-apply-on-region (point-min) (point-max))))
(add-hook 'compilation-filter-hook 'my/ansi-colorize-buffer)

;;(use-package ement
;;  :straight (ement :type git :host github :repo "alphapapa/ement.el")
;;  :config (ement-connect :user-id "@tay:vexillomancy.org"
;;												 :uri-prefix "http://localhost:8008"
;;												 :password
;;												 (auth-source-pick-first-password
;;													:host "matrix.vexillomancy.org"
;;													:user "tay")))
(use-package apheleia
  :config
  (apheleia-global-mode +1))
(setq tab-width 2)
(setq indent-tabs-mode nil)





;;; init.el ends here
(custom-set-variables
 ;; custom-set-variables was added by Custom.
 ;; If you edit it by hand, you could mess it up, so be careful.
 ;; Your init file should contain only one such instance.
 ;; If there is more than one, they won't work right.
 '(claude-code-confirm-kill nil)
 '(custom-safe-themes
   '("3b2ae1d19f5843cdc5833266b76e6367744932d96c5ddd713ede9797a2bd93fe"
     "8899e88d19a37d39c7187f4bcb5bb596fba990728ef963420b93e2aea5d1666a"
     "a1c18db2838b593fba371cb2623abd8f7644a7811ac53c6530eebdf8b9a25a8d"
     "ae20535e46a88faea5d65775ca5510c7385cbf334dfa7dde93c0cd22ed663ba0"
     "cee5c56dc8b95b345bfe1c88d82d48f89e0f23008b0c2154ef452b2ce348da37"
     "1ad12cda71588cc82e74f1cabeed99705c6a60d23ee1bb355c293ba9c000d4ac"
     "0b41a4a9f81967daacd737f83d3eac7e3112d642e3f786cf7613de4da97a830a"
     "aa545934ce1b6fd16b4db2cf6c2ccf126249a66712786dd70f880806a187ac0b"
     default))
 '(erc-accidental-paste-threshold-seconds 5)
 '(erc-ask-about-multiline-input t)
 '(erc-fill-column 110)
 '(erc-insert-timestamp-function 'erc-insert-timestamp-left)
 '(erc-modules
   '(button completion fill log match menu move-to-prompt nicks
            notifications scrolltobottom stamp hl-nicks netsplit fill
            button match track readonly networks ring autojoin
            noncommands irccontrols move-to-prompt stamp menu list))
 '(erc-pals '("Ammonium8755" "FlowPlay"))
 '(erc-timestamp-intangible t)
 '(erc-timestamp-only-if-changed-flag nil)
 '(erc-timestamp-use-align-to nil)
 '(indent-tabs-mode nil)
 '(safe-local-variable-values
   '((projectile-project-compilation-cmd
      . "npx lerna run compile --stream")
     (projectile-project-test-cmd . "npx lerna run test --stream")
     (projectile-project-package-cmd . "../script/build")
     (projectile-project-configure-cmd
      . "npx lerna run clean && npm run bootstrap && npx lerna run compile --stream")
     (projectile-project-run-cmd . "npm run dev")
     (combobulate-highlight-queries-alist
      (:language tsx :query
                 "(program\12 (import_statement\12  (import_clause\12   (named_imports\12    (import_specifier (identifier) @hl.default)))))"))))
 '(tab-width 2))
(custom-set-faces
 ;; custom-set-faces was added by Custom.
 ;; If you edit it by hand, you could mess it up, so be careful.
 ;; Your init file should contain only one such instance.
 ;; If there is more than one, they won't work right.
 )

;; Per-host fragment — loaded last so a machine can override anything
;; above it. File path: ~/.emacs.d/host-<system-name>.el.
(let ((host-file (expand-file-name (format "host-%s.el" (system-name))
                                   user-emacs-directory)))
  (when (file-exists-p host-file)
    (load host-file nil 'nomessage)))


(put 'narrow-to-region 'disabled nil)
