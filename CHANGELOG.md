# Changelog

## Unreleased

### Changed

- Updated runtime and development dependencies, including Commander 15, Undici 8, Vitest 4, ESLint 10, ws 8.21, YAML 2.9, and TOON 2.3.
- Raised the supported Node.js runtime to 22.19 or newer to match current Commander and Undici requirements.
- Empty arrays now use the current canonical TOON representation (`[]`, or `key: []` for named fields).
- GitHub Actions now use current Node 24-based action majors and both runtime matrix lanes install the same frozen Bun lockfile.

### Security

- Added a dependency-audit CI job and patched transitive overrides for vulnerable `brace-expansion`, `flatted`, and `picomatch` releases.

All notable changes to this project are documented in this file.

## Unreleased

- Ongoing changes after `v2026.3.6-2`

## 2026.3.6-2 - 2026-03-06

- Hardened CLI startup preflight handling for `--config`/`-c` path resolution.
- Expanded regression test coverage for setup flow alias behavior and startup preflight branches.

## 2026.3.6 - 2026-03-06

- Added `--limit` support to `states` for consistent list-pagination behavior with `entities`.
- Added command-level coverage for `states --limit` and `states --count --limit`.
- Updated command documentation/examples for `states --limit`.

## 2026.3.4 - 2026-03-04

- First public release.
- Full Home Assistant CLI command surface and API coverage published.
- Release engineering finalized: CI, security scanning, dry-run workflow, npm publish workflow, and GitHub release automation.
- Package launch compatibility validated for both `npx` and `bunx`.
- Pre-release implementation history preserved in [docs/PROJECT_HISTORY.md](docs/PROJECT_HISTORY.md).
