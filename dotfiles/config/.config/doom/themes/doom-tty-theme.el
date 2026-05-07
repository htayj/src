;;; doom-acario-dark-theme.el --- an original dark theme -*- lexical-binding: t; no-byte-compile: t; -*-
;;
;; Added: August 12, 2019 (#319)
;; Author: gagbo <https://github.com/gagbo>
;; Maintainer: gagbo <https://github.com/gagbo>
;; Source: original
;;
;;; Commentary:
;;; Code:

(require 'doom-themes)
(defun color-string (hex)
  (format "#%03X" hex))
(defun cga-bright-hex (hex)
  "Make a cga color into the bright form."
  (+ hex #x555))

(defun cga-bright (c)
  "Make a cga color into the bright form."
  (list (cga-bright-hex (car c)) (+ 1 (cadr c)) (format "bright%s" (caddr c))))

(defun print-cga (cga-props)
  (let ((cstr (color-string (car cga-props)))
        (cnum (cadr cga-props))
        (cname (caddr cga-props)))
    (list cstr (format "color-%d" cnum) cname )))

(defconst cga-black          '(#x000 0 "black"))
(defconst cga-red            '(#xa00 1 "red"))
(defconst cga-green          '(#x0a0 2 "green"))
(defconst cga-yellow         '(#xa50 3 "yellow"))
(defconst cga-blue           '(#x00a 4 "blue"))
(defconst cga-cyan           '(#x0aa 5 "cyan"))
(defconst cga-magenta        '(#xa0a 6 "magenta"))
(defconst cga-white          '(#xaaa 7 "white"))
(defconst cga-bright-yellow  '(#xff5 10 "brightyellow"))

(defconst ega-yellow  '(#xaa0 10 "yellow"))

(cga-bright cga-red)

(print-cga cga-bright-yellow)
(print-cga (cga-bright cga-red))


;;; Variables
(defgroup doom-tty-theme nil
  "Options for the `tty' theme."
  :group 'doom-themes)

(defcustom doom-tty-brighter-modeline nil
  "If non-nil, more vivid colors will be used to style the mode-line."
  :group 'doom-tty-theme
  :type 'boolean)

(defcustom doom-tty-brighter-comments nil
  "If non-nil, comments will be highlighted in more vivid colors."
  :group 'doom-tty-theme
  :type 'boolean)

(defcustom doom-tty-comment-bg doom-tty-brighter-comments
  "If non-nil, comments will have a subtle, darker background. Enhancing their
legibility."
  :group 'doom-tty-theme
  :type 'boolean)

(defcustom doom-tty-padded-modeline doom-themes-padded-modeline
  "If non-nil, adds a 4px padding to the mode-line. Can be an integer to
determine the exact padding."
  :group 'doom-tty-theme
  :type '(or integer boolean))


;;
;;; Theme definition

(def-doom-theme doom-tty
    "A dark theme inspired by the TTY (VGA/CGA/EGA colors)"

  ;; name        default   256         16
  ((bg         (print-cga cga-black))


   (black        (print-cga cga-black))
   (red        (print-cga cga-red))
   (green      (print-cga cga-green))
   (yellow     (print-cga cga-yellow))
   (blue       (print-cga (cga-bright cga-blue)))
   (magenta    (print-cga cga-magenta))
   (cyan       (print-cga cga-cyan))
   (white        (print-cga cga-white))
   (bright-black      (print-cga (cga-bright cga-black)))
   (bright-red        (print-cga (cga-bright cga-red)))
   (bright-green      (print-cga (cga-bright cga-green)))
   (bright-yellow     (print-cga cga-bright-yellow))
   (bright-blue       (print-cga (cga-bright cga-blue) ))
   (bright-magenta    (print-cga (cga-bright cga-magenta) ))
   (bright-cyan       (print-cga (cga-bright cga-cyan) ))
   (bright-white      (print-cga (cga-bright cga-white)))
   (grey       bright-black)

   (orange     (print-cga cga-yellow))
   (bright-orange       (print-cga (cga-bright cga-yellow) ))
   (teal       '("#2D9574" "color-29"  "brightcyan"   ))
   (violet     '("#AB11D8" "color-128" "brightmagenta"))

   (bg-blue    '("#0C213E" "color-17"  "brightblack"  ))
   (dark-blue  bg-blue)
   (bg-cyan    '("#092D27" "color-23"   "brightblack"  ))
   (dark-cyan  bg-cyan)

   (bg-alt     '("#010101" "color-232" "brightblack"  ))
   (base0      '("#0F0F0F" "color-234" "black"        ))
   (base1      '("#121212" "color-233" "brightblack"  ))
   (base2      '("#1E1E1E" "color-236" "brightblack"  ))
   (base3      '("#040" "color-240" "brightblack"  ))
   (base4      '("#004" "color-60"  "brightblack"  ))
   (base5      '("#400" "color-243" "brightblack"  ))
   (base6      '("#440" "color-109" "white"        ))
   (base7      '("#404" "color-249" "white"        ))
   (base8      '("#044" "color-252" "brightwhite"  ))
   (fg         (print-cga cga-white))
   (fg-alt     (print-cga (cga-bright cga-white)))
   ;; face categories -- required for all themes
   (highlight      bright-white)
   (vertical-bar   base0)
   (selection      bg-blue)
   (comments       (if doom-tty-brighter-comments orange grey))
   (doc-comments   (if doom-tty-brighter-comments orange blue))
   (constants      yellow)
   (methods        cyan)
   (operators      magenta)
   (strings        green)
   (keywords       bright-magenta)
   (functions      bright-cyan)
   (type           bright-green)
   (variables      bright-yellow)
   (numbers        bright-blue)
   (builtin        bright-blue)
   (region         base3)
   (error          bright-red)
   (warning        bright-orange)
   (success        bright-green)
   (vc-modified    yellow)
   (vc-added       green)
   (vc-deleted     red)

   ;; custom categories
   (hidden bg)
   (-modeline-bright doom-tty-brighter-modeline)
   (-modeline-pad
    (when doom-tty-padded-modeline
      (if (integerp doom-tty-padded-modeline) doom-tty-padded-modeline 4)))

   (modeline-fg     'unspecified)
   (modeline-fg-alt base7)

   (modeline-bg
    (if -modeline-bright
        (doom-blend blue bg 0.35)
      `(,(car base3) ,@(cdr base1))))
   (modeline-bg-l
    (if -modeline-bright
        (doom-blend blue bg-alt 0.35)
      `(,(car base2) ,@(cdr base0))))
   (modeline-bg-inactive   `(,(doom-darken (car bg-alt) 0.2) ,@(cdr base0)))
   (modeline-bg-inactive-l (doom-darken bg 0.20)))


  ;;;; Base theme face overrides
  ((highlight :foreground nil :background nil :inverse-video t)
   (cursor :inverse-video t :foreground black :background bright-white)
   (hl-line :background nil :extend nil)
   (font-lock-comment-face
    :slant 'italic
    :foreground comments
    :background (if doom-tty-comment-bg
                    (doom-lighten bg 0.05)
                  'unspecified))
   (font-lock-doc-face
    :inherit 'font-lock-comment-face
    :foreground doc-comments)
   ((line-number &override) :foreground base4)
   ((highlight-quoted-symbol &override) :foreground green)
   ((line-number-current-line &override) :foreground orange :bold bold)
   (mode-line
    :background modeline-bg :foreground modeline-fg
    :box (if -modeline-pad `(:line-width ,-modeline-pad :color ,modeline-bg)))
   (mode-line-inactive
    :background modeline-bg-inactive :foreground modeline-fg-alt
    :box (if -modeline-pad `(:line-width ,-modeline-pad :color ,modeline-bg-inactive)))
   (mode-line-emphasis :foreground (if -modeline-bright base8 orange))

   (link                 :foreground highlight :underline t :weight 'normal)
   ;;;; all-the-icons
   ((all-the-icons-dblue &override) :foreground teal)
   ;;;; css-mode <built-in> / scss-mode
   (css-proprietary-property :foreground orange)
   (css-property             :foreground green)
   (css-selector             :foreground blue)
   (tree-sitter-hl-face:attribute             :foreground bright-yellow :background green)
   (tree-sitter-hl-face:tag :foreground bright-green)
   (tree-sitter-hl-face:method.call :foreground bright-cyan :background magenta)
   (tree-sitter-hl-face:function.call :foreground bright-cyan :background blue)
   ;;;; doom-modeline
   (doom-modeline-bar :background (if -modeline-bright modeline-bg orange))
   (doom-modeline-buffer-file :inherit 'mode-line-buffer-id :weight 'bold)
   (doom-modeline-buffer-path :inherit 'mode-line-emphasis :weight 'bold)
   (doom-modeline-buffer-project-root :foreground green :weight 'bold)
   ;;;; elscreen
   (elscreen-tab-other-screen-face :background bg-blue :foreground fg-alt)
   ;;;; flycheck
   (flycheck-popup-tip-face :background bg-blue :foreground fg-alt)
   (flycheck-posframe-info-face :background bg-blue :foreground fg-alt)
   (flycheck-posframe-warning-face :inherit 'warning)
   (flycheck-posframe-error-face :inherit 'error)
   ;;;; hl-fill-column-face
   (hl-fill-column-face :background bg-alt :foreground fg-alt)
   ;;;; ivy
   (ivy-current-match :background bg-blue :distant-foreground base0 :weight 'normal)
   (ivy-posframe :background base1 :foreground fg)
   (internal-border :background base7)
   ;;;; lsp-mode and lsp-ui-mode
   (lsp-ui-peek-highlight :foreground yellow)
   (lsp-ui-sideline-symbol-info :foreground (doom-blend comments bg 0.85)
                                :background bg-alt)
   ;;;; magit
   (magit-blame-culprit :foreground yellow)
   (magit-blame-header :foreground green)
   (magit-blame-sha1 :foreground yellow)
   (magit-blame-subject :foreground yellow)
   (magit-blame-time :foreground green)
   (magit-blame-name :foreground yellow)
   (magit-blame-heading :foreground green)
   (magit-blame-hash :foreground yellow)
   (magit-blame-summary :foreground yellow)
   (magit-blame-date :foreground green)
   (magit-log-date :foreground fg-alt)
   (magit-log-graph :foreground fg-alt)
   (magit-reflog-amend :foreground magenta)
   (magit-reflog-other :foreground cyan)
   (magit-reflog-rebase :foreground magenta)
   (magit-reflog-remote :foreground cyan)
   (magit-reflog-reset :foreground red)
   (magit-branch :foreground magenta :weight 'bold)
   (magit-branch-current :foreground blue :weight 'bold :box t)
   (magit-branch-local :foreground blue :weight 'bold)
   (magit-branch-remote :foreground orange :weight 'bold)
   (magit-diff-file-header :foreground yellow)
   (magit-diff-file-heading :foreground blue :weight 'light)
   (magit-diff-file-heading-highlight :foreground blue :weight 'bold)
   (magit-diff-file-heading-selection :foreground blue :weight 'bold :background base1)
   (magit-diff-hunk-heading :foreground yellow :weight 'light)
   (magit-diff-hunk-heading-highlight :foreground yellow :weight 'bold)
   (magit-diff-hunk-heading-selection :inherit 'selection :weight 'bold)
   (magit-diff-added :foreground green :weight 'light)
   (magit-diff-removed :foreground red :weight 'light)
   (magit-diff-context :foreground fg :weight 'light)
   (magit-diff-added-highlight :foreground green :weight 'bold)
   (magit-diff-removed-highlight :foreground red :weight 'bold)
   (magit-diff-context-highlight :foreground fg :weight 'bold)
   (magit-diff-base :foreground fg :weight 'light)
   (magit-diff-base-highlight :foreground fg :weight 'bold)
   (magit-diff-lines-boundary :background fg :foreground base2)
   (magit-diff-lines-heading :background fg :foreground base2)
   (magit-hash :foreground yellow)
   (magit-item-highlight :background grey)
   (magit-log-author :foreground yellow)
   (magit-log-head-label-head :background yellow :foreground bg-alt :weight 'bold)
   (magit-log-head-label-local :background red :foreground bg-alt :weight 'bold)
   (magit-log-head-label-remote :background green :foreground bg-alt :weight 'bold)
   (magit-log-head-label-tags :background magenta :foreground bg-alt :weight 'bold)
   (magit-log-head-label-wip :background cyan :foreground bg-alt :weight 'bold)
   (magit-log-sha1 :foreground green)
   (magit-process-ng :foreground orange :weight 'bold)
   (magit-process-ok :foreground yellow :weight 'bold)
   (magit-section-heading :foreground bright-cyan)
   (magit-section-highlight :weight 'bold)
   (section-heading-selection :foreground red :weight 'bold)
   (magit-section-title :background bg-alt :foreground red :weight 'bold)
   (magit-cherry-equivalent :foreground magenta)
   (magit-cherry-unmatched :foreground cyan)
   (magit-reflog-checkout :foreground blue)
   (magit-reflog-cherry-pick :foreground green)
   (magit-bisect-bad :foreground red)
   (magit-bisect-good :foreground green)
   (magit-bisect-skip :foreground fg)
   (magit-diff-conflict-heading :foreground fg)
   (magit-dimmed :foreground base8)
   (magithub-ci-no-status :foreground grey)
   (magithub-issue-number :foreground fg)
   (magithub-notification-reason :foreground fg)
   ;;;; markdown-mode
   (markdown-markup-face :foreground base5)
   (markdown-header-face :inherit 'bold :foreground red)
   ((markdown-code-face &override) :background (doom-lighten base3 0.05))
   ;;;; org <built-in>
   ((org-block &override) :background bg-alt)
   ((org-block-begin-line &override) :background bg :foreground comments :slant 'italic)
   ((org-quote &override) :background base1)
   (org-hide :foreground hidden)
   ;;;; solaire-mode
   (solaire-mode-line-face
    :inherit 'mode-line
    :background modeline-bg-l
    :box (if -modeline-pad `(:line-width ,-modeline-pad :color ,modeline-bg-l)))
   (solaire-mode-line-inactive-face
    :inherit 'mode-line-inactive
    :background modeline-bg-inactive-l
    :box (if -modeline-pad `(:line-width ,-modeline-pad :color ,modeline-bg-inactive-l)))
   ;;;; whitespace <built-in>
   (whitespace-indentation :inherit 'default)
   (whitespace-big-indent :inherit 'default))

  ;;;; Base theme variable overrides-
  ;; ()
  )

;;; doom-tty-theme.el ends here
