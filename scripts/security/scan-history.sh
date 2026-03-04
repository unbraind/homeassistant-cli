#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "ERROR: Must run inside a git repository."
  exit 1
fi

# High-confidence secret signatures across the entire commit history.
PATTERN='ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{40,}|AKIA[0-9A-Z]{16}|-----BEGIN (RSA|OPENSSH|EC|DSA|PGP) PRIVATE KEY-----|xox[baprs]-[A-Za-z0-9-]{10,}|npm_[A-Za-z0-9]{36}|eyJ[A-Za-z0-9_-]{10,}\\.[A-Za-z0-9._-]{10,}\\.[A-Za-z0-9._-]{10,}|_authToken[[:space:]]*=[[:space:]]*[A-Za-z0-9._-]{20,}'

TMP_RESULTS="$(mktemp)"
trap 'rm -f "$TMP_RESULTS"' EXIT

while IFS= read -r commit; do
  while IFS= read -r path; do
    printf '%s\t%s\n' "$commit" "$path" >>"$TMP_RESULTS"
  done < <(git grep -Il -E "$PATTERN" "$commit" -- . ':(exclude)scripts/security/scan-history.sh' || true)
done < <(git rev-list --all)

if [[ -s "$TMP_RESULTS" ]]; then
  echo "ERROR: potential secret material found in git history:"
  sort -u "$TMP_RESULTS" | sed 's/^/  - /'
  exit 1
fi

echo "History secret scan passed."
