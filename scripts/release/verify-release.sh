#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "[1/9] Installing dependencies"
bun install --frozen-lockfile

echo "[2/9] Type checking"
bun run typecheck

echo "[3/9] Linting"
bun run lint

echo "[4/9] Building"
bun run build

echo "[5/9] Testing"
bun run test

echo "[6/9] Coverage"
bun run test:coverage

echo "[7/9] Security sanity scan (staged changes)"
if git diff --cached | rg -n "eyJhbGci|HASSIO_TOKEN\\s*=|token.*:"; then
  echo "ERROR: possible secret pattern found in staged changes"
  exit 1
fi

echo "[8/9] Security scan (full git history)"
bash scripts/security/scan-history.sh

echo "[9/9] Commit message quality audit"
bash scripts/git/audit-commit-messages.sh

echo "Release verification passed."
