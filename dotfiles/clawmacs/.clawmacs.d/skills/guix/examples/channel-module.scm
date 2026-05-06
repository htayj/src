;;; Example: Channel package module boilerplate
;;; This shows the structure for a package in a custom Guix channel.
;;;
;;; If .guix-channel has (directory "guix"), this file lives at:
;;;   guix/my-channel/packages/my-package.scm
;;;
;;; Otherwise it lives at:
;;;   my-channel/packages/my-package.scm

(define-module (my-channel packages my-package)
  #:use-module (guix packages)
  #:use-module (guix git-download)       ; for git-fetch
  #:use-module (guix build-system cmake)
  #:use-module ((guix licenses) #:prefix license:)
  #:use-module (guix gexp)
  #:use-module (gnu packages pkg-config)
  #:use-module (gnu packages tls))       ; openssl, etc.

(define-public my-package
  (package
    (name "my-package")
    (version "3.1.0")
    (source (origin
              (method git-fetch)
              (uri (git-reference
                    (url "https://github.com/user/my-package")
                    (commit (string-append "v" version))))
              (file-name (git-file-name name version))
              (sha256
               (base32
                "0000000000000000000000000000000000000000000000000000"))))
    (build-system cmake-build-system)
    (arguments
     (list
      #:configure-flags #~(list "-DBUILD_SHARED_LIBS=ON"
                                "-DBUILD_TESTING=ON")
      #:phases
      #~(modify-phases %standard-phases
          (add-after 'unpack 'fix-version
            (lambda _
              (substitute* "CMakeLists.txt"
                (("project\\(my-package VERSION [0-9.]+\\)")
                 (string-append "project(my-package VERSION "
                                #$version ")"))))))))
    (native-inputs (list pkg-config))
    (inputs (list openssl))
    (synopsis "example package for a Guix channel")
    (description
     "This is an example package definition for a custom Guix channel,
demonstrating @code{git-fetch}, @code{cmake-build-system}, build phase
customization, and proper input categorization.")
    (home-page "https://github.com/user/my-package")
    (license license:bsd-3)))
