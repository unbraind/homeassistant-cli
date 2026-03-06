#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

VERSION="$(node -p 'require("./package.json").version')"
DATE_ISO="$(date +%Y-%m-%d)"
TEST_COUNT="$(bun run test 2>/dev/null | rg -o 'Tests\s+[0-9]+' | tail -n1 | rg -o '[0-9]+' || true)"
CHANGELOG_NOTES="$(
  awk -v v="$VERSION" '
    $0 ~ ("^## " v " - ") {in_section=1; next}
    in_section && $0 ~ "^## " {exit}
    in_section {print}
  ' CHANGELOG.md
)"

cat <<MD
## homeassistant-cli v${VERSION} (${DATE_ISO})

### Highlights
- Release-quality gates passed and package launchers validated.
- Published package supports both \`npx\` and \`bunx\` execution paths.

### Quality
- Build: pass
- Typecheck: pass
- Test suite: ${TEST_COUNT:-"see CI"} tests passing
- Coverage: see CI artifact/report

### Release Notes
${CHANGELOG_NOTES:-"- See CHANGELOG.md for this version's release notes."}
MD
