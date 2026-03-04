#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

RANGE="${1:-master}"
TMP="$(mktemp)"
trap 'rm -f "$TMP"' EXIT

# Conventional commit baseline for this repository.
git log --pretty=format:'%h%x09%s' "$RANGE" | while IFS=$'\t' read -r sha subject; do
  if [[ ! "$subject" =~ ^(feat|fix|docs|test|refactor|chore|perf)(\([a-z0-9-]+\))?:\ .+ ]]; then
    echo "$sha	$subject" >> "$TMP"
  fi

done

if [[ -s "$TMP" ]]; then
  echo "ERROR: non-conforming commit subjects found:"
  cat "$TMP"
  exit 1
fi

echo "Commit message audit passed for range: $RANGE"
