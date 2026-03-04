# Project History (Pre-Release)

This document captures the internal development history before the first public release.

## Timeline Summary

### 2026-02-28
- Repository initialized.
- Core Home Assistant API support implemented (status, states, services, events, templates).
- Base LLM-oriented output strategy introduced with TOON as default.

### 2026-03-01
- Expanded system and extended commands (energy, weather, health, info).
- Improved configuration handling and startup resilience.
- Added read-only safety mode and timeout controls.

### 2026-03-02
- Added settings wizard/doctor flows and non-interactive setup support.
- Added capabilities probing and agent execution profile/planning outputs.
- Expanded WebSocket and supervisor support.

### 2026-03-03
- Added registry CRUD support and broader API parity improvements.
- Improved agent-context outputs and runtime metadata.
- Increased E2E validation depth for live Home Assistant environments.

### 2026-03-04
- Added major domain command coverage (device control, timers/input, media-player, vacuum/valve/water-heater, and more).
- Added API matrix command and WebSocket target helper commands.
- Completed release engineering setup: CI matrix, dry-run pipeline, npm publish workflow, release scripts.

## Commit Message Quality

Current visible `master` history has been reviewed for professionalism and consistency.

- Style baseline: Conventional Commits (`feat`, `fix`, `docs`, `test`, `refactor`, `chore`).
- Legacy noisy pre-release summary artifacts were removed from git history so commits contain only project-relevant files.
- Historical backup refs from previous rewrites (`refs/original/*`) were removed locally to prevent duplicate/legacy history from appearing in audits.

## Security Audit Status

A repository history scan was performed for high-confidence secret signatures (GitHub tokens, AWS access keys, private key headers, Slack tokens, npm tokens).

- Result: no confirmed credential leak found in reachable commit history.
- Guardrails added: `scripts/security/scan-history.sh` and GitHub `Security` workflow.

## Release Baseline (Before First Public Tag)

- `CHANGELOG.md` remains intentionally minimal until first public release.
- Pre-release implementation history and hardening details are documented here instead of changelog entries.
- Versioning is date-based with daily sequence: `YYYY.M.D` for first release of day, then `YYYY.M.D-N`.
