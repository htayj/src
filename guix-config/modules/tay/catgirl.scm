(define-module (tay catgirl)
  #:use-module (gnu packages irc)
  #:use-module (gnu packages pkg-config)
  #:use-module (gnu packages tls)
  #:use-module (guix build-system gnu)
  #:use-module (guix download)
  #:use-module (guix packages)
  #:use-module (guix utils)
  #:use-module ((guix licenses) #:prefix license:)
  #:export (catgirl-openssl))

;; Stock catgirl links against LibreSSL, whose certificate verifier rejects
;; ZNC's existing self-signed CA:FALSE server certificate as a trust anchor.
;; LibreTLS provides the same libtls API over OpenSSL; its `trust` path accepts
;; that exact public certificate without changing the ZNC endpoint certificate.
(define libretls
  (package
    (name "libretls")
    (version "3.8.1")
    (source
     (origin
       (method url-fetch)
       (uri (string-append "https://causal.agency/libretls/libretls-"
                           version ".tar.gz"))
       (sha256
        (base32 "1dcp54lwq42nqylh27hap08dd9pxm29lkr7513vf4zl2c47grj9v"))))
    (build-system gnu-build-system)
    (native-inputs (list pkg-config))
    (inputs (list openssl))
    (synopsis "libtls API implemented over OpenSSL")
    (description
     "LibreTLS implements the libtls API with OpenSSL, allowing TLS clients
using libtls to use OpenSSL's certificate validation and trust store.")
    (home-page "https://git.causal.agency/libretls/")
    (license (list license:isc license:bsd-3 license:expat))))

(define catgirl-openssl
  (package
    (inherit catgirl)
    (name "catgirl-openssl")
    (inputs (modify-inputs (package-inputs catgirl)
              (delete "libressl")
              (append libretls openssl)))))
