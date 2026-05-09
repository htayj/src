# McCLIM Application Source References

Local third-party/source references for real McCLIM/CLIM applications live under `~/reference/external_src/`. Use these when you need implementation patterns that are not obvious from the manual: application frame structure, panes/layouts, commands, presentations/translators, interactor usage, file dialogs, inspectors/listeners, browser-like navigation, editors, and domain-specific CLIM UIs.

When using these references:

1. Prefer the McCLIM manual/spec for semantics.
2. Search these application sources for concrete patterns.
3. Cite the local path and upstream project when a pattern influenced advice or code.
4. Treat old projects as examples to learn from, not APIs to copy blindly; cross-check against current McCLIM when in doubt.

## Primary McCLIM repository and bundled apps

- **McCLIM** — `~/reference/external_src/codeberg.org/McCLIM/McCLIM` — upstream McCLIM implementation and bundled applications/examples.
  - **Listener** — `Apps/Listener` — graphical Lisp listener/REPL with CLIM presentations and development commands.
  - **Clouseau** — `Apps/Clouseau` — CLIM graphical inspector for Common Lisp objects; standalone and embeddable.
  - **Scigraph** — `Apps/Scigraph` — plotting/graphing system.
  - **Debugger** — `Apps/Debugger` — CLIM debugger app.
  - **Functional Geometry** — `Apps/Functional-Geometry` — graphical/demo application.
  - **Examples** — `Examples/` — smaller examples, demos, and idiom samples.

## Standalone application references

- **McCLIM Desktop** — `~/reference/external_src/github.com/gas2serra/mcclim-desktop` — desktop/app-launcher environment integrating multiple CLIM apps.
- **Gsharp** — `~/reference/external_src/github.com/robert-strandh/Gsharp` — interactive traditional music score editor.
- **Climacs** — `~/reference/external_src/github.com/robert-strandh/Climacs` — Emacs-like Common Lisp text editor.
- **Spectacle** — `~/reference/external_src/github.com/slyrus/spectacle` — Opticl image viewer/editor using McCLIM.
- **CLIM-Gopher** — `~/reference/external_src/github.com/knusbaum/clim-gopher` — Gopher browser with history/bookmarks/navigation.
- **McGopher** — `~/reference/external_src/github.com/Payphone/McGopher` — alternate McCLIM Gopher client with configurable UI.
- **TransClime** — `~/reference/external_src/github.com/robert-strandh/TransClime` — language-learning/reading assistant with dictionary presentations.
- **Ernestine** — `~/reference/external_src/github.com/nlamirault/ernestine` — music manager/player with McCLIM frontend.
- **Climc** — `~/reference/external_src/github.com/nlamirault/climc` — instant messaging client.
- **cl-monero-explorer** — `~/reference/external_src/codeberg.org/glv/cl-monero-explorer` — Monero block/transaction explorer with a McCLIM frontend.
- **tv-series-status** — `~/reference/external_src/github.com/OlafMerkert/tv-series-status` — TV episode status UI with CLIM/GTK/web frontends.
- **Bastion** — `~/reference/external_src/github.com/parenworks/bastion` — modern McCLIM SSH host browser/launcher.
- **clim-find** — `~/reference/external_src/codeberg.org/contrapunctus/clim-find` — interactive CLIM replacement/prototype for Unix `find(1)` workflows.
- **clim-edit** — `~/reference/external_src/codeberg.org/loke/clim-edit` — simple CLIM text editor by a McCLIM contributor.
- **Arrokoth** — `~/reference/external_src/gitlab.com/mdhughes/arrokoth` — graphical adventure-game creation system in SBCL + McCLIM.
- **KIRC** — `~/reference/external_src/gitlab.com/knusbaum/KIRC` — graphical IRC client based on McCLIM and `cl-irc`.
- **clim-chess** — `~/reference/external_src/gitlab.com/rotateq/clim-chess` — chess application using McCLIM and CLOS modeling.

## Reusable components/widgets

- **select-file** — `~/reference/external_src/github.com/tapioco71/select-file` — reusable McCLIM file selector dialog.
- **clim-widgets** — `~/reference/external_src/github.com/jschatzer/clim-widgets` — small collection of CLIM widgets/examples: calendar, clock, treeview, package docs, class browser patterns.

## Useful search commands

From any shell:

```bash
rg "define-application-frame" ~/reference/external_src/codeberg.org/McCLIM/McCLIM ~/reference/external_src/github.com ~/reference/external_src/codeberg.org ~/reference/external_src/gitlab.com
rg "define-presentation" ~/reference/external_src/codeberg.org/McCLIM/McCLIM ~/reference/external_src/github.com ~/reference/external_src/codeberg.org ~/reference/external_src/gitlab.com
rg "define-.*-command|define-command" ~/reference/external_src/codeberg.org/McCLIM/McCLIM ~/reference/external_src/github.com ~/reference/external_src/codeberg.org ~/reference/external_src/gitlab.com
rg "updating-output|redisplay" ~/reference/external_src/codeberg.org/McCLIM/McCLIM ~/reference/external_src/github.com ~/reference/external_src/codeberg.org ~/reference/external_src/gitlab.com
rg "make-pane|:panes|:layouts" ~/reference/external_src/codeberg.org/McCLIM/McCLIM ~/reference/external_src/github.com ~/reference/external_src/codeberg.org ~/reference/external_src/gitlab.com
```

For a focused query, search the relevant app first, then broaden to all references.
