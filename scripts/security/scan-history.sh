#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "ERROR: Must run inside a git repository."
  exit 1
fi

# High-confidence secret signatures across the entire commit history.
PATTERN='ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{40,}|AKIA[0-9A-Z]{16}|-----BEGIN (RSA|OPENSSH|EC|DSA|PGP) PRIVATE KEY-----|xox[baprs]-[A-Za-z0-9-]{10,}|npm_[A-Za-z0-9]{36}'

TMP_RESULTS="$(mktemp)"
trap 'rm -f "$TMP_RESULTS"' EXIT

while IFS= read -r commit; do
  git grep -nI -E "$PATTERN" "$commit" -- . >>"$TMP_RESULTS" || true
done < <(git rev-list --all)

if [[ -s "$TMP_RESULTS" ]]; then
  echo "ERROR: potential secret material found in git history:"
  cat "$TMP_RESULTS"
  exit 1
fi

echo "History secret scan passed."
