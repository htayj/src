;;; $DOOMDIR/config.el -*- lexical-binding: t; -*-

;; Place your private configuration here! Remember, you do not need to run 'doom
;; sync' after modifying this file!


;; Some functionality uses this to identify you, e.g. GPG configuration, email
;; clients, file templates and snippets. It is optional.
;; (setq user-full-name "John Doe"
;;       user-mail-address "john@doe.com")

;; Doom exposes five (optional) variables for controlling fonts in Doom:
;;
;; - `doom-font' -- the primary font to use
;; - `doom-variable-pitch-font' -- a non-monospace font (where applicable)
;; - `doom-big-font' -- used for `doom-big-font-mode'; use this for
;;   presentations or streaming.
;; - `doom-symbol-font' -- for symbols
;; - `doom-serif-font' -- for the `fixed-pitch-serif' face
;;
;; See 'C-h v doom-font' for documentation and more examples of what they
;; accept. For example:
;;
;;(setq doom-font (font-spec :family "Fira Code" :size 12 :weight 'semi-light)
;;      doom-variable-pitch-font (font-spec :family "Fira Sans" :size 13))
;;
;; If you or Emacs can't find your font, use 'M-x describe-font' to look them
;; up, `M-x eval-region' to execute elisp code, and 'M-x doom/reload-font' to
;; refresh your font settings. If Emacs still can't find your font, it likely
;; wasn't installed correctly. Font issues are rarely Doom issues!

;; There are two ways to load a theme. Both assume the theme is installed and
;; available. You can either set `doom-theme' or manually load a theme with the
;; `load-theme' function. This is the default:
;; (setq doom-theme 'doom-outrun-electric)
(setq doom-theme 'doom-tty)

;; (setq doom-font "DIGITAL-vt220-medium-normal-normal-80col-20-*-*-*-c-100-*-*")
(setq doom-font (font-spec :size 20 :name "vt220" ))
(setq doom-symbol-font (font-spec :size 16 :name "Unifont"))

;; This determines the style of line numbers in effect. If set to `nil', line
;; numbers are disabled. For relative line numbers, set this to `relative'.
(setq display-line-numbers-type t)

;; If you use `org' and don't want your org files in the default location below,
;; change `org-directory'. It must be set before org loads!
(setq org-directory "~/org/")


;; Whenever you reconfigure a package, make sure to wrap your config in an
;; `after!' block, otherwise Doom's defaults may override your settings. E.g.
;;
;;   (after! PACKAGE
;;     (setq x y))
;;
;; The exceptions to this rule:
;;
;;   - Setting file/directory variables (like `org-directory')
;;   - Setting variables which explicitly tell you to set them before their
;;     package is loaded (see 'C-h v VARIABLE' to look up their documentation).
;;   - Setting doom variables (which start with 'doom-' or '+').
;;
;; Here are some additional functions/macros that will help you configure Doom.
;;
;; - `load!' for loading external *.el files relative to this one
;; - `use-package!' for configuring packages
;; - `after!' for running code after a package has loaded
;; - `add-load-path!' for adding directories to the `load-path', relative to
;;   this file. Emacs searches the `load-path' when you load packages with
;;   `require' or `use-package'.
;; - `map!' for binding new keys
;;
;; To get information about any of these functions/macros, move the cursor over
;; the highlighted symbol at press 'K' (non-evil users must press 'C-c c k').
;; This will open documentation for it, including demos of how they are used.
;; Alternatively, use `C-h o' to look up a symbol (functions, variables, faces,
;; etc).
;;
;; You can also try 'gd' (or 'C-c c d') to jump to their definition and see how
;; they are implemented.

;; lsp config
(setq lsp-enable-symbol-highlighting nil)
;; symex config
(use-package! symex
  :custom
  (symex-modal-backend 'evil)
  :config
  (symex-initialize))
(map! :n ";" #'symex-mode-interface)

;; (map! :mode emacs-lisp-mode :n "C-;" #'symex-mode-interface)
(map! :map emacs-lisp-mode-map :n "C-;" #'symex-mode-interface)

;;rainbow mode TODO
;;symex bindings
;; restore some bindings from my vanilla emacs config
(map! "C-x C-b" #'consult-buffer
      "C-x k" #'kill-current-buffer)

;; (map! )

;;doom's treesit
(setq +tree-sitter-hl-enabled-modes '(typescript-tsx-mode typescript-mode))
;; (use-package! tree-sitter-langs
;;   :config
;;   (tree-sitter-require 'tsx)
;;   (add-to-list 'tree-sitter-major-mode-language-alist '(tsx-ts-mode . tsx))
;;   (add-to-list 'tree-sitter-major-mode-language-alist '(typescript-mode . tsx))
;;   (add-to-list 'tree-sitter-major-mode-language-alist '(typescript-tsx-mode . tsx))
;;   (add-to-list 'tree-sitter-major-mode-language-alist '(web-mode . tsx))
;;   (add-to-list 'tree-sitter-major-mode-language-alist '(tsx-ts-mode . tsx)))

;; (use-package! tree-sitter-langs
;;   :config
;;   (tree-sitter-require 'tsx)
;;   (add-to-list 'tree-sitter-major-mode-language-alist '(typescript-mode . tsx))
;;   (add-to-list 'tree-sitter-major-mode-language-alist '(typescript-tsx-mode . typescript)))

;; (tree-sitter-langs-install-grammars)
;; (use-package! evil-textobj-tree-sitter)

;; manually set native treesit for typescript
(customize-set-variable 'treesit-font-lock-level 4)
;; (treesit-font-lock-recompute-features)
;; (treesit-language-available-p 'tsx)
(setq treesit-extra-load-path '("/home/tay/.emacs.vanilla.d/tree-sitter/"))
;; (derived-mode-add-parents 'typescript-tsx-mode (tsx-ts-mode)) ;; this just makes it replace the mode
;; (derived-mode-add-parents 'typescript-tsx-mode (list 'tsx-ts-mode)) ;;this doesnt seem to do anything but does add it as a parent
;; (derived-mode-all-parents 'typescript-tsx-mode)
(derived-mode-add-parents 'tsx-ts-mode (list 'typescript-tsx-mode))
(derived-mode-all-parents 'tsx-ts-mode)

;; (derived-mode-set-parent 'typescript-ts-base-mode 'typescript-tsx-mode)
;; (add-hook 'tsx-ts-mode-hook #'rainbow-delimiters-mode-enable)
;; (add-to-list 'lsp--formatting-indent-alist '(typescript-tsx-mode . typescript-indent-level))

;; (add-hook 'tsx-ts-mode-hook #'lsp!)

(setq! tree-sitter-load-path '("/home/tay/.tree-sitter/bin/"))
;; "(program\n (import_statement\n  (import_clause\n   (named_imports\n    (import_specifier (identifier) @hl.default)))))"
(tree-sitter-hl-add-patterns 'tsx
  [(import_specifier (identifier) @keyword.import)])

;; (import_specifier (identifier) @keyword.import)

;; return () should not be a function call

;; import statements
;; (program
;;  (import_statement
;;   (import_clause
;;    (named_imports
;;     (import_specifier (identifier) @keyword.import)))))
(+global-word-wrap-mode +1)
