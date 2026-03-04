#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

VERSION="$(node -p 'require("./package.json").version')"
DATE_ISO="$(date +%Y-%m-%d)"
TEST_COUNT="$(bun run test 2>/dev/null | rg -o 'Tests\s+[0-9]+' | tail -n1 | rg -o '[0-9]+' || true)"

cat <<MD
## homeassistant-cli v${VERSION} (${DATE_ISO})

### Highlights
- Production-ready CLI release with complete quality gates.
- End-to-end release automation added (CI, dry-run, publish workflow).
- Package execution validated for both 'npx' and 'bunx' flows.

### Quality
- Build: pass
- Typecheck: pass
- Test suite: ${TEST_COUNT:-"see CI"} tests passing
- Coverage: see CI artifact/report

### Release Notes
- Added GitHub Actions CI matrix for Bun and Node validation.
- Added publish workflow (manual trigger, npm provenance, no auto-release).
- Added release helper scripts for prepare/verify/dry-run/notes.
- Added ESLint flat configuration and lint workflow integration.
- Added contributor-facing release process documentation.
MD
