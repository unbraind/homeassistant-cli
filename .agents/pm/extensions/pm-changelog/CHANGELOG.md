# Changelog

## 2026.9.25 - 2026-09-25

### Added

- Add opt-in Dependabot dependency sections so item-less release windows still get notes ([pmc-ny9i](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/features/pmc-ny9i.toon))

### Fixed

- Include extension-registered item types in changelog generation and body previews ([pmc-k1oq](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-k1oq.toon))
- A publish that npm accepts late is reported as failed and the GitHub Release is skipped on bun mirror lag ([pmc-piam](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-piam.toon))

### Other

- Certify pm CLI 2026.9.23 and adopt the guarded pm-ops merge-driver launcher ([pmc-pcax](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-pcax.toon))

## 2026.9.23 - 2026-09-23

### Other

- Certify pm CLI 2026.9.21 and install merge drivers through the canonical pm-ops launcher ([pmc-psin](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-psin.toon))

## 2026.9.18 - 2026-09-18

### Other

- Certify pm CLI 2026.9.17 ([pmc-r1qu](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-r1qu.toon))

## 2026.9.15 - 2026-09-15

### Fixed

- Include configured custom item types in changelog generation and export ([pmc-vnke](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-vnke.toon))

## 2026.9.13 - 2026-09-13

### Other

- Group the codeql-action init and analyze updates so Dependabot stops splitting a pair that must match ([pmc-fi6u](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-fi6u.toon))
- Certify pm CLI 2026.9.12 and the pm-ops 2026.9.11 auditor ([pmc-s7bi](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-s7bi.toon))

## 2026.9.10 - 2026-09-10

### Fixed

- Require explicit tagged status evidence for incomplete SDK inputs ([pmc-sonp](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-sonp.toon))
- Preserve historical schemas and physical tracker roots during release membership verification ([pmc-j6cb](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-j6cb.toon))
- Keep branch-only completions out of release tags that do not contain them ([pmc-3jq8](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-3jq8.toon))

### Other

- Prepare reviewed pm-changelog 2026.9.10 release metadata ([pmc-l0tg](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-l0tg.toon))

## 2026.9.9 - 2026-09-09

### Fixed

- Measure changelog parser CPU time without counting descheduled workers ([pmc-zoqj](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-zoqj.toon))

## 2026.9.6 - 2026-09-06

### Other

- Pin pm-cli 2026.9.5 and rename extension --explain ([pmc-662o](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-662o.toon))

## 2026.9.2 - 2026-09-02

### Fixed

- The installed pm resolver's memo makes three untested failures appear and disappear from exact coverage ([pmc-kd73](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-kd73.toon))
- The empty-windows fallback re-fabricates a dated placeholder heading on the library path ([pmc-zgnm](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-zgnm.toon))
- Suppressed pending release can relocate or drop an item (Greptile issue 2, PR \#174) ([pmc-hox8](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-hox8.toon))
- Pending release windows must not claim a never-released package version ([pmc-1vma](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-1vma.toon))
- Extension surface has no --no-pending-release equivalent (Greptile issue 1, PR \#174) ([pmc-zj2w](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-zj2w.toon))

## 2026.9.1 - 2026-09-01

### Other

- Converge the pinned pm-cli on 2026.8.31 and repair history hashes ([pmc-y7al](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-y7al.toon))

## 2026.8.31 - 2026-08-31

### Fixed

- Every release publish invocation must retain provenance attestation ([pmc-473n](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-473n.toon))

## 2026.8.30 - 2026-08-30

### Fixed

- Pending release windows clamp work to the display date ([pmc-n7fl](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-n7fl.toon))

## 2026.8.29 - 2026-08-29

### Other

- Enable GitHub CodeQL code scanning ([pmc-n72l](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-n72l.toon))

## 2026.8.22 - 2026-08-27

### Fixed

- Read the pm workspace with canonical complete reads instead of default budgets ([pmc-n07l](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-n07l.toon))
- Raise pm-changelog source coverage gates to 100/100/100 ([pmc-wvnz](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-wvnz.toon))
- Use canonical unbounded list reads with pm CLI 2026.8.20 ([pmc-6j4o](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-6j4o.toon))

### Security

- The identity gate deadlocks the one remediation its own failure message prescribes ([pmc-s92t](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-s92t.toon))
- Remove historical host paths and non-public Git identities before release approval ([pmc-t8tj](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-t8tj.toon))

### Other

- Align CI+release workflows with peer pm-\* packages (Node 22 + Bun) ([pmc-078v](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/tasks/pmc-078v.toon))

## 2026.8.17 - 2026-08-17

### Fixed

- Add tag-aware fallback dates for release-gated changelogs ([pmc-x49u](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-x49u.toon))

## 2026.8.16 - 2026-08-16

### Fixed

- pm-changelog consumes a truncated `pm list-all` answer as if it were complete ([pmc-wv37](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-wv37.toon))

## 2026.8.12 - 2026-08-12

### Fixed

- Classifier misroutes Issues with CLI command-name titles (update/change) to Changed not Fixed ([pmc-874d](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-874d.toon))

### Other

- Prove classifier precedence across every weak title signal ([pmc-hscf](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/tasks/pmc-hscf.toon))
- Adopt pm-cli 2026.8.11 for current history verification ([pmc-ypbc](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-ypbc.toon))

## 2026.8.9 - 2026-08-10

### Fixed

- Node 22 exact branch coverage is nondeterministic across identical CI reruns ([pmc-v18w](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-v18w.toon))
- Repository-local pm 2026.8.6 prepare removes the 2026.8.7 extension merge fence ([pmc-rdc3](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-rdc3.toon))
- Propagate the docstring gate entry guard fix ([pmc-g5f7](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-g5f7.toon))
- changelog:check verified in prepend mode against a replace-mode CHANGELOG, making the gate unsatisfiable ([pmc-s2bk](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-s2bk.toon))
- The release merge-wait read branch protection which the workflow token can never read ([pmc-o58h](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-o58h.toon))
- Retire the vendored docstring gate for the canonical pm-ops analyzer ([pmc-j0dx](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-j0dx.toon))
- Self-referential release-context test freezes the package version the release bump mutates ([pmc-iygx](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-iygx.toon))
- Node-CLI acceptance test assumes pmc-or-pm item prefixes and leaks the invoking PM tracker ([pmc-femy](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-femy.toon))

### Other

- Cover pm-changelog cli.ts and extension.ts to reach the 100/100/100 aggregate ([pmc-p5l1](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/tasks/pmc-p5l1.toon))

## 2026.8.7 - 2026-08-07

### Other

- Gate CI on strict tracked pm project health ([pmc-vm22](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-vm22.toon))

## 2026.8.4 - 2026-08-04

### Fixed

- Handle SDK CompletionTimestampResolution unresolved arm and upgrade pm-cli pin to 2026.8.3 ([pmc-5hho](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-5hho.toon))

## 2026.8.3 - 2026-08-03

### Added

- Docstring coverage gate: a parser-backed, self-scanning mandatory check ([pmc-kdm1](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/features/pmc-kdm1.toon))

### Fixed

- sync-version could silently restamp the wrong version literal during a release ([pmc-vbft](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-vbft.toon))

## 2026.8.2 - 2026-08-02

### Fixed

- Generate default changelog heading dates in UTC ([pmc-vdss](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-vdss.toon))

## 2026.7.29-1 - 2026-07-29

### Added

- Enforce a real coverage gate by running tests against TypeScript sources ([pmc-6jr4](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/features/pmc-6jr4.toon))
- Adopt authoritative completion-timestamp contract from pm-cli SDK ([pmc-366b](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/features/pmc-366b.toon))

## 2026.7.29 - 2026-07-28

### Fixed

- Prefer actual completion time for changelog release windows ([pmc-f08u](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-f08u.toon))

### Other

- Drop the dead SDK export shim and exporter cast, and gate host-owned flags on sdk/contracts ([pmc-0wyq](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-0wyq.toon))

## 2026.7.28 - 2026-07-28

### Added

- Report the actual changelog drift as a diff when check fails ([pmc-r0nj](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/features/pmc-r0nj.toon))

### Other

- Adopt pm-cli 2026.7.28 and harmonize the production audit script ([pmc-4w23](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-4w23.toon))
- Adopt pm-cli 2026.7.27 dependency ranges ([pmc-58zs](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-58zs.toon))

## 2026.7.27 - 2026-07-27

### Other

- Exclude generated dist output from DeepScan static analysis ([pmc-mi7s](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-mi7s.toon))
- Replace hand-built api doubles in extension tests with the SDK activation harness ([pmc-x0u4](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/tasks/pmc-x0u4.toon))

## 2026.7.26 - 2026-07-26

### Other

- Enable governance duplicate-detection advisory mode and adopt pm-cli 2026.7.25 ([pmc-zbj2](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-zbj2.toon))

## 2026.7.25 - 2026-07-25

### Fixed

- Release attribution silently fails when the release tag is zero-padded but the version is not ([pmc-2sfc](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-2sfc.toon))

## 2026.7.24 - 2026-07-24

### Added

- Add --exclude-tag so tagged items can be omitted from generated changelogs ([pmc-e7b3](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/features/pmc-e7b3.toon))

### Fixed

- Single-window generation ignores an item release field, retro-dating already-shipped work ([pmc-52px](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-52px.toon))
- Support public changelog labels or issue links for generated pm item references ([pmc-vl87](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-vl87.toon))

### Other

- Adopt scoped renderer ownership for changelog JSON output ([pmc-dkmm](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/tasks/pmc-dkmm.toon))

## 2026.7.23 - 2026-07-23

### Fixed

- Recommend pm merge reconcile (2026.7.22) over raw history-repair in Multi-agent merge safety docs ([pmc-r9i0](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-r9i0.toon))

### Other

- Adopt pm field-aware merge driver for multi-agent branch-merge safety ([pmc-api6](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-api6.toon))

## 2026.7.18 - 2026-07-18

### Fixed

- Detect missing git tag history before release-window changelog checks ([pmc-yzho](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-yzho.toon))
- pm install npm:pm-changelog fails due to missing SDK dependency (upstream pm-cli\#53) ([pmc-dcji](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-dcji.toon))

### Other

- Daily Release publish step runs prepublishOnly post-tag: align npm publish with --ignore-scripts ([pmc-xioo](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/tasks/pmc-xioo.toon))
- Harden release bun-verify so registry-mirror lag cannot block the GitHub release ([pmc-pr0j](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-pr0j.toon))

## 2026.7.15-1 - 2026-07-15

### Fixed

- Adopt ItemMetadata SDK reader after pm-cli terminology migration ([pmc-4a7j](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-4a7j.toon))

## 2026.7.15 - 2026-07-15

### Fixed

- Harden Create-GitHub-release npm guard against read-replica propagation lag ([pmc-4nkr](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-4nkr.toon))

## 2026.7.14-2 - 2026-07-14

### Fixed

- changelog --format json emits TOON on stdout without global --json ([pmc-nagj](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-nagj.toon))

## 2026.7.14-1 - 2026-07-14

### Fixed

- Retry transient package-install cleanup ([pmc-70yk](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-70yk.toon))

## 2026.7.14 - 2026-07-14

### Fixed

- Merge release metadata before npm publication ([pmc-84ow](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-84ow.toon))
- Isolate package-install integration tests from the user's pm home ([pmc-09bu](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-09bu.toon))

## 2026.7.13 - 2026-07-13

### Fixed

- Fix all-release-tags collapsing legacy historical sections after orphaned git tags ([pmc-emom](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-emom.toon))

## 2026.7.11-1 - 2026-07-11

### Other

- Ecosystem release readiness pass 2026-07-06 ([pmc-5z9i](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/tasks/pmc-5z9i.toon))

## 2026.7.11 - 2026-07-11

### Other

- SDK 2026.7.10 alignment and production readiness pass ([pmc-yy8d](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/tasks/pmc-yy8d.toon))

## 2026.7.10 - 2026-07-10

### Added

- Add --summary mode and unified --format json output for agents ([pmc-ygs2](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/features/pmc-ygs2.toon))

## 2026.7.6 - 2026-07-06

### Fixed

- Fix release CI ordering (publish-before-tag) ([pmc-vuhy](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/tasks/pmc-vuhy.toon))

### Other

- Align Node engine with pm CLI runtime ([pmc-hlr7](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/tasks/pmc-hlr7.toon))
- Refresh pm-changelog to latest pm CLI peer and dev toolchain ([pmc-pgt7](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/tasks/pmc-pgt7.toon))

## 2026.6.30 - 2026-06-30

### Fixed

- Relax changelog title escaping for readable Markdown ([pmc-8t9f](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-8t9f.toon))

## 2026.6.20 - 2026-06-20

### Security

- Refresh pm-changelog dev dependency lock for clean audit ([pmc-licw](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-licw.toon))

## 2026.6.13-1 - 2026-06-13

### Fixed

- Prepend merge promotes a stale Unreleased section into the released version instead of duplicating it (GH \#47) ([pmc-8ssd](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-8ssd.toon))

## 2026.6.13 - 2026-06-13

### Fixed

- Stabilize calendar release headings across the zero-padded tag boundary ([pmc-sall](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-sall.toon))

## 2026.6.10 - 2026-06-10

### Added

- Full pm ecosystem production pass for pm-changelog ([pmc-3j77](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/features/pmc-3j77.toon))

## 2026.6.8 - 2026-06-08

### Fixed

- Classifier misroutes feature command names containing remove/delete to Removed section ([pmc-ph6q](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-ph6q.toon))

### Other

- Full-cycle hardening wave: pm-changelog ([pmc-4279](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/tasks/pmc-4279.toon))

## 2026.6.7 - 2026-06-07

### Added

- Add optional item metadata to changelog entries ([pmc-q671](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/features/pmc-q671.toon))

### Other

- Align package dependencies to pm CLI/SDK 2026.6.6 ([pmc-rr5l](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-rr5l.toon))

## 2026.6.6 - 2026-06-06

### Fixed

- Make body enrichment registry resolution best-effort ([pmc-xl7x](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-xl7x.toon))

## 2026.6.5-1 - 2026-06-05

### Fixed

- suggest-semver computed over all items not visible release sections (GH \#28) ([pmc-isyx](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-isyx.toon))
- body-preview silently empty for real pm items: body not loaded (GH \#27) ([pmc-ztt5](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-ztt5.toon))
- Breaking-change detector substring-matches non-breaking as breaking (GH \#26) ([pmc-18yz](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-18yz.toon))

## 2026.6.5 - 2026-06-05

### Added

- Add opt-in breaking-changes, suggest-semver, body-preview, and emoji-prefix flags ([pmc-se5c](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/features/pmc-se5c.toon))

## 2026.6.4 - 2026-06-04

### Fixed

- Deduplicate label grouping tags in changelog sections ([pmc-an10](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-an10.toon))

## 2026.6.3 - 2026-06-03

### Added

- Opt-in changelog enhancements ([pmc-emx6](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/features/pmc-emx6.toon))
- Add --changelog-json structured document output ([pmc-gl6b](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/tasks/pmc-gl6b.toon))
- Add --limit and --since-version release windowing ([pmc-xtwa](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/tasks/pmc-xtwa.toon))
- Add --contributors per-release contributor list ([pmc-imsu](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/tasks/pmc-imsu.toon))
- Add --conventional Conventional-Commits heading mapping ([pmc-91hn](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/tasks/pmc-91hn.toon))
- Add --section-by type\|status\|label within-release grouping ([pmc-qro6](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/tasks/pmc-qro6.toon))

### Fixed

- Zero-regression guarantee for pm-changelog enhancements ([pmc-1w1r](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/decisions/pmc-1w1r.toon))
- Fix changelog export format validation and metadata ([pmc-55cp](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-55cp.toon))

## 2026.6.1 - 2026-06-01

### Fixed

- changelog generate returned {error} (exit 0) on bad flags; plain throw on --check ([pmc-qw3g](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-qw3g.toon))

## 2026.5.29-2 - 2026-05-29

### Added

- Hands-on functional test pass 2026-05-29 (real data) ([pmc-7rd8](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/features/pmc-7rd8.toon))

### Fixed

- Committed CHANGELOG.md stale vs current history (orphaned release tags) ([pmc-e3sy](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-e3sy.toon))

## 2026.5.27-1 - 2026-05-27

### Added

- Add publish retry + provenance fallback to release workflow ([pmc-ermk](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/tasks/pmc-ermk.toon))

## 2026.5.27 - 2026-05-27

### Other

- Release readiness hardening for pm-changelog ([pmc-14cx](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/tasks/pmc-14cx.toon))
- Bump @unbrained/pm-cli SDK to \>=2026.5.24 ([pmc-cfhf](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/tasks/pmc-cfhf.toon))

## 2026.5.26 - 2026-05-25

### Fixed

- Fix release tag date drift in changelog checks ([pmc-7dm6](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-7dm6.toon))

## 2026.5.25 - 2026-05-25

### Added

- Bucket items by release field in full-history changelog ([pmc-dfue](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/features/pmc-dfue.toon))
- Auto-generate full-history CHANGELOG.md in CI without duplicates ([pmc-iuqg](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/features/pmc-iuqg.toon))

### Other

- Cut and publish pm-changelog 2026.5.25-1 release to npm and GitHub ([pmc-9wvl](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/tasks/pmc-9wvl.toon))
- Production readiness audit and release for pm-changelog 2026-05-25 ([pmc-9mck](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/epics/pmc-9mck.toon))
- Bump @types/node to ^25.9.1 and rewire CI to full-history changelog ([pmc-w8iu](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-w8iu.toon))
- Replace inline node -e JavaScript with TypeScript helper ([pmc-vvpy](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-vvpy.toon))
- Verify pm-changelog install and CLI work in a clean temp folder ([pmc-3jj2](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/tasks/pmc-3jj2.toon))

## 2026.5.24-15 - 2026-05-24

### Fixed

- Stabilize full-history release windows for release automation ([pmc-s1c1](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-s1c1.toon))

## 2026.5.24-14 - 2026-05-24

### Fixed

- Batch git tag timestamp lookup for full-history changelog ([pmc-99tc](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-99tc.toon))

## 2026.5.24-13 - 2026-05-24

### Fixed

- Support full historical changelog generation from git release tags ([pmc-qm7s](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-qm7s.toon))

## 2026.5.24-11 - 2026-05-24

### Fixed

- Prepend mode duplicates Keep a Changelog bracketed release sections ([pmc-nh7q](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-nh7q.toon))

## 2026.5.24-10 - 2026-05-24

### Fixed

- Add package-owned release context flags ([pmc-34gb](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-34gb.toon))

## 2026.5.24-8 - 2026-05-24

### Added

- Add --item-url-base to release.yml changelog generation steps ([pmc-ew5n](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-ew5n.toon))

## 2026.5.24-7 - 2026-05-24

### Added

- Add --item-url-base option to make pm item IDs clickable links ([pmc-w906](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/features/pmc-w906.toon))

### Changed

- Update @unbrained/pm-cli dev dependency to 2026.5.24 ([pmc-x3cf](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-x3cf.toon))

### Fixed

- Expose item-url-base through pm changelog extension command ([pmc-f4yg](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-f4yg.toon))
- Fix stale file path references in pm items (mjs → ts, dist → dist/cli.js) ([pmc-gn92](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-gn92.toon))
- Fix large tracker generation buffer limit ([pmc-2lzr](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-2lzr.toon))

## 2026.5.24-6 - 2026-05-24

### Fixed

- Changelog sections out of version order when items have different updated_at times ([pmc-36lr](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-36lr.toon))

## 2026.5.24-5 - 2026-05-24

### Other

- Run full release gate and temp install verification 2026-05-24 session 2 ([pmc-ws4p](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-ws4p.toon))
- Production readiness verification 2026-05-24 session 2 ([pmc-9tmr](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/epics/pmc-9tmr.toon))

## 2026.5.24-3 - 2026-05-24

### Fixed

- Published package sourcemaps point to missing source files ([pmc-l9z0](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-l9z0.toon))
- Production readiness refresh for pm-changelog sourcemap fix ([pmc-pm02](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-pm02.toon))

### Other

- Production readiness pass 2026-05-24 session ([pmc-96zn](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-96zn.toon))

## 2026.5.24-2 - 2026-05-23

### Security

- Remove host-specific path from published docs ([pmc-sz4m](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-sz4m.toon))

## 2026.5.24-1 - 2026-05-23

### Fixed

- Published npm package missed runtime pm SDK dependency ([pmc-xif2](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-xif2.toon))

## 2026.5.24 - 2026-05-23

### Fixed

- Release workflow used UTC date for local 2026-05-24 release ([pmc-e1jy](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-e1jy.toon))

## 2026.5.23-7 - 2026-05-23

### Added

- Restructure documentation for agent progressive disclosure ([pmc-nuci](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/features/pmc-nuci.toon))
- Use official pm SDK without local extension shims ([pmc-0jm1](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/features/pmc-0jm1.toon))

### Security

- Verify release readiness with GitHub npm pm and history checks ([pmc-scof](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/tasks/pmc-scof.toon))

### Other

- Production readiness refresh for pm-changelog v2026.05.23-7 ([pmc-t7ie](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/epics/pmc-t7ie.toon))
- Convert test source to typed TypeScript ([pmc-yzeq](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/tasks/pmc-yzeq.toon))

## 2026.5.23-6 - 2026-05-23

### Added

- Enable scheduled npm and GitHub auto release workflow ([pmc-mklv](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/features/pmc-mklv.toon))

### Other

- Verify pm-changelog release workflow and package install path ([pmc-6zxg](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/tasks/pmc-6zxg.toon))
- Refresh production readiness governance for v2026.05.23-6 ([pmc-l1h7](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-l1h7.toon))

## 2026.5.23-5 - 2026-05-23

### Other

- Production release readiness pass for pm-changelog 2026.5.23-5 ([pmc-qjl9](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-qjl9.toon))

## 2026.5.23-1 - 2026-05-23

### Other

- Fresh production readiness verification for pm-changelog ([pmc-nv97](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-nv97.toon))

## 2026.5.23 - 2026-05-23

### Other

- Post-release production readiness continuation audit ([pmc-ry1j](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-ry1j.toon))

## 0.1.0 - 2026-05-23

### Added

- Regenerate release changelog from pm items ([pmc-a6qg](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/features/pmc-a6qg.toon))
- Harden npm package metadata and CI release gates ([pmc-otpe](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/features/pmc-otpe.toon))

### Fixed

- Publish pm-changelog to npm after registry authentication ([pmc-ek6t](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-ek6t.toon))

### Security

- Audit git history for private data exposure ([pmc-91po](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/issues/pmc-91po.toon))

### Other

- Final release verification and npm publication audit ([pmc-jk1a](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-jk1a.toon))
- Release pm-changelog 0.1.0 as a production-ready pm package ([pmc-ysps](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/epics/pmc-ysps.toon))
- Document pm governance for the package lifecycle ([pmc-xl68](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-xl68.toon))
- Align GitHub repository settings for public package release ([pmc-w1sp](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/chores/pmc-w1sp.toon))
- Verify pm-changelog in a clean temporary project ([pmc-800h](https://github.com/unbraind/pm-changelog/blob/main/.agents/pm/tasks/pmc-800h.toon))
