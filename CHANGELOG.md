# Changelog

## Unreleased - 2026-07-22

### Added

- Restore live Home Assistant API parity and agent workflows (hac-n0ix)
- Automate conditional daily releases with lossless pm changelog generation (hac-wwsi)
- Add conditional daily release preparation and tag orchestration (hac-m1kj)
- Full Home Assistant CLI command surface and API coverage published. (hac-irl3)
- First public release. (hac-do7b)
- Added command-level coverage for `states --limit` and `states --count --limit`. (hac-q1uv)
- Added `--limit` support to `states` for consistent list-pagination behavior with `entities`. (hac-3qi0)

### Changed

- Pre-release implementation history preserved in docs/PROJECT_HISTORY.md (https://github.com/unbraind/homeassistant-cli/blob/master/docs/PROJECT_HISTORY.md). (hac-r8ds)
- Package launch compatibility validated for both `npx` and `bunx`. (hac-nux2)
- Updated command documentation/examples for `states --limit`. (hac-q1vh)
- Dependabot keeps TypeScript and Node typings on compatible major lines while continuing to propose supported updates. (hac-l2rz)
- GitHub Actions now use current Node 24-based action majors (`checkout@v7`, `setup-node@v7`, and `action-gh-release@v3`), and both runtime matrix lanes install the same frozen Bun lockfile. (hac-yjzn)
- Empty arrays now use the current canonical TOON representation (`[]`, or `key: []` for named fields). (hac-wal7)
- Raised the supported Node.js runtime to 22.19 or newer to match current Commander and Undici requirements. (hac-tajb)
- Updated runtime and development dependencies, including Commander 15, Undici 8, Vitest 4, ESLint 10, ws 8.21, YAML 2.9, and TOON 2.3. (hac-r5y3)

### Fixed

- Wizard read-only option collides with global boolean flag (hac-0zez)
- Auto-release dry run omits pm-changelog installation on clean runners (hac-l25p)
- Raise all-source coverage gates to 100/100/100/100 (hac-vooo)
- Undici 8 rejects REST request throwOnError option (hac-0ay7)
- Auto Release blocker issue lookup split a quoted search query (hac-9hs1)
- Expanded regression test coverage for setup flow alias behavior and startup preflight branches. (hac-h8g0)
- Hardened CLI startup preflight handling for `--config`/`-c` path resolution. (hac-ns9h)
- Restore reproducible Dependabot CI and modernize actions (hac-em8a)
- Enforce documented coverage quality floor (hac-u9lg)

### Security

- Add typed WebSocket session and exposure controls (hac-sv5f)
- Implement typed WebSocket session and exposure commands (hac-soop)
- Make static quality, duplication, security, and pm integrity gates mandatory (hac-ak9g)
- Release engineering finalized: CI, security scanning, dry-run workflow, npm publish workflow, and GitHub release automation. (hac-l2b4)
- Added a dependency-audit CI job and patched transitive overrides for vulnerable `brace-expansion`, `flatted`, and `picomatch` releases. (hac-x41n)
- Modernize and secure homeassistant-cli delivery (hac-gpm3)
- Repository security and maintenance remediation plan (hac-gx4b)
- Protect the default branch with required quality checks (hac-kv5o)
- Remediate critical and high dependency vulnerabilities (hac-d3yc)

### Other

- Typed WebSocket session controls delivery plan (hac-km4t)
- Live Home Assistant API parity delivery plan (hac-6asb)
- Enforce erasable zero-escape TypeScript and complete source docstrings (hac-r4e3)
- Align typed WebSocket target discovery with current Home Assistant (hac-96i2)
- Document and verify the automated release operating model (hac-5n71)
- Publish tagged releases with npm provenance and Bun consumption proof (hac-s43s)
- Backfill every legacy changelog statement into release-assigned pm items (hac-rdt1)
- Modernize supported runtime and development dependencies (hac-brrf)
- Initialize and validate repository-local PM governance (hac-cg64)
