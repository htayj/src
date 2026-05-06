(in-package :common-lisp-user)

(defpackage :croatoan-minimal-screen
  (:use :cl :croatoan)
  (:export #:main))

(in-package :croatoan-minimal-screen)

(defun main ()
  (with-screen (scr :input-blocking t :enable-colors t)
    (add-string scr "Croatoan says hi. Press q to quit.")
    (refresh scr)
    (bind scr #\q #'exit-event-loop)
    (run-event-loop scr)))
