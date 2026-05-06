;;; Example: Prebuilt binary package using copy-build-system
;;; Useful for proprietary software, AppImages, or static binaries

(define-module (my-channel packages binary-example)
  #:use-module (guix packages)
  #:use-module (guix download)
  #:use-module (guix build-system copy)
  #:use-module ((guix licenses) #:prefix license:)
  #:use-module (guix gexp)
  #:use-module (gnu packages base)        ; glibc
  #:use-module (gnu packages gcc)         ; gcc:lib
  #:use-module (gnu packages elf))        ; patchelf

(define-public binary-tool
  (package
    (name "binary-tool")
    (version "2.0.0")
    (source (origin
              (method url-fetch)
              (uri (string-append
                    "https://github.com/example/binary-tool/releases/download/v"
                    version "/binary-tool-" version "-linux-x86_64.tar.gz"))
              (sha256
               (base32
                "0000000000000000000000000000000000000000000000000000"))))
    (build-system copy-build-system)
    (arguments
     (list
      #:install-plan #~'(("binary-tool" "bin/binary-tool"))
      #:phases
      #~(modify-phases %standard-phases
          (add-after 'install 'patch-elf
            (lambda* (#:key inputs outputs #:allow-other-keys)
              (let* ((out (assoc-ref outputs "out"))
                     (bin (string-append out "/bin/binary-tool"))
                     (libc (assoc-ref inputs "libc"))
                     (gcc-lib (assoc-ref inputs "gcc:lib"))
                     (ld-so (string-append libc "/lib/ld-linux-x86-64.so.2"))
                     (rpath (string-join
                             (list (string-append libc "/lib")
                                   (string-append gcc-lib "/lib"))
                             ":")))
                (invoke "patchelf" "--set-interpreter" ld-so bin)
                (invoke "patchelf" "--set-rpath" rpath bin)))))))
    (native-inputs (list patchelf))
    (inputs (list (list gcc "lib") glibc))
    (supported-systems '("x86_64-linux"))
    (synopsis "example prebuilt binary tool")
    (description
     "This is an example package definition demonstrating how to package
a prebuilt binary using @code{copy-build-system} with @code{patchelf}
to fix the dynamic linker and library paths.")
    (home-page "https://github.com/example/binary-tool")
    (license license:asl2.0)))
