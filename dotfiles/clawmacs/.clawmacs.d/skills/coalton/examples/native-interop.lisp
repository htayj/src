(defpackage #:coalton-native-interop-example
  (:use #:coalton #:coalton-prelude)
  (:export #:StringView #:make-string-view #:string-view-empty-p))

(in-package #:coalton-native-interop-example)

(named-readtables:in-readtable coalton:coalton)

(coalton-toplevel
  (repr :native cl:string)
  (define-type StringView)

  (declare make-string-view (String -> StringView))
  (define (make-string-view str)
    (lisp (-> StringView) (str)
      str))

  (declare string-view-empty-p (StringView -> Boolean))
  (define (string-view-empty-p str)
    (lisp (-> Boolean) (str)
      (cl:if (cl:zerop (cl:length str)) True False))))
