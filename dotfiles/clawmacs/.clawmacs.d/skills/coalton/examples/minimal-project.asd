(asdf:defsystem "minimal-coalton-project"
  :depends-on ("coalton" "named-readtables")
  :defsystem-depends-on ("coalton-asdf")
  :components ((:file "package")
               (:ct-file "core"))
  :in-order-to ((test-op (test-op "minimal-coalton-project/test"))))

(asdf:defsystem "minimal-coalton-project/test"
  :depends-on ("minimal-coalton-project" "coalton/testing" "fiasco")
  :defsystem-depends-on ("coalton-asdf")
  :pathname "test/"
  :components ((:ct-file "test"))
  :perform (test-op (o s)
             (symbol-call '#:minimal-coalton-project/test '#:run-tests)))
