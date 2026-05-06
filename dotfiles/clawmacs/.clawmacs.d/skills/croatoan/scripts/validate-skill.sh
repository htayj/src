#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "$0")/../../.." && pwd)
skill_dir="$repo_root/skills/croatoan"
skill_file="$skill_dir/SKILL.md"
external_src="$HOME/external_src/croatoan"
external_docs="$HOME/external_docs/croatoan"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

[ -f "$skill_file" ] || fail "missing SKILL.md"
[ -f "$skill_dir/references/building-with-croatoan.md" ] || fail "missing building-with-croatoan reference"
[ -f "$skill_dir/references/full-feature-map.md" ] || fail "missing full-feature-map reference"
[ -f "$skill_dir/references/api-quick-index.md" ] || fail "missing api-quick-index reference"
[ -f "$skill_dir/references/source-module-map.md" ] || fail "missing source-module-map reference"
[ -f "$skill_dir/references/eval-plan.md" ] || fail "missing eval-plan reference"
[ -f "$skill_dir/examples/minimal-screen.lisp" ] || fail "missing minimal-screen example"
[ -f "$skill_dir/examples/form-menu-app.lisp" ] || fail "missing form-menu-app example"
[ -f "$skill_dir/examples/slime-safe-loop.lisp" ] || fail "missing slime-safe-loop example"
[ -x "$skill_dir/scripts/validate-skill.sh" ] || fail "validator is not executable"

[ -f "$external_src/README.org" ] || fail "missing local Croatoan source checkout"
[ -f "$external_src/src/package.lisp" ] || fail "missing Croatoan package source"
[ -f "$external_src/doc/slime.md" ] || fail "missing Croatoan slime doc"
[ -f "$external_src/LICENSE" ] || fail "missing Croatoan license file"
[ -f "$external_docs/README.org" ] || fail "missing Croatoan docs snapshot README"
[ -f "$external_docs/slime.md" ] || fail "missing Croatoan docs snapshot slime.md"
[ -f "$external_docs/CHANGELOG.org" ] || fail "missing Croatoan docs snapshot changelog"

rg -q "build working terminal UIs with \*\*Croatoan\*\*|build working terminal UIs with Croatoan" "$skill_file" || fail "skill is not clearly build-oriented"
rg -q "api-quick-index|source-module-map|with-screen|run-event-loop|form|menu|dialog|submit|classes.lisp|grid.lisp" "$skill_file" "$skill_dir/references" || fail "skill does not reference core Croatoan architecture and heavier routing layers"
rg -q "MIT|Permission is hereby granted" "$external_src/LICENSE" || fail "Croatoan license check failed"

echo "PASS: croatoan skill structure, local references, and basic content checks succeeded"
