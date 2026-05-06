#!/usr/bin/env bash
# validate-skill.sh — Verify the guix skill has all expected files

set -euo pipefail

SKILL_DIR="$(cd "$(dirname "$0")/.." && pwd)"
EXIT=0

check_file() {
  if [[ ! -f "$SKILL_DIR/$1" ]]; then
    echo "MISSING: $1"
    EXIT=1
  else
    echo "OK: $1"
  fi
}

echo "=== Guix Skill Validation ==="
echo "Skill dir: $SKILL_DIR"
echo

check_file "SKILL.md"
check_file "references/package-anatomy.md"
check_file "references/build-systems.md"
check_file "references/gexp-guide.md"
check_file "references/channel-setup.md"
check_file "references/packaging-workflow.md"
check_file "references/phase-cookbook.md"
check_file "examples/gnu-hello.scm"
check_file "examples/python-package.scm"
check_file "examples/binary-package.scm"
check_file "examples/channel-module.scm"
check_file "scripts/validate-skill.sh"

echo
if [[ $EXIT -eq 0 ]]; then
  echo "All files present."
else
  echo "Some files missing!"
fi

exit $EXIT
