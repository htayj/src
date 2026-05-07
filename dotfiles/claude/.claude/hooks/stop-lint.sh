#!/usr/bin/env bash
set -euo pipefail

# Only run if package.json exists and has a "lint" script
if [[ ! -f package.json ]]; then
  exit 0
fi

if ! jq -e '.scripts.lint' package.json >/dev/null 2>&1; then
  exit 0
fi

# Run lint, capture output
lint_output=$(npm run lint 2>&1) && exit 0

# Lint failed — try autofix if lint:fix script exists
if jq -e '.scripts["lint:fix"]' package.json >/dev/null 2>&1; then
  fix_output=$(npm run lint:fix 2>&1) || true

  # Re-run lint to see what's left
  remaining=$(npm run lint 2>&1) && {
    # All fixed
    echo '{"hookSpecificOutput":{"hookEventName":"Stop","additionalContext":"Lint issues were auto-fixed by npm run lint:fix. All clean now."}}'
    exit 0
  }

  # Some unfixable issues remain
  cat <<EOF
{"hookSpecificOutput":{"hookEventName":"Stop","additionalContext":"npm run lint:fix auto-fixed some issues, but lint errors remain:\n$(echo "$remaining" | tail -30 | jq -sRr @json | sed 's/^"//;s/"$//')"}}
EOF
  exit 0
fi

# No lint:fix script — just report
cat <<EOF
{"hookSpecificOutput":{"hookEventName":"Stop","additionalContext":"Lint errors found (no lint:fix script available):\n$(echo "$lint_output" | tail -30 | jq -sRr @json | sed 's/^"//;s/"$//')"}}
EOF
