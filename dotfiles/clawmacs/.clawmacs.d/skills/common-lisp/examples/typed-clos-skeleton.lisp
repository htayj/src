(in-package :cl-user)

(defpackage :cookbook-clos-example
  (:use :cl)
  (:export #:shape #:circle #:shape-area))

(in-package :cookbook-clos-example)

(declaim (optimize (speed 1) (safety 3) (debug 3)))

(defclass shape () ())

(defclass circle (shape)
  ((radius :initarg :radius
           :reader circle-radius
           :type double-float)))

(declaim (ftype (function (shape) double-float) shape-area))
(defgeneric shape-area (object))

(defmethod shape-area ((object circle))
  (declare (type circle object))
  (let ((radius (circle-radius object)))
    (declare (type double-float radius))
    (* pi radius radius)))
