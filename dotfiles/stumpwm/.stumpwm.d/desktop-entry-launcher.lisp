;; -*-lisp-*-

(in-package :stumpwm)

(ignore-errors (desktop-entry:init-entry-list))

(defvar *app-launcher-history* nil
  "Application names launched via app-launcher, most-recent first.")
(defparameter *app-launcher-history-length* 10
  "How many recent launches app-launcher pins at the top of its menu.")

(defcommand app-launcher () ()
  "Fuzzy-pick a desktop application from the native menu and launch it."
  (when (null desktop-entry:*entry-list*)
    (desktop-entry:init-entry-list))
  (let* ((*menu-maximum-height* *tay-completion-menu-height*)
         (sorted
          (sort
           (loop for entry in desktop-entry:*entry-list*
                 for name = (desktop-entry::name entry)
                 when (and name
                           (equal "Application" (desktop-entry::entry-type entry))
                           (not (desktop-entry::no-display entry))
                           (not (desktop-entry::only-show-in entry)))
                   collect (list name entry))
           #'string-lessp :key #'first))
         (recent (loop for name in *app-launcher-history*
                       for hit = (find name sorted :key #'first :test #'string=)
                       when hit collect hit))
         (entries (append recent
                          (remove-if (lambda (entry)
                                       (member (first entry)
                                               *app-launcher-history*
                                               :test #'string=))
                                     sorted)))
         (selection (and entries
                         (select-from-menu (current-screen)
                                           entries
                                           "Launch:"
                                           0))))
    (cond
      ((null entries)
       (message "No applications found."))
      (selection
       (let ((name (first selection))
             (entry (second selection)))
         (setf *app-launcher-history*
               (cons name
                     (remove name *app-launcher-history* :test #'string=)))
         (when (> (length *app-launcher-history*)
                  *app-launcher-history-length*)
           (setf *app-launcher-history*
                 (subseq *app-launcher-history*
                         0
                         *app-launcher-history-length*)))
         (if (desktop-entry::terminal entry)
             (run-shell-command
              (format nil "~A -e ~A"
                      *terminal-program*
                      (desktop-entry::command-line entry)))
             (run-shell-command (desktop-entry::command-line entry)))))
      (t
       (throw 'error :abort)))))

(define-key *top-map* (kbd "A-SPC") "app-launcher")
