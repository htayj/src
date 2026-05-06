(in-package :cl-user)

(defpackage :cookbook-io-loop-example
  (:use :cl)
  (:export #:read-non-empty-lines))

(in-package :cookbook-io-loop-example)

(declaim (ftype (function (pathname) list) read-non-empty-lines))

(defun read-non-empty-lines (path)
  (declare (type pathname path)
           (optimize (speed 1) (safety 3) (debug 3)))
  (with-open-file (stream path :direction :input)
    (declare (type stream stream))
    (loop for line of-type (or null string) = (read-line stream nil nil)
          while line
          unless (string= line "")
            collect line)))
