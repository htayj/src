#!/usr/bin/env bash
set -euo pipefail

repo_root=$(cd "$(dirname "$0")/../../.." && pwd)
skill_dir="$repo_root/skills/common-lisp"
skill_file="$skill_dir/SKILL.md"
external_docs="$HOME/external_docs/common-lisp-cookbook"
mirror_root="$external_docs/cl-cookbook.sourceforge.net"

fail() {
  echo "FAIL: $*" >&2
  exit 1
}

[ -f "$skill_file" ] || fail "missing SKILL.md"
[ -f "$skill_dir/references/building-with-common-lisp.md" ] || fail "missing building reference"
[ -f "$skill_dir/references/cookbook-corpus-map.md" ] || fail "missing corpus map"
[ -f "$skill_dir/references/cookbook-example-map.md" ] || fail "missing example map"
[ -f "$skill_dir/references/chapter-quick-index.md" ] || fail "missing chapter quick index"
[ -f "$skill_dir/references/modern-tooling-translation.md" ] || fail "missing modern tooling translation"
[ -f "$skill_dir/references/eval-plan.md" ] || fail "missing eval plan"
[ -f "$skill_dir/examples/typed-package-and-hash-table.lisp" ] || fail "missing hash example"
[ -f "$skill_dir/examples/typed-clos-skeleton.lisp" ] || fail "missing CLOS example"
[ -f "$skill_dir/examples/typed-io-loop-skeleton.lisp" ] || fail "missing IO example"
[ -x "$skill_dir/scripts/validate-skill.sh" ] || fail "validator is not executable"

[ -f "$external_docs/SUMMARY.md" ] || fail "missing cookbook summary"
[ -f "$external_docs/TOC.txt" ] || fail "missing extracted TOC"
[ -f "$mirror_root/index.html" ] || fail "missing cookbook index"
[ -f "$mirror_root/strings.html" ] || fail "missing strings chapter"
[ -f "$mirror_root/macros.html" ] || fail "missing macros chapter"
[ -f "$mirror_root/process.html" ] || fail "missing threads chapter"
[ -f "$mirror_root/testing.html" ] || fail "missing testing chapter"
[ -f "$mirror_root/clos-tutorial/index.html" ] || fail "missing CLOS tutorial"
[ -f "$mirror_root/clos-tutorial/examples.lisp" ] || fail "missing CLOS example file"
[ -f "$mirror_root/.emacs" ] || fail "missing sample .emacs"
[ -f "$mirror_root/s1.lisp" ] || fail "missing emacs example file"

rg -q "Common Lisp Cookbook" "$skill_file" || fail "skill does not clearly target the cookbook"
rg -q "strings|dates and times|hash tables|macros|CLOS|sockets|threads|testing|Win32" "$skill_file" "$skill_dir/references" || fail "skill does not cover the cookbook surface"
rg -q "historical|implementation-specific|thin cookbook coverage" "$skill_file" "$skill_dir/references" || fail "skill does not handle cookbook caveats"
rg -q "SLIME|SLY|ASDF|modern" "$skill_dir/references/modern-tooling-translation.md" || fail "modern tooling translation sidecar is too weak"

echo "PASS: common-lisp skill structure, cookbook mirror, quick-index coverage, modern-tooling translation, example coverage, and caveat handling checks succeeded"
