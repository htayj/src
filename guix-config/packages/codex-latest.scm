;; Local Guix Home package override for Codex stable releases.

(use-modules ((guix licenses) #:prefix license:)
             (guix gexp)
             (guix packages)
             (guix download)
             (guix git-download)
             (guix import crate)
             (guix build-system cargo)
             (gnu packages bash)
             (gnu packages base)
             (gnu packages cmake)
             (gnu packages compression)
             (gnu packages libunwind)
             (gnu packages linux)
             (gnu packages llvm)
             (gnu packages perl)
             (gnu packages pkg-config)
             (gnu packages python)
             (gnu packages sqlite)
             (gnu packages textutils)
             (gnu packages tls)
             (gnu packages version-control)
             (ice-9 eval-string)
             (ice-9 ftw)
             (guix read-print))

(define %codex-version "0.118.0")
(define %codex-support-dir
  (string-append (dirname (current-filename)) "/codex"))
(define %codex-lockfile (string-append %codex-support-dir "/Cargo.lock"))
(define %codex-runfiles-commit
  "b56cbaa8465e74127f1ea216f813cd377295ad81")
(define %codex-nucleo-commit
  "4253de9faabb4e5c6d81d946a5e35a90f87347ee")
(define %codex-runfiles-source
  (origin
    (method git-fetch)
    (uri (git-reference
          (url "https://github.com/dzbarsky/rules_rust")
          (commit %codex-runfiles-commit)))
    (file-name "rust-runfiles-0.1.0.b56cbaa-checkout")
    (sha256
     (base32 "1sdmgr8gramp4z1kfsmbx083gpinzk8bz3vi0fchbwr1qhnmb6mq"))))
(define %codex-nucleo-source
  (origin
    (method git-fetch)
    (uri (git-reference
          (url "https://github.com/helix-editor/nucleo.git")
          (commit %codex-nucleo-commit)))
    (file-name "rust-nucleo-0.5.0.4253de9-checkout")
    (sha256
     (base32 "1hpy62kgzhswhfrhipka9inh4c6iisklmvbsllbbf1njsk314vhy"))))
(define %codex-rusty-v8-archive
  (origin
    (method url-fetch)
    (uri
     "https://github.com/denoland/rusty_v8/releases/download/v146.4.0/librusty_v8_release_x86_64-unknown-linux-gnu.a.gz")
    (file-name "librusty_v8_release_x86_64-unknown-linux-gnu.a.gz")
    (sha256
     (base32 "0lqi57snhsgsq68vagy1h81s32qph2dshi32hhp3ladfwjclsjz6"))))

(define %codex-install-paths
  '("cli" "exec" "exec-server" "linux-sandbox"
    "mcp-server" "network-proxy" "app-server" "tui"))

(define %codex-cargo-package-crates
  '("codex-analytics"
    "codex-app-server-protocol"
    "codex-experimental-api-macros"
    "codex-git-utils"
    "codex-utils-absolute-path"
    "codex-protocol"
    "codex-execpolicy"
    "codex-utils-image"
    "codex-utils-cache"
    "codex-utils-string"
    "codex-utils-template"
    "codex-utils-cargo-bin"
    "codex-login"
    "codex-client"
    "codex-utils-rustls-provider"
    "codex-config"
    "codex-keyring-store"
    "codex-terminal-detection"
    "core_test_support"
    "codex-arg0"
    "codex-apply-patch"
    "codex-linux-sandbox"
    "codex-core"
    "codex-api"
    "codex-async-utils"
    "codex-code-mode"
    "codex-connectors"
    "codex-core-skills"
    "codex-instructions"
    "codex-otel"
    "codex-skills"
    "codex-utils-plugins"
    "codex-exec-server"
    "codex-utils-pty"
    "codex-features"
    "codex-hooks"
    "codex-network-proxy"
    "codex-utils-home-dir"
    "codex-plugin"
    "codex-rmcp-client"
    "codex-rollout"
    "codex-file-search"
    "codex-state"
    "codex-utils-path"
    "codex-sandboxing"
    "codex-secrets"
    "codex-shell-command"
    "codex-tools"
    "codex-utils-output-truncation"
    "codex-utils-readiness"
    "codex-utils-stream-parser"
    "codex-windows-sandbox"
    "codex-shell-escalation"
    "codex-backend-client"
    "codex-backend-openapi-models"
    "codex-ansi-escape"
    "codex-app-server"
    "codex-chatgpt"
    "codex-utils-cli"
    "codex-cloud-requirements"
    "codex-feedback"
    "codex-utils-json-to-toml"
    "app_test_support"
    "codex-app-server-client"
    "codex-app-server-test-client"
    "codex-debug-client"
    "codex-cloud-tasks"
    "codex-cloud-tasks-client"
    "codex-tui"
    "codex-utils-approval-presets"
    "codex-utils-elapsed"
    "codex-utils-fuzzy-match"
    "codex-utils-oss"
    "codex-lmstudio"
    "codex-ollama"
    "codex-utils-sandbox-summary"
    "codex-utils-sleep-inhibitor"
    "codex-cli"
    "codex-exec"
    "codex-mcp-server"
    "mcp_test_support"
    "codex-responses-api-proxy"
    "codex-process-hardening"
    "codex-stdio-to-uds"
    "codex-execpolicy-legacy"
    "codex-v8-poc"))

(define %codex-cargo-test-flags
  '("--workspace"
    "--exclude" "codex-app-server-protocol"
    "--"
    "--skip" "sandbox_denied_shell_returns_original_output"
    "--skip" "shell_escalated_permissions_rejected_then_ok"
    "--skip" "unified_exec_runs_under_sandbox"
    "--skip" "python_getpwuid_works_under_sandbox"
    "--skip" "python_multiprocessing_lock_works_under_sandbox"
    "--skip" "sandbox_distinguishes_command_and_policy_cwds"
    "--skip" "test_writable_root"
    "--skip" "test_timeout"
    "--skip" "test_root_read"
    "--skip" "test_dev_null_write"
    "--skip" "test_no_new_privs_is_enabled"
    "--skip" "approval_matrix_covers_all_modes"
    "--skip" "approving_apply_patch_for_session_skips_future_prompts_for_same_file"
    "--skip" "interrupt_persists_turn_aborted_marker_in_next_request"
    "--skip" "interrupt_tool_records_history_entries"
    "--skip" "get_user_agent_returns_current_codex_user_agent"
    "--skip" "test_codex_tool_passes_base_instructions"
    "--skip" "test_shell_command_approval_triggers_elicitation"
    "--skip" "test_patch_approval_triggers_elicitation"
    "--skip" "list_tools"
    "--skip" "accept_elicitation_for_prompt_rule"
    "--skip" "init_removes_legacy_state_db_files"
    "--skip" "upsert_and_get_thread_memory"
    "--skip" "get_last_n_thread_memories_for_cwd_matches_exactly"
    "--skip" "upsert_thread_memory_errors_for_unknown_thread"
    "--skip" "get_last_n_thread_memories_for_cwd_zero_returns_empty"
    "--skip" "get_last_n_thread_memories_for_cwd_does_not_prefix_match"
    "--skip" "deleting_thread_cascades_thread_memory"))

(define %codex-install-paths-sexp `(quote ,%codex-install-paths))
(define %codex-cargo-package-crates-sexp `(quote ,%codex-cargo-package-crates))
(define %codex-cargo-test-flags-sexp `(quote ,%codex-cargo-test-flags))

(define (codex-support-file name)
  (local-file (string-append %codex-support-dir "/" name)))

(define (codex-cargo-inputs lockfile)
  (call-with-values
      (lambda ()
        (cargo-lock->expressions lockfile "cargo-inputs-temporary"))
    (lambda (source-expressions cargo-inputs-entry)
      (eval-string
       (call-with-output-string
         (lambda (port)
           (for-each
           (lambda (form)
              (pretty-print-with-comments port form))
            `((use-modules (guix build-system cargo)
                           (guix packages)
                           (guix download)
                           (guix git-download))
              ,@source-expressions
              (define-cargo-inputs lookup-cargo-inputs ,cargo-inputs-entry)
              (lookup-cargo-inputs 'cargo-inputs-temporary)))))))))

(define codex-latest
  (package
    (name "codex")
    (version %codex-version)
    (source
     (origin
       (method git-fetch)
       (uri (git-reference
             (url "https://github.com/openai/codex")
             (commit (string-append "rust-v" version))))
       (file-name (git-file-name name version))
       (sha256
        (base32 "1mlks8w51c42fl31w3ndk78891n3f5qas5q7gbkqjk1a4bw5bnqm"))
       (patches
        (list (codex-support-file "codex-0.118.0-remove-patch-sections.patch")
              (codex-support-file "rust-codex-0.118.0-test-shebangs.patch")
              (codex-support-file "rust-codex-0.118.0-test-timeout.patch")))))
    (build-system cargo-build-system)
    (arguments
     (list
      #:install-source? #f
      #:cargo-install-paths %codex-install-paths-sexp
      #:cargo-test-flags %codex-cargo-test-flags-sexp
      #:cargo-package-crates %codex-cargo-package-crates-sexp
      #:phases
      #~(modify-phases %standard-phases
          (add-after 'unpack 'chdir-to-workspace
            (lambda _
              (chdir "codex-rs")))
          (add-after 'chdir-to-workspace 'update-version-in-snapshots
            (lambda _
              (let ((snap-files (find-files "." "\\.snap$"))
                    (version #$%codex-version))
                (substitute* snap-files
                  (("\\(v0\\.0\\.0\\) ")
                   (string-append "(v" version ") "))))))
          (add-after 'chdir-to-workspace 'patch-git-deps-to-vendor
            (lambda _
              (substitute* "Cargo.toml"
                (("nucleo = \\{ git = [^}]+\\}")
                 "nucleo = \"0.5.0\"")
                (("runfiles = \\{ git = [^}]+\\}")
                 "runfiles = { version = \"0.1.0\", path = \"guix-runfiles\" }"))))
          (add-after 'patch-git-deps-to-vendor 'vendor-runfiles-subdir
            (lambda _
              (copy-recursively
               (string-append #$%codex-runfiles-source "/rust/runfiles")
               "guix-runfiles")
              (substitute* "Cargo.lock"
                (("name = \"runfiles\"\nversion = \"0\\.1\\.0\"\nsource = \"git\\+[^\n]+\"\n")
                 "name = \"runfiles\"\nversion = \"0.1.0\"\n"))))
          (add-after 'unpack-rust-crates 'patch-vendored-fork-deps
            (lambda _
              (let ((cargo-tomls (find-files "guix-vendor" "^Cargo\\.toml$")))
                (let ((tokio-tungstenite-cargo
                       (let loop ((paths cargo-tomls))
                         (if (null? paths)
                             #f
                             (let ((path (car paths)))
                               (if (and (string-contains path "rust-tokio-tungstenite-")
                                        (not (string-contains path "/fuzz/")))
                                   path
                                   (loop (cdr paths))))))))
                  (let ((tungstenite-cargo
                         (let loop ((paths cargo-tomls))
                           (if (null? paths)
                               #f
                               (let ((path (car paths)))
                                 (if (and (string-contains path "rust-tungstenite-")
                                          (not (string-contains path "/fuzz/")))
                                     path
                                     (loop (cdr paths))))))))
                    (let ((nucleo-cargo
                           (let loop ((paths cargo-tomls))
                             (if (null? paths)
                                 #f
                                 (let ((path (car paths)))
                                   (if (and (string-contains path "rust-nucleo-0.5.0")
                                            (not (string-contains path "/matcher/"))
                                            (not (string-contains path "/bench/")))
                                       path
                                       (loop (cdr paths)))))))
                          (nucleo-matcher-dir
                           "guix-vendor/rust-nucleo-matcher-0.3.1.4253de9-checkout"))
                      (unless tokio-tungstenite-cargo
                        (error "failed to locate vendored tokio-tungstenite Cargo.toml"))
                      (unless tungstenite-cargo
                        (error "failed to locate vendored tungstenite Cargo.toml"))
                      (unless nucleo-cargo
                        (error "failed to locate vendored nucleo Cargo.toml"))
                      (substitute* tokio-tungstenite-cargo
                        (("git = \"https://github.com/openai-oss-forks/tungstenite-rs\"")
                         (string-append "path = \"../"
                                        (basename (dirname tungstenite-cargo))
                                        "\""))
                        (("rev = \"[^\"]+\"")
                         ""))
                      (substitute* nucleo-cargo
                        (("nucleo-matcher = \\{ version = \"0\\.3\\.1\", path = \"matcher\" \\}")
                         "nucleo-matcher = \"0.3.1\""))
                      (delete-file-recursively nucleo-matcher-dir)
                      (copy-recursively
                       (string-append #$%codex-nucleo-source "/matcher")
                       nucleo-matcher-dir)))))))
          (add-after 'chdir-to-workspace 'add-version-to-workspace-deps
            (lambda _
              (let ((cargo-files (find-files "." "^Cargo\\.toml$"))
                    (version #$%codex-version))
                (substitute* cargo-files
                  (("([[:alnum:]_-]+) = \\{ path = " all name)
                   (string-append name " = { version = \"" version "\", path = "))
                  (("([[:alnum:]_-]+) = \\{ package = " all name)
                   (string-append name " = { version = \"" version "\", package = "))
                  (("^(path = \"\\.\\./.*\")" all path-line)
                   (string-append path-line "\nversion = \"" version "\""))))))
          (add-after 'chdir-to-workspace 'patch-hardcoded-paths
            (lambda* (#:key inputs #:allow-other-keys)
              (let ((bash-bin (string-append
                               (assoc-ref inputs "bash-minimal") "/bin"))
                    (coreutils-bin (string-append
                                    (assoc-ref inputs "coreutils") "/bin"))
                    (git-bin (string-append
                              (assoc-ref inputs "git-minimal") "/bin"))
                    (sed-bin (string-append
                              (assoc-ref inputs "sed") "/bin"))
                    (rs-files (find-files "." "\\.(rs|policy)$")))
                (substitute* rs-files
                  (("\"/bin/bash\"")
                   (string-append "\"" bash-bin "/bash\""))
                  (("\"/bin/sh\"")
                   (string-append "\"" bash-bin "/sh\""))
                  (("\"/usr/bin/bash\"")
                   (string-append "\"" bash-bin "/bash\""))
                  (("\"/usr/bin/sh\"")
                   (string-append "\"" bash-bin "/sh\""))
                  (("\"/bin/bash ")
                   (string-append "\"" bash-bin "/bash "))
                  (("\"/bin/sh ")
                   (string-append "\"" bash-bin "/sh "))
                  (("\"/bin/(cat|cp|date|echo|env|head|ls|printenv|rm|sleep|true|touch)\"" all cmd)
                   (string-append "\"" coreutils-bin "/" cmd "\""))
                  (("\"/usr/bin/(cat|cp|env|head|ls|printenv|touch|true)\"" all cmd)
                   (string-append "\"" coreutils-bin "/" cmd "\""))
                  (("\"/bin/(cat|cp|date|echo|env|head|ls|printenv|rm|sleep|true|touch) " all cmd)
                   (string-append "\"" coreutils-bin "/" cmd " "))
                  (("\"/usr/bin/git\"")
                   (string-append "\"" git-bin "/git\""))
                  (("\"/usr/bin/sed\"")
                   (string-append "\"" sed-bin "/sed\"")))
                (substitute*
                  (list "rmcp-client/src/program_resolver.rs"
                        "tui/src/external_editor.rs")
                  (("@SHELL@")
                   (string-append bash-bin "/sh")))
                (substitute*
                  "core/tests/suite/user_notification.rs"
                  (("#!/bin/bash")
                   (string-append "#!" bash-bin "/bash"))))))
          (add-before 'build 'set-rusty-v8-archive
            (lambda _
              (setenv "RUSTY_V8_ARCHIVE"
                      #$%codex-rusty-v8-archive)))
          (add-before 'check 'set-home
            (lambda _
              (setenv "HOME" "/tmp")
              (setenv "USER" "nixbld"))))))
    (native-inputs
     (list clang
           cmake-minimal
           libunwind
           perl
           python-minimal
           pkg-config))
    (inputs
     (append
      (list bash-minimal
            coreutils
            git-minimal
            libcap
            oniguruma
            sed
            openssl
            sqlite
            `(,zstd "lib"))
      (codex-cargo-inputs %codex-lockfile)))
    (home-page "https://github.com/openai/codex")
    (synopsis "AI-assisted coding CLI and TUI")
    (description
     "Codex is an AI-powered coding assistant that runs in the terminal.
It provides an interactive TUI for conversations with AI models, with
support for shell command execution, file editing, and code generation.
Configure providers via @file{~/.codex/config.toml}.")
    (license license:asl2.0)))
