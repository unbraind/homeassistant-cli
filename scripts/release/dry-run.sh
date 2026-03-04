#!/usr/bin/env bash
set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT_DIR"

echo "[1/4] Build package"
bun run build >/dev/null
TARBALL="$(npm pack --silent)"

echo "[2/4] npx smoke test from packed tarball"
TMP_NPX="$(mktemp -d)"
cp "$TARBALL" "$TMP_NPX/"
(
  cd "$TMP_NPX"
  npm init -y >/dev/null
  npm install "./$TARBALL" >/dev/null
  npx --yes --no-install hassio --help >/dev/null
)


echo "[3/4] bunx smoke test from packed tarball"
TMP_BUNX="$(mktemp -d)"
cp "$TARBALL" "$TMP_BUNX/"
(
  cd "$TMP_BUNX"
  cat > package.json <<JSON
{
  "name": "hassio-smoke",
  "private": true,
  "dependencies": {
    "homeassistant-cli": "file:./$TARBALL"
  }
}
JSON
  bun install >/dev/null
  bunx hassio --help >/dev/null
)

echo "[4/4] Cleanup"
rm -rf "$TMP_NPX" "$TMP_BUNX"
rm -f "$TARBALL"

echo "Release dry-run passed (npx + bunx)."
