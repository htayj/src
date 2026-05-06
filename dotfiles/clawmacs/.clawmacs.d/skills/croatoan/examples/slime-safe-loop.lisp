(in-package :common-lisp-user)

(defpackage :croatoan-slime-safe-loop
  (:use :cl :croatoan)
  (:export #:main #:*screen*))

(in-package :croatoan-slime-safe-loop)

(defparameter *screen* nil)

(defun main ()
  (with-screen (scr :input-blocking 100 :bind-debugger-hook nil)
    (setf *screen* scr)
    (bind scr #\c (lambda (win event)
                    (declare (ignore win event))
                    (clear scr)
                    (refresh scr)))
    (bind scr #\q #'exit-event-loop)
    (add-string scr "Use (croatoan:submit ...) from SLIME. q quits.")
    (refresh scr)
    (run-event-loop scr)))

;; Example from a different thread / SLIME REPL:
;; (croatoan:submit (croatoan:add-string croatoan-slime-safe-loop:*screen* "Hello from SLIME"))
