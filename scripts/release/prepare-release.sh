#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

if ! git rev-parse --git-dir >/dev/null 2>&1; then
  echo "ERROR: Must run inside a git repository."
  exit 1
fi

DATE="$(date +%Y.%m.%d)"
TODAY="$(date +%Y-%m-%d)"

# Release sequence is based on number of release commits for the day,
# not total commits for the day.
TODAY_RELEASE_COUNT="$(git log --since="${TODAY} 00:00:00" --until="${TODAY} 23:59:59" --pretty=format:'%s' HEAD | rg -n "^chore\\(release\\): v${DATE}(-[0-9]+)?$" | wc -l | tr -d ' ')"
NEXT_COUNT=$((TODAY_RELEASE_COUNT + 1))
VERSION="$DATE"
if [[ "$NEXT_COUNT" -gt 1 ]]; then
  VERSION="${DATE}-${NEXT_COUNT}"
fi

export VERSION

node <<'NODE'
const fs = require('fs');
const path = 'package.json';
const version = process.env.VERSION;
const pkg = JSON.parse(fs.readFileSync(path, 'utf8'));
pkg.version = version;
fs.writeFileSync(path, JSON.stringify(pkg, null, 2) + '\n');
NODE

sed -i -E "s/\\.version\\(\"[0-9]{4}\\.[0-9]{2}\\.[0-9]{2}(-[0-9]+)?\"\\)/.version(\"${VERSION}\")/" src/cli.ts

PKG_VERSION="$(node -p 'require("./package.json").version')"
CLI_VERSION="$(rg -No '\.version\("([^"]+)"\)' src/cli.ts | sed -E 's/.*"([^"]+)".*/\1/')"

if [[ "$PKG_VERSION" != "$CLI_VERSION" ]]; then
  echo "ERROR: version mismatch after update: package.json=$PKG_VERSION src/cli.ts=$CLI_VERSION"
  exit 1
fi

echo "Prepared release version: $VERSION"
