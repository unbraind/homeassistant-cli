# Changelog

All notable changes to this project are documented in this file.

## Unreleased

- Ongoing changes after `v2026.3.6`

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
