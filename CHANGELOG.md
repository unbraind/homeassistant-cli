# Changelog

## Unreleased

### Added

- Automate conditional daily releases with lossless pm changelog generation ([hac-wwsi](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/features/hac-wwsi.toon))
- Add conditional daily release preparation and tag orchestration ([hac-m1kj](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/tasks/hac-m1kj.toon))

### Changed

- Dependabot keeps TypeScript and Node typings on compatible major lines while continuing to propose supported updates. ([hac-l2rz](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/tasks/hac-l2rz.toon))
- GitHub Actions now use current Node 24-based action majors (`checkout@v7`, `setup-node@v7`, and `action-gh-release@v3`), and both runtime matrix lanes install the same frozen Bun lockfile. ([hac-yjzn](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/tasks/hac-yjzn.toon))
- Empty arrays now use the current canonical TOON representation (`[]`, or `key: []` for named fields). ([hac-wal7](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/tasks/hac-wal7.toon))
- Raised the supported Node.js runtime to 22.19 or newer to match current Commander and Undici requirements. ([hac-tajb](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/tasks/hac-tajb.toon))
- Updated runtime and development dependencies, including Commander 15, Undici 8, Vitest 4, ESLint 10, ws 8.21, YAML 2.9, and TOON 2.3. ([hac-r5y3](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/tasks/hac-r5y3.toon))

### Fixed

- Restore reproducible Dependabot CI and modernize actions ([hac-em8a](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/issues/hac-em8a.toon))
- Enforce documented coverage quality floor ([hac-u9lg](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/issues/hac-u9lg.toon))

### Security

- Added a dependency-audit CI job and patched transitive overrides for vulnerable `brace-expansion`, `flatted`, and `picomatch` releases. ([hac-x41n](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/tasks/hac-x41n.toon))
- Modernize and secure homeassistant-cli delivery ([hac-gpm3](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/epics/hac-gpm3.toon))
- Repository security and maintenance remediation plan ([hac-gx4b](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/plans/hac-gx4b.toon))
- Protect the default branch with required quality checks ([hac-kv5o](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/issues/hac-kv5o.toon))
- Remediate critical and high dependency vulnerabilities ([hac-d3yc](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/issues/hac-d3yc.toon))

### Other

- Document and verify the automated release operating model ([hac-5n71](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/tasks/hac-5n71.toon))
- Publish tagged releases with npm provenance and Bun consumption proof ([hac-s43s](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/tasks/hac-s43s.toon))
- Backfill every legacy changelog statement into release-assigned pm items ([hac-rdt1](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/tasks/hac-rdt1.toon))
- Modernize supported runtime and development dependencies ([hac-brrf](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/chores/hac-brrf.toon))
- Initialize and validate repository-local PM governance ([hac-cg64](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/tasks/hac-cg64.toon))

## 2026.3.6-2 - 2026-03-06

### Fixed

- Expanded regression test coverage for setup flow alias behavior and startup preflight branches. ([hac-h8g0](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/tasks/hac-h8g0.toon))
- Hardened CLI startup preflight handling for `--config`/`-c` path resolution. ([hac-ns9h](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/tasks/hac-ns9h.toon))

## 2026.3.6 - 2026-03-06

### Added

- Added command-level coverage for `states --limit` and `states --count --limit`. ([hac-q1uv](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/tasks/hac-q1uv.toon))
- Added `--limit` support to `states` for consistent list-pagination behavior with `entities`. ([hac-3qi0](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/tasks/hac-3qi0.toon))

### Changed

- Updated command documentation/examples for `states --limit`. ([hac-q1vh](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/tasks/hac-q1vh.toon))

## 2026.3.4 - 2026-03-04

### Added

- Full Home Assistant CLI command surface and API coverage published. ([hac-irl3](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/tasks/hac-irl3.toon))
- First public release. ([hac-do7b](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/tasks/hac-do7b.toon))

### Changed

- Pre-release implementation history preserved in docs/PROJECT_HISTORY.md (https://github.com/unbraind/homeassistant-cli/blob/master/docs/PROJECT_HISTORY.md). ([hac-r8ds](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/tasks/hac-r8ds.toon))
- Package launch compatibility validated for both `npx` and `bunx`. ([hac-nux2](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/tasks/hac-nux2.toon))

### Security

- Release engineering finalized: CI, security scanning, dry-run workflow, npm publish workflow, and GitHub release automation. ([hac-l2b4](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/tasks/hac-l2b4.toon))
