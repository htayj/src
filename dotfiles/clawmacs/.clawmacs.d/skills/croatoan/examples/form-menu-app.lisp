(in-package :common-lisp-user)

(defpackage :croatoan-form-menu-app
  (:use :cl :croatoan)
  (:export #:main))

(in-package :croatoan-form-menu-app)

(defun main ()
  (with-screen (scr :input-blocking t :enable-colors t)
    (let* ((name-field (make-instance 'field :name :name :title "Name" :width 20))
           (enabled-box (make-instance 'checkbox :name :enabled :title "Enabled"))
           (submit-button (make-instance 'button :name :submit :title "Save"
                                         :callback #'return-form-values))
           (frm (make-instance 'form-window
                               :title "Settings"
                               :elements (list name-field enabled-box submit-button))))
      (draw frm)
      (refresh scr)
      (multiple-value-bind (accepted values) (edit frm)
        (declare (ignore accepted))
        (clear scr)
        (add-string scr (format nil "Returned values: ~S" values))
        (refresh scr)
        (bind scr #\q #'exit-event-loop)
        (run-event-loop scr)))))
