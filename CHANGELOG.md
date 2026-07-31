# Changelog

## Unreleased

### Added

- Add token-efficient entity deltas and automation platform discovery ([hac-1iz2](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/features/hac-1iz2.toon))
- Unify typed service action execution across REST and WebSocket ([hac-stpm](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/features/hac-stpm.toon))

### Fixed

- Clean-runner PM history drift blocks scheduled auto release ([hac-yt85](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/issues/hac-yt85.toon))
- Explicit HASSIO_READONLY false incorrectly enables read-only mode ([hac-ndoh](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/issues/hac-ndoh.toon))

### Other

- Entity delta and automation discovery delivery plan ([hac-usxc](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/plans/hac-usxc.toon))
- Implement bounded entity delta and automation platform subscriptions ([hac-g36l](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/tasks/hac-g36l.toon))
- Typed service action delivery plan ([hac-ahkf](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/plans/hac-ahkf.toon))
- Implement normalized typed service action contracts ([hac-97on](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/tasks/hac-97on.toon))

## 2026.7.26 - 2026-07-26

### Added

- Add agent-native media discovery and search ([hac-ln1v](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/features/hac-ln1v.toon))

### Other

- Media discovery delivery plan ([hac-h3uj](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/plans/hac-h3uj.toon))
- Implement typed bounded media browse search and resolve ([hac-poex](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/tasks/hac-poex.toon))

## 2026.7.25 - 2026-07-25

### Added

- Add coalesced WebSocket trigger subscriptions ([hac-r2z9](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/features/hac-r2z9.toon))
- Add token-efficient registry discovery and release-runner parity ([hac-r17v](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/features/hac-r17v.toon))

### Security

- Release dry-run runner omits mandatory verification tools ([hac-bwr0](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/issues/hac-bwr0.toon))
- Patch brace-expansion denial-of-service advisory ([hac-jo1v](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/issues/hac-jo1v.toon))
- Tag publication runner omits mandatory release verification tools ([hac-zwvk](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/issues/hac-zwvk.toon))

### Other

- Coalesced trigger subscription delivery plan ([hac-1sdd](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/plans/hac-1sdd.toon))
- Implement coalesced protocol and typed trigger observation ([hac-c0y8](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/tasks/hac-c0y8.toon))
- Compact registry and publication parity delivery plan ([hac-yo48](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/plans/hac-yo48.toon))
- Implement compact entity registry display discovery ([hac-ahl7](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/tasks/hac-ahl7.toon))

## 2026.7.23 - 2026-07-23

### Added

- Add typed automation validation and release-safe version contracts ([hac-suj3](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/features/hac-suj3.toon))
- Restore live Home Assistant API parity and agent workflows ([hac-n0ix](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/features/hac-n0ix.toon))

### Fixed

- Scheduled release candidate bump breaks hard-coded CLI version test ([hac-jwim](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/issues/hac-jwim.toon))
- Wizard read-only option collides with global boolean flag ([hac-0zez](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/issues/hac-0zez.toon))
- Auto-release dry run omits pm-changelog installation on clean runners ([hac-l25p](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/issues/hac-l25p.toon))
- Raise all-source coverage gates to 100/100/100/100 ([hac-vooo](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/issues/hac-vooo.toon))
- Undici 8 rejects REST request throwOnError option ([hac-0ay7](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/issues/hac-0ay7.toon))

### Security

- Add typed WebSocket session and exposure controls ([hac-sv5f](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/features/hac-sv5f.toon))
- Implement typed WebSocket session and exposure commands ([hac-soop](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/tasks/hac-soop.toon))
- Make static quality, duplication, security, and pm integrity gates mandatory ([hac-ak9g](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/tasks/hac-ak9g.toon))

### Other

- Automation validation and release reliability delivery plan ([hac-7q84](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/plans/hac-7q84.toon))
- Implement typed WebSocket automation validation ([hac-3n6e](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/tasks/hac-3n6e.toon))
- Typed WebSocket session controls delivery plan ([hac-km4t](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/plans/hac-km4t.toon))
- Live Home Assistant API parity delivery plan ([hac-6asb](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/plans/hac-6asb.toon))
- Enforce erasable zero-escape TypeScript and complete source docstrings ([hac-r4e3](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/tasks/hac-r4e3.toon))
- Align typed WebSocket target discovery with current Home Assistant ([hac-96i2](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/tasks/hac-96i2.toon))

## 2026.7.21-2 - 2026-07-21

### Fixed

- Auto Release blocker issue lookup split a quoted search query ([hac-9hs1](https://github.com/unbraind/homeassistant-cli/blob/master/.agents/pm/issues/hac-9hs1.toon))

## 2026.7.21 - 2026-07-21

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
