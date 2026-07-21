#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "[1/10] Installing dependencies"
bun install --frozen-lockfile

echo "[2/10] Auditing dependency graph"
bun run security:audit

echo "[3/10] Static quality, documentation, duplication, and shell gates"
bun run quality:static

echo "[4/10] PM tracker integrity"
bun run quality:pm

echo "[5/10] Building"
bun run build

echo "[6/10] Testing"
bun run test

echo "[7/10] Coverage"
bun run test:coverage

echo "[8/10] Security sanity scan (staged changes)"
if git diff --cached -U0 | rg -n '^\+.*(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{40,}|npm_[A-Za-z0-9]{36}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]{10,}\.[A-Za-z0-9._-]{10,}|-----BEGIN (RSA|OPENSSH|EC|DSA|PGP) PRIVATE KEY-----|_authToken\s*=)'; then
  echo "ERROR: possible secret pattern found in staged changes"
  exit 1
fi

bun run security:trivy

echo "[9/10] Security scan (full git history)"
bash scripts/security/scan-history.sh

echo "[10/10] Commit message quality audit"
bash scripts/git/audit-commit-messages.sh

echo "Release verification passed."
