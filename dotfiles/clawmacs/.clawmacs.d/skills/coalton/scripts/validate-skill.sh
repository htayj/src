#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "$0")/../../.." && pwd)
skill_dir="$repo_root/skills/coalton"
skill_file="$skill_dir/SKILL.md"
external_src="$HOME/external_src/coalton"
external_docs="$HOME/external_docs/coalton"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

[ -f "$skill_file" ] || fail "missing SKILL.md"
[ -f "$skill_dir/references/building-with-coalton.md" ] || fail "missing building-with-coalton reference"
[ -f "$skill_dir/references/full-feature-map.md" ] || fail "missing full-feature-map reference"
[ -f "$skill_dir/references/docs-corpus-map.md" ] || fail "missing docs-corpus-map reference"
[ -f "$skill_dir/references/example-project-map.md" ] || fail "missing example-project-map reference"
[ -f "$skill_dir/references/operator-quick-index.md" ] || fail "missing operator-quick-index reference"
[ -f "$skill_dir/references/project-workflow-translation.md" ] || fail "missing project-workflow-translation reference"
[ -f "$skill_dir/references/eval-plan.md" ] || fail "missing eval-plan reference"
[ -f "$skill_dir/examples/minimal-project.asd" ] || fail "missing minimal-project example"
[ -f "$skill_dir/examples/minimal-module.lisp" ] || fail "missing minimal-module example"
[ -f "$skill_dir/examples/native-interop.lisp" ] || fail "missing native-interop example"
[ -x "$skill_dir/scripts/validate-skill.sh" ] || fail "validator is not executable"

[ -f "$external_src/README.md" ] || fail "missing local Coalton source checkout"
[ -f "$external_src/src/package.lisp" ] || fail "missing Coalton package source"
[ -f "$external_src/docs/manual/site/topics/whirlwind-tour.md" ] || fail "missing local whirlwind tour"
[ -f "$external_src/docs/manual/site/_index.md" ] || fail "missing local manual index"
[ -f "$external_src/LICENSE.txt" ] || fail "missing Coalton license file"

[ -f "$external_docs/manual/whirlwind-tour.md" ] || fail "missing docs snapshot whirlwind tour"
[ -f "$external_docs/manual/_index.md" ] || fail "missing docs snapshot manual index"
[ -f "$external_docs/manual/lisp-interop.md" ] || fail "missing docs snapshot interop doc"
[ -f "$external_docs/intro-to-coalton-testing.md" ] || fail "missing docs snapshot testing doc"
[ -f "$external_docs/docs/README.md" ] || fail "missing full docs snapshot index"
[ -f "$external_docs/docs/glossary.md" ] || fail "missing docs snapshot glossary"
[ -f "$external_docs/docs/style-guide.md" ] || fail "missing docs snapshot style guide"
[ -f "$external_docs/docs/using-coalton-doc.md" ] || fail "missing docs snapshot coalton/doc guide"
[ -f "$external_docs/docs/iterator-protocol.md" ] || fail "missing docs snapshot iterator protocol"
[ -f "$external_docs/docs/internals/internals.md" ] || fail "missing docs snapshot internals doc"
[ -f "$external_docs/examples/README.md" ] || fail "missing examples snapshot README"
[ -f "$external_docs/examples/quil-coalton/README.md" ] || fail "missing examples snapshot quil-coalton README"
[ -f "$external_docs/examples/fractal/README.md" ] || fail "missing examples snapshot fractal README"
[ -f "$external_docs/examples/thih/README.md" ] || fail "missing examples snapshot thih README"

rg -q "build working \*\*Coalton\*\* code and projects|build working Coalton code and projects" "$skill_file" || fail "skill is not clearly build-oriented"
rg -q "docs-corpus-map|example-project-map|What's Here\?|small-coalton-programs|quil-coalton|thih|fractal" "$skill_file" "$skill_dir/references" || fail "skill does not clearly cover the wider docs corpus and canonical examples"
rg -q "operator-quick-index|project-workflow-translation|coalton-toplevel|define-type|define-class|repr|coalton/testing|development vs release" "$skill_file" "$skill_dir/references" || fail "skill does not reference core Coalton architecture and heavier routing layers"
rg -q "Permission is hereby granted|MIT" "$external_src/LICENSE.txt" || fail "Coalton license check failed"

echo "PASS: coalton skill structure, local references, docs corpus coverage, canonical example coverage, and basic content checks succeeded"
