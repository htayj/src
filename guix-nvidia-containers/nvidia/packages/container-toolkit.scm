;;; Copyright © 2024 Luciano Laratelli <luciano@laratel.li>
;;; Copyright © 2024 Connor Clark <connor@psyleft.com>
;;; Copyright © 2024 Ian FitzPatrick <ian@ianfitzpatrick.eu>
;;;
;;; This file is NOT part of GNU Guix, but is supposed to be used with GNU
;;; Guix and thus has the same license.
;;;
;;; GNU Guix is free software; you can redistribute it and/or modify it
;;; under the terms of the GNU General Public License as published by
;;; the Free Software Foundation; either version 3 of the License, or (at
;;; your option) any later version.
;;;
;;; GNU Guix is distributed in the hope that it will be useful, but
;;; WITHOUT ANY WARRANTY; without even the implied warranty of
;;; MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
;;; GNU General Public License for more details.
;;;
;;; You should have received a copy of the GNU General Public License
;;; along with GNU Guix.  If not, see <http://www.gnu.org/licenses/>.

(define-module (nvidia packages container-toolkit)
  #:use-module (guix gexp)
  #:use-module (guix git-download)
  #:use-module (guix utils)
  #:use-module (guix build utils)
  #:use-module (guix packages)
  #:use-module (guix build-system go)
  #:use-module (guix build-system gnu)
  #:use-module (guix licenses)
  #:use-module (gnu packages)
  #:use-module (gnu packages docker)
  #:use-module (gnu packages commencement)
  #:use-module (gnu packages onc-rpc)
  #:use-module (gnu packages golang)
  #:use-module (gnu packages check)
  #:use-module (gnu packages base)
  #:use-module (gnu packages curl)
  #:use-module (gnu packages version-control)
  #:use-module (gnu packages virtualization)
  #:use-module (gnu packages pkg-config)
  #:use-module (gnu packages gcc)
  #:use-module (gnu packages tls)
  #:use-module (gnu packages elf)
  #:use-module (gnu packages m4)
  #:use-module (gnu packages linux))

;; Locate patches via %load-path (works reliably in compiled channel modules,
;; unlike current-filename which returns #f after compilation).
(define %nvidia-patch-dir
  (string-append (dirname (search-path %load-path
                                       "nvidia/packages/container-toolkit.scm"))
                 "/patches"))

(define (nvidia-search-patches . names)
  (parameterize ((%patch-path (cons %nvidia-patch-dir (%patch-path))))
    (map search-patch names)))

(define-public nvidia-modprobe
  (package
    (name "nvidia-modprobe")
    (version "570.181")
    (source (origin
              (method git-fetch)
              (uri (git-reference
                    (url "https://github.com/NVIDIA/nvidia-modprobe")
                    (commit version)))
              (file-name (git-file-name name version))
              (sha256
               (base32 "04mdd8s2g2wyxqa9lrfjgshjyqjkwmni8xra56b3vx7yj5fc3h01"))))
    (build-system gnu-build-system)
    (arguments
     (list
      #:phases
      #~(modify-phases %standard-phases
          (delete 'configure)
          (add-after 'unpack 'set-correct-cflags
            (lambda* (#:key inputs outputs #:allow-other-keys)
              (setenv "CFLAGS" "-fPIC")
              (substitute* "modprobe-utils/nvidia-modprobe-utils.c"
                (("^static int nvidia_cap_get_device_file_attrs")
                 "int nvidia_cap_get_device_file_attrs"))
              (substitute* "modprobe-utils/nvidia-modprobe-utils.h"
                (("} NvDeviceFileState;")
                 "} NvDeviceFileState;\nint nvidia_cap_get_device_file_attrs(const char* cap_file_path,int *major,int *minor,char *name);\n"))))
          (add-after 'build 'build-static-link-libraries
            (lambda* (#:key inputs outputs #:allow-other-keys)
              (invoke "ar" "rcs"
                      "_out/Linux_x86_64/libnvidia-modprobe-utils.a"
                      "_out/Linux_x86_64/nvidia-modprobe-utils.o"
                      "_out/Linux_x86_64/pci-sysfs.o")
              (copy-recursively "_out/Linux_x86_64/"
                                (string-append #$output "/lib"))))
          (delete 'check)
          (add-after 'patch-source-shebangs 'replace-prefix
            (lambda* (#:key inputs outputs #:allow-other-keys)
              (setenv "CC" "gcc")
              (setenv "PREFIX" #$output)
              (copy-recursively "modprobe-utils/"
                                (string-append #$output "/include")))))
      #:tests? #f))
    (native-inputs
     (list gcc-toolchain m4))
    (synopsis "Load the NVIDIA kernel module and create NVIDIA character device files")
    (description
     "Load the NVIDIA kernel module and create NVIDIA character device files.")
    (home-page "https://github.com/NVIDIA/nvidia-modprobe")
    (license gpl2)))

(define-public libnvidia-container
  (package
    (name "libnvidia-container")
    (version "1.17.8")
    (source (origin
              (method git-fetch)
              (uri (git-reference
                    (url "https://github.com/NVIDIA/libnvidia-container")
                    (commit (string-append "v" version))))
              (file-name (git-file-name name version))
              (patches (nvidia-search-patches "libnvidia-container.patch"))
              (sha256
               (base32 "0a0i0gm9c4xh9mzrxm1d7r1c878afzrwh49imqk3i3yn35ixqf1v"))))
    (build-system gnu-build-system)
    (arguments
     (list
      #:phases
      #~(modify-phases %standard-phases
          (delete 'configure)
          (delete 'build)
          (delete 'check)
          (add-after 'unpack 'ensure-writable-source
            (lambda* (#:key inputs outputs #:allow-other-keys)
              (setenv "HOME" "/tmp")
              (make-file-writable "src/cli/libnvc.c")
              (make-file-writable "src/ldcache.c")
              (make-file-writable "src/ldcache.h")
              (make-file-writable "src/nvc_info.c")
              (make-file-writable "src/common.h")
              (make-file-writable "src/nvc_internal.h")))
          (add-after 'ensure-writable-source 'fix-library-paths
            (lambda* (#:key inputs outputs #:allow-other-keys)
              (substitute* "src/common.h"
                (("#define LIB_DIR.*\"/lib64\"")
                 "#define LIB_DIR \"/run/current-system/profile/lib:/lib64\"")
                (("#define USR_LIB_DIR.*\"/usr/lib64\"")
                 "#define USR_LIB_DIR \"/run/current-system/profile/lib:/usr/lib64\""))
              (substitute* "src/cli/libnvc.c"
                (("static const char \\*libnvml_soname= \"libnvidia-ml.so.1\";")
                 "static const char *libnvml_soname= \"/run/current-system/profile/lib/libnvidia-ml.so.1\";"))
              (substitute* "src/nvc_internal.h"
                (("#define SONAME_LIBNVML  \"libnvidia-ml.so.1\"")
                 "#define SONAME_LIBNVML  \"/run/current-system/profile/lib/libnvidia-ml.so.1\""))
              (substitute* "src/common.h"
                (("#define LDCONFIG_PATH.*\"/sbin/ldconfig\"")
                 (string-append "#define LDCONFIG_PATH \""
                                #$output "/bin/guix-ldconfig-stub\""))
                (("#define LDCONFIG_ALT_PATH.*\"/sbin/ldconfig.real\"")
                 (string-append "#define LDCONFIG_ALT_PATH \""
                                #$output "/bin/guix-ldconfig-stub\"")))))
          (add-after 'patch-source-shebangs 'replace-prefix
            (lambda* (#:key inputs outputs #:allow-other-keys)
              (substitute* "Makefile"
                (("/usr/local") (assoc-ref outputs "out"))
                (("debug??libdir?") "debug")
                ((".*nvidia-modprobe.mk.*") "\n")
                (("^all: shared static tools")
                 "all: shared tools")
                ((".*LIB_STATIC.*libdir.*$") ""))
              (substitute* "mk/nvcgo.mk"
                ((".*-rf.*")
                 "\tmkdir -p ${SRCS_DIR} && echo \"sources dir: ${SRCS_DIR}\"\n")
                (("CURDIR./src/..PREFIX.")
                 "CURDIR)/src/$(PREFIX)/*"))
              (setenv "C_INCLUDE_PATH"
                      (string-append (getenv "C_INCLUDE_PATH") ":"
                                     #$libtirpc "/include/tirpc"))
              (setenv "LIBRARY_PATH"
                      (string-append (getenv "LIBRARY_PATH") ":"
                                     #$libtirpc "/lib"))
              (setenv "LDFLAGS"
                      (string-append (or (getenv "LDFLAGS") "")
                                     " -ltirpc -lseccomp -lcap -Wl,-rpath="
                                     (assoc-ref outputs "out") "/lib"))
              (setenv "CFLAGS"
                      (string-append (or (getenv "CFLAGS") "")
                                     " -DWITH_TIRPC -g"))
              (substitute* "Makefile"
                (("^WITH_LIBELF.*no")
                 "WITH_LIBELF ?= yes"))
              (substitute* "mk/common.mk"
                (("^REVISION.*")
                 (string-append "REVISION ?= " #$version "\n"
                                "CC := gcc\n")))))
          (add-before 'install 'create-ldconfig-stub
            (lambda* (#:key outputs #:allow-other-keys)
              (let ((bin-dir (string-append (assoc-ref outputs "out") "/bin")))
                (mkdir-p bin-dir)
                (call-with-output-file (string-append bin-dir "/guix-ldconfig-stub")
                  (lambda (port)
                    (format port "#!/bin/sh~%# Stub ldconfig for Guix~%exit 0~%")))
                (chmod (string-append bin-dir "/guix-ldconfig-stub") #o755))))
          (replace 'install
            (lambda* (#:key outputs #:allow-other-keys)
              (invoke "make" "MAJOR=1" "MINOR=17" "PATCH=8" "install"))))
      #:tests? #f))
    (native-inputs
     (list libseccomp nvidia-modprobe which libtirpc libcap
           libelf git-minimal curl docker go rpcsvc-proto pkgconf))
    (synopsis "Build and run containers leveraging NVIDIA GPUs")
    (description
     "The NVIDIA Container Toolkit allows users to build and run GPU
accelerated containers.  The toolkit includes a container runtime library
and utilities to automatically configure containers to leverage NVIDIA GPUs.")
    (home-page "https://github.com/NVIDIA/nvidia-container-toolkit")
    (license asl2.0)))

(define-public nvidia-container-toolkit
  (package
    (name "nvidia-container-toolkit")
    (version "1.17.8")
    (source (origin
              (method git-fetch)
              (uri (git-reference
                    (url "https://github.com/NVIDIA/nvidia-container-toolkit")
                    (commit (string-append "v" version))))
              (file-name (git-file-name name version))
              (sha256
               (base32 "06lh7drkrkb2aw37vbhcx75an0n30dvy2q816s6clhvb2wzxqph7"))))
    (build-system go-build-system)
    (arguments
     (list
      #:import-path "github.com/NVIDIA/nvidia-container-toolkit"
      #:phases
      #~(modify-phases %standard-phases
          (add-after 'unpack 'fix-paths
            (lambda* (#:key inputs outputs #:allow-other-keys)
              (substitute* "src/github.com/NVIDIA/nvidia-container-toolkit/internal/config/config.go"
                (("/usr/bin")
                 (string-append #$output "/bin"))
                (("Runtimes:.*\\[\\]string\\{\"docker-runc\", \"runc\", \"crun\"\\}")
                 (string-append "Runtimes: []string{\""
                                #$(file-append (this-package-input "runc")
                                               "/sbin/runc")
                                "\", \"docker-runc\", \"runc\", \"crun\"}"))
                (("ldconfigPath\\(\"@/sbin/ldconfig\"\\)")
                 (string-append "ldconfigPath(\"@"
                                #$(file-append (this-package-input "libnvidia-container")
                                               "/bin/guix-ldconfig-stub")
                                "\")")))
              (substitute* "src/github.com/NVIDIA/nvidia-container-toolkit/tools/container/toolkit/toolkit.go"
                (("\"/sbin/ldconfig\"")
                 (string-append "\""
                                #$(file-append (this-package-input "libnvidia-container")
                                               "/bin/guix-ldconfig-stub")
                                "\"")))))
          (replace 'build
            (lambda arguments
              (for-each
               (lambda (directory)
                 (apply (assoc-ref %standard-phases 'build)
                        (append arguments (list #:import-path directory))))
               '("github.com/NVIDIA/nvidia-container-toolkit/cmd/nvidia-ctk"
                 "github.com/NVIDIA/nvidia-container-toolkit/cmd/nvidia-container-runtime"
                 "github.com/NVIDIA/nvidia-container-toolkit/cmd/nvidia-container-runtime-hook")))))
      #:tests? #f
      #:install-source? #f))
    (inputs (list runc))
    (propagated-inputs
     (list libnvidia-container))
    (synopsis "Build and run containers leveraging NVIDIA GPUs")
    (description
     "The NVIDIA Container Toolkit allows users to build and run GPU
accelerated containers.  The toolkit includes a container runtime library
and utilities to automatically configure containers to leverage NVIDIA GPUs.")
    (home-page "https://github.com/NVIDIA/nvidia-container-toolkit")
    (license asl2.0)))
