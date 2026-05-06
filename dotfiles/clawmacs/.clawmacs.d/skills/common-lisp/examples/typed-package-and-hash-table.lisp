(in-package :cl-user)

(defpackage :cookbook-hash-example
  (:use :cl)
  (:export #:build-word-counts #:lookup-word-count))

(in-package :cookbook-hash-example)

(declaim (ftype (function (list) hash-table) build-word-counts))
(declaim (ftype (function (hash-table string) (values (or null fixnum) boolean))
                lookup-word-count))

(defun build-word-counts (words)
  (declare (type list words)
           (optimize (speed 1) (safety 3) (debug 3)))
  (let ((table (make-hash-table :test #'equal)))
    (declare (type hash-table table))
    (dolist (word words table)
      (declare (type t word))
      (let* ((text (string word))
             (count (gethash text table 0)))
        (declare (type string text)
                 (type fixnum count))
        (setf (gethash text table) (the fixnum (1+ count)))))))

(defun lookup-word-count (table word)
  (declare (type hash-table table)
           (type string word)
           (optimize (speed 1) (safety 3) (debug 3)))
  (multiple-value-bind (value presentp) (gethash word table)
    (declare (type t value))
    (values (and presentp (the fixnum value)) presentp)))
