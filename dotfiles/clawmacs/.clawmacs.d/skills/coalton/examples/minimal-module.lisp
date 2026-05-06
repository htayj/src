(defpackage #:minimal-coalton-project
  (:use #:coalton #:coalton-prelude)
  (:local-nicknames (#:str #:coalton/string))
  (:export #:Person #:Person/name #:greet))

(in-package #:minimal-coalton-project)

(named-readtables:in-readtable coalton:coalton)

(coalton-toplevel
  (define-struct Person
    (name String)
    (age UFix))

  (declare greet (Person -> String))
  (define (greet p)
    (str:concat "Hello, " (Person-name p))))
