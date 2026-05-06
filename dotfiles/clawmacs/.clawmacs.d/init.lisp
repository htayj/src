(in-package :clawmacs)

(setf *default-provider* :openai-codex
      *default-model* "gpt-5.4"
      *openai-codex-model* "gpt-5.4")

(register-agent-definition *default-agent-name*
													 :provider :openai-codex
													 :model "gpt-5.4"
													 :think-level "xhigh")

;; (asdf:load-system :clawmacs/mcclim)
;; (setf *ui-backend* (make-instance 'mcclim-backend))

(keymap-bind *default-keymap* '(:ctrl-c #\O) 'openai-codex-oauth-command)



(REGISTER-AGENT-DEFINITION "docs-only" :CORE-PROMPT
                           "You are a docs-only assistant for clawmacs. Only perform documentation lookup and internal introspection with the tools provided to you for each run. Do not perform mutation or unrelated tasks."
                           :PERSONALITY-PROMPT
                           "Concise, factual, and source-grounded." :TOOL-NAMES
                           'NIL)

(DEFUN RUN-DOCS-ONLY-AGENT
    (PROMPT &KEY (PROVIDER *DEFAULT-PROVIDER*) MODEL (THINK-LEVEL "low"))
  (UNLESS (FIND-PROJECT "clawmacs")
    (COND
			((PROBE-FILE #P"clawmacs.asd")
       (DEFINE-PROJECT "clawmacs" :ROOT (TRUENAME #P"./")))
			((PROBE-FILE #P"/workspace/clawmacs.asd")
       (DEFINE-PROJECT "clawmacs" :ROOT #P"/workspace/"))
			((PROBE-FILE #P"/home/tay/projects/clawmacs/clawmacs.asd")
       (DEFINE-PROJECT "clawmacs" :ROOT #P"/home/tay/projects/clawmacs/"))))
  (LET* ((DEFAULT-PROJECT
          (IF (FIND-PROJECT "clawmacs")
              "clawmacs"
              "config"))
         (TOOL-INTERNAL-SEARCH
          (MAKE-SUBAGENT-TOOL :NAME "search_internal_docs" :DESCRIPTION
                              "Search internal project docs/source by query."
                              :INPUT-SCHEMA
                              '((:TYPE . "object")
                                (:PROPERTIES
                                 (:QUERY (:TYPE . "string")
                                  (:DESCRIPTION . "Search query."))
                                 (:PROJECT (:TYPE . "string")
                                  (:DESCRIPTION
                                   . "Project name (default clawmacs).")))
                                (:REQUIRED . #("query")))
                              :EXECUTE-FN
                              (LAMBDA (ARGS)
                                (LET* ((PROJECT
                                        (OR (CDR (ASSOC :PROJECT ARGS))
                                            DEFAULT-PROJECT))
                                       (QUERY (CDR (ASSOC :QUERY ARGS))))
                                  (UNLESS QUERY
                                    (ERROR
                                     "search_internal_docs requires :query"))
                                  (PROJECT-SEARCH-TO-STRING PROJECT QUERY)))))
         (TOOL-INTERNAL-READ
          (MAKE-SUBAGENT-TOOL :NAME "read_internal_doc_file" :DESCRIPTION
                              "Read an internal project file by relative path."
                              :INPUT-SCHEMA
                              '((:TYPE . "object")
                                (:PROPERTIES
                                 (:PATH (:TYPE . "string")
                                  (:DESCRIPTION
                                   . "Project-relative file path."))
                                 (:PROJECT (:TYPE . "string")
                                  (:DESCRIPTION
                                   . "Project name (default clawmacs).")))
                                (:REQUIRED . #("path")))
                              :EXECUTE-FN
                              (LAMBDA (ARGS)
                                (LET* ((PROJECT
                                        (OR (CDR (ASSOC :PROJECT ARGS))
                                            DEFAULT-PROJECT))
                                       (PATH (CDR (ASSOC :PATH ARGS))))
                                  (UNLESS PATH
                                    (ERROR
                                     "read_internal_doc_file requires :path"))
                                  (PROJECT-READ-FILE PROJECT PATH)))))
         (TOOL-PROJECT-OUTLINE
          (MAKE-SUBAGENT-TOOL :NAME "internal_project_outline" :DESCRIPTION
                              "Return a project definition outline for introspection."
                              :INPUT-SCHEMA
                              '((:TYPE . "object")
                                (:PROPERTIES
                                 (:PROJECT (:TYPE . "string")
                                  (:DESCRIPTION
                                   . "Project name (default clawmacs)."))))
                              :EXECUTE-FN
                              (LAMBDA (ARGS)
                                (LET ((PROJECT
                                       (OR (CDR (ASSOC :PROJECT ARGS))
                                           DEFAULT-PROJECT)))
                                  (PROJECT-OUTLINE-TO-STRING PROJECT :MAX-DEPTH
                                                             3)))))
         (TOOL-LIST-FUNCTIONS
          (MAKE-SUBAGENT-TOOL :NAME "list_functions" :DESCRIPTION
                              "List exported clawmacs functions, optionally filtered by substring."
                              :INPUT-SCHEMA
                              '((:TYPE . "object")
                                (:PROPERTIES
                                 (:CONTAINS (:TYPE . "string")
                                  (:DESCRIPTION
                                   . "Optional case-insensitive substring filter."))))
                              :EXECUTE-FN
                              (LAMBDA (ARGS)
                                (LET* ((CONTAINS
                                        (OR (CDR (ASSOC :CONTAINS ARGS)) ""))
                                       (NEEDLE (STRING-DOWNCASE CONTAINS))
                                       (SYMBOLS (LIST-FUNCTIONS))
                                       (FILTERED
                                        (IF (STRING= NEEDLE "")
                                            SYMBOLS
                                            (REMOVE-IF-NOT
                                             (LAMBDA (SYM)
                                               (SEARCH NEEDLE
                                                       (STRING-DOWNCASE
                                                        (SYMBOL-NAME SYM))))
                                             SYMBOLS))))
                                  (FORMAT NIL "~{~A~^~%~}" FILTERED)))))
         (TOOL-DESCRIBE-FUNCTION
          (MAKE-SUBAGENT-TOOL :NAME "describe_function" :DESCRIPTION
                              "Describe a clawmacs function by symbol name."
                              :INPUT-SCHEMA
                              '((:TYPE . "object")
                                (:PROPERTIES
                                 (:SYMBOL (:TYPE . "string")
                                  (:DESCRIPTION . "Function symbol name.")))
                                (:REQUIRED . #("symbol")))
                              :EXECUTE-FN
                              (LAMBDA (ARGS)
                                (LET ((NAME (CDR (ASSOC :SYMBOL ARGS))))
                                  (UNLESS NAME
                                    (ERROR
                                     "describe_function requires :symbol"))
                                  (MULTIPLE-VALUE-BIND (SYM STATUS)
                                      (FIND-SYMBOL (STRING-UPCASE NAME)
                                                   :CLAWMACS)
                                    (IF (AND SYM STATUS (FBOUNDP SYM))
                                        (DESCRIBE-FUNCTION-TO-STRING SYM)
                                        (FORMAT NIL
                                                "No function named ~A found in package CLAWMACS."
                                                NAME)))))))
         (TOOL-SYSTEM-SEARCH
          (MAKE-SUBAGENT-TOOL :NAME "search_system_docs" :DESCRIPTION
                              "Search local docs/source snippets for an imported system."
                              :INPUT-SCHEMA
                              '((:TYPE . "object")
                                (:PROPERTIES
                                 (:SYSTEM (:TYPE . "string")
                                  (:DESCRIPTION . "ASDF system name."))
                                 (:QUERY (:TYPE . "string")
                                  (:DESCRIPTION . "Search query.")))
                                (:REQUIRED . #("system" "query")))
                              :EXECUTE-FN
                              (LAMBDA (ARGS)
                                (LET ((SYSTEM (CDR (ASSOC :SYSTEM ARGS)))
                                      (QUERY (CDR (ASSOC :QUERY ARGS))))
                                  (UNLESS SYSTEM
                                    (ERROR
                                     "search_system_docs requires :system"))
                                  (UNLESS QUERY
                                    (ERROR
                                     "search_system_docs requires :query"))
                                  (SEARCH-SYSTEM-DOCS SYSTEM QUERY))))))
    (RUN-SUBAGENT PROMPT :AGENT-NAME "docs-only" :PROVIDER PROVIDER :MODEL
                  MODEL :THINK-LEVEL THINK-LEVEL :CUSTOM-TOOLS
                  (LIST TOOL-INTERNAL-SEARCH TOOL-INTERNAL-READ
                        TOOL-PROJECT-OUTLINE TOOL-LIST-FUNCTIONS
                        TOOL-DESCRIBE-FUNCTION TOOL-SYSTEM-SEARCH)
                  :MAX-TOOL-ITERATIONS 8 :AUTO-APPROVE-TOOLS-P T)))

(dolist (definition (list-installed-packages))
  (set-package-enablement-scope (package-definition-name definition) :global))
