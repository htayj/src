;;; Example: Python package using pyproject-build-system
;;; Demonstrates modern Python packaging with pyproject.toml

(define-module (my-channel packages python-example)
  #:use-module (guix packages)
  #:use-module (guix download)
  #:use-module (guix build-system pyproject)
  #:use-module ((guix licenses) #:prefix license:)
  #:use-module (gnu packages check)        ; python-pytest
  #:use-module (gnu packages python-build) ; python-setuptools, python-wheel
  #:use-module (gnu packages python-xyz))  ; other python libs

(define-public python-example-lib
  (package
    (name "python-example-lib")
    (version "0.5.0")
    (source (origin
              (method url-fetch)
              (uri (pypi-uri "example-lib" version))
              (sha256
               (base32
                "0000000000000000000000000000000000000000000000000000"))))
    (build-system pyproject-build-system)
    (arguments
     (list
      ;; Use pytest as the test backend
      #:test-backend 'pytest
      ;; Skip network-dependent tests
      #:test-flags #~'("-k" "not test_network")))
    (native-inputs
     (list python-pytest
           python-setuptools
           python-wheel))
    (propagated-inputs
     (list python-requests))   ; Runtime dep that importers need
    (synopsis "example Python library for demonstration")
    (description
     "This is an example package definition demonstrating the
@code{pyproject-build-system} for Python packages that use
@file{pyproject.toml}.")
    (home-page "https://github.com/example/example-lib")
    (license license:expat)))
