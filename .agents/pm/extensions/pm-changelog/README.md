# pm-changelog

Generate `CHANGELOG.md` from pm-cli items.

[![pm total](https://pm-cli.unbrained.dev/badges/svg?repo=unbraind/pm-changelog&metric=items&style=flat&rt=1)](https://pm-cli.unbrained.dev/badges)
[![pm open](https://pm-cli.unbrained.dev/badges/svg?repo=unbraind/pm-changelog&metric=status&status=open&style=flat&rt=1)](https://pm-cli.unbrained.dev/badges)
[![pm in progress](https://pm-cli.unbrained.dev/badges/svg?repo=unbraind/pm-changelog&metric=status&status=in_progress&style=flat&rt=1)](https://pm-cli.unbrained.dev/badges)
[![pm closed](https://pm-cli.unbrained.dev/badges/svg?repo=unbraind/pm-changelog&metric=closed&style=flat&rt=1)](https://pm-cli.unbrained.dev/badges)
[![pm completion](https://pm-cli.unbrained.dev/badges/svg?repo=unbraind/pm-changelog&metric=completion&style=flat&rt=1)](https://pm-cli.unbrained.dev/badges)
[![pm last activity](https://pm-cli.unbrained.dev/badges/svg?repo=unbraind/pm-changelog&metric=last-activity&style=flat&rt=1)](https://pm-cli.unbrained.dev/badges)
[![pm history events](https://pm-cli.unbrained.dev/badges/svg?repo=unbraind/pm-changelog&metric=history-events&style=flat&rt=1)](https://pm-cli.unbrained.dev/badges)

## Install

```bash
pm install npm:pm-changelog --project
```

```bash
pm changelog generate --mode prepend --output CHANGELOG.md
```

Rebuild a full project changelog from git release tags:

```bash
pm changelog generate --all-release-tags --mode replace --output CHANGELOG.md
```

Tag-derived flags (`--all-release-tags`, `--since-previous-tag`,
`--until-release-tag`) require complete git tag history: in a shallow clone
they fail with an actionable `E_MISSING_TAG_HISTORY` diagnostic instead of
deriving an incomplete window. The diagnostic names the exact recovery for the
detected state — `git fetch --tags --unshallow` for a plain shallow clone, or
`git config --unset remote.origin.tagOpt && git fetch --tags --unshallow` when
the clone is also `--no-tags`; follow all commands it lists (see
[Release and CI](docs/release.md)).

Standalone npm usage:

```bash
npm install --save-dev pm-changelog @unbrained/pm-cli
npx pm-changelog --mode prepend --output CHANGELOG.md
```

The standalone CLI accepts both `--flag value` and `--flag=value` for value
options, and supports `--release-version` as a compatibility alias for
`--version` (matching `pm changelog generate` syntax).

Date precedence is explicit: `--date` is an unconditional override, then an
existing release tag supplies its commit date, then `--date-fallback` or
`--date-from-version` applies only while that tag is absent. With none of those,
generation uses the current UTC calendar date. Release-gated CalVer packages can
therefore use `--date-from-version` (for example `2026.8.8` becomes
`2026-08-08`) without masking the authoritative tag date after publication.
`--date-fallback` and `--date-from-version` are mutually exclusive. Explicit
and fallback date text is rendered verbatim; use `YYYY-MM-DD` for a conventional
changelog heading.

```bash
npx pm-changelog --release-version-from-package --date-from-version
npx pm-changelog --version 1.2.0 --date-fallback 2026-08-08
```

## Opt-in extras

These flags are strictly additive — omitting them keeps output byte-for-byte identical to the default:

```bash
npx pm-changelog --stdout --section-by type      # group by type/status/label instead of categories
npx pm-changelog --stdout --conventional         # Features / Bug Fixes / ... headings
npx pm-changelog --stdout --contributors         # per-release contributor list
npx pm-changelog --all-release-tags --limit 10   # keep only the newest N releases
npx pm-changelog --all-release-tags --since-version 2.0.0
npx pm-changelog --all-release-tags --changelog-json > changelog.json
npx pm-changelog --stdout --breaking-changes      # add a Breaking Changes section
npx pm-changelog --suggest-semver                 # print a suggested semver bump as JSON
npx pm-changelog --stdout --body-preview 80       # append first 80 chars of each item body
npx pm-changelog --stdout --emoji-prefix          # prefix headings with emoji (Added 🎉, Fixed 🐛, ...)
npx pm-changelog --stdout --include-metadata      # append type/status/priority/release/milestone per item
npx pm-changelog --stdout --json --explain        # emit selection diagnostics (counts + exclusion hints) for agents
npx pm-changelog --stdout --item-ref-style github  # link item IDs to public GitHub issues/PRs, not .agents/pm blobs
npx pm-changelog --stdout --item-ref-style label   # neutral (id) labels — safe for a published/public changelog
npx pm-changelog --stdout --respect-item-release    # honor each item's release field, not just closed_at
npx pm-changelog --stdout --exclude-tag changelog:ignore  # keep tagged items out of the changelog entirely
```

### Dependency updates: releases that ship only Dependabot bumps

A daily release fires whenever a commit landed since the last tag, and Dependabot merges are commits,
but sections are built from closed pm items. Without help, a dependency-only release gets an empty
notes file and no `CHANGELOG.md` section at all. `--dependency-updates` reads each release window's
commits from git (`git log --no-merges`) and adds a `### Dependencies` section, listed last, with one
bullet per Dependabot subject (`<type>(deps|deps-dev): bump …`). A window with no closed items but at
least one such commit still gets its version heading. Other commit subjects, including hand-written
`fix(deps): …` commits, are ignored: items remain the source of truth for everything else.

The range is exact: the commits between the previous release tag and this one (`--all-release-tags`
windows, or the tags `--since-previous-tag --until-release-tag` resolve), so a bump tagged into the
previous release never repeats. A release that is still pending reads up to `HEAD`. If the previous tag
is not an ancestor of this one (orphaned by a history rewrite), the window's time bounds select commits
within this release's own history instead. The bumps also appear in `--changelog-json` (as
`dependencies` on each release) and `--summary` (as `Dependencies` entries), and
`pm changelog export` accepts the flag too. It cannot be combined with `--group-by release` or
`milestone`, whose sections come from item metadata rather than git windows.

```bash
npx pm-changelog --stdout --since-previous-tag --until-release-tag --release-version-from-package \
  --item-url-base https://github.com/unbraind/pm-csv/blob/main/.agents/pm --dependency-updates
```

```markdown
## 2026.9.23 - 2026-09-23

### Dependencies

- Bump jscpd from 5.2.0 to 5.3.0 ([#129](https://github.com/unbraind/pm-csv/pull/129))
- Bump @types/node from 26.5.1 to 26.6.1 ([#132](https://github.com/unbraind/pm-csv/pull/132))
```

PR numbers link to `https://github.com/<owner>/<repo>/pull/<n>` only when `--item-url-base` is a
`https://github.com/<owner>/<repo>/…` URL; otherwise they print unlinked as `(#129)`. The flag is
opt-in because turning it on changes the generated `CHANGELOG.md` of any repository whose history
contains Dependabot merges, so each repository adopts it in one reviewed change.

`--item-ref-style` controls how pm item IDs render as references:

- `auto` (default) — an internal `.toon` blob link when `--item-url-base` is set, otherwise a neutral `(id)` label. Byte-for-byte identical to prior behavior.
- `label` — always a neutral `(id)` label, never a link. Use for changelogs published to a public registry, where `.agents/pm/...` blob URLs leak tracker structure and may 404.
- `toon` — force the internal `.toon` blob link (requires `--item-url-base`; falls back to a label when it is unset).
- `github` — render a public GitHub issue/PR link derived from the item's `gh:owner/repo#number` provenance tag (written by [pm-github](https://github.com/unbraind/pm-github)); items without a valid provenance tag fall back to a neutral label.

See [Usage](docs/usage.md#opt-in-enhancements) for details.

### Release attribution: work that shipped before its tracker was closed

By default an item lands in the release window that contains its **authoritative completion time** — `completed_at` (recorded by pm-cli ≥ 2026.7.29 separately from tracker close time). When `completed_at` is absent, generation falls back to `closed_at`, then `updated_at`, then `created_at`; those fallbacks are **inferred**, not authoritative. In multi-agent workflows an agent often ships the fix in one release and closes the tracker during a later one, which would date months-old work as new — and is why shipped-but-unclosed trackers pile up: closing them corrupts the changelog.

Record where the work actually landed and generation stops trusting `closed_at`:

```bash
pm update <id> --release 2026.6.1        # the release the fix actually shipped in
npx pm-changelog --stdout --release-version 2026.7.24 --respect-item-release
```

With `--respect-item-release`, an item that declares a `release` (top-level field or
`metadata.release`) is **pinned** to it: kept when it matches the generated version regardless of
timestamps, dropped otherwise (including from an unversioned `Unreleased` window — it already
shipped). Items without a declared release keep the plain time-window behavior, so output is
unchanged for workspaces that never set the field. `--all-release-tags` already honors the field and
is unaffected; the flag makes the single-window path (`--since-previous-tag --until-release-tag`,
`changelog:check`, release notes) agree with it. `--explain` reports what attribution dropped.

#### Inferred-attribution report

`--explain` also reports **attribution provenance**: how many visible items were placed in their
release window from the authoritative `completed_at` versus an inferred fallback (`closed_at`,
`updated_at`, or `created_at`), plus a bounded sample of the inferred item ids. This is how a
maintainer catches a shipped-but-late-closed item — one whose `completed_at` is missing so its
placement fell back to a `closed_at` recorded in a later release. Inspect the inferred sample, set
`completed_at` (or pin the item with `--release`), and regenerate.

### Excluding items

`--exclude-tag <tags>` (repeatable, comma-separated) omits items carrying any listed tag from every
generation path — an ignore convention for pm items that are legitimately tracked but are not
user-facing package changes (upstream issue mirrors, internal chores, superseded work):

```bash
pm update <id> --add-tags changelog:ignore
npx pm-changelog --stdout --exclude-tag changelog:ignore
```

Matching is case-insensitive and trims whitespace. The item stays in the tracker with its full
history — only the generated changelog skips it.

## Docs

- [Docs index](docs/README.md)
- [Usage](docs/usage.md)
- [Release and CI](docs/release.md)
- [Development](docs/development.md)
- [Changelog](CHANGELOG.md)

## Multi-agent merge safety

This repo tracks its project management in `.agents/pm/` and ships a committed `.gitattributes`
that maps those tracker artifacts to pm-cli's field-aware Git merge drivers, so concurrent-branch
tracker edits merge cleanly instead of hard-conflicting. The driver **definitions** live in
per-clone Git config; `npm install` / `npm ci` wires them automatically via the `prepare` script, `scripts/prepare-merge-driver.ts`: the launcher template pm-ops ships, copied unchanged, which a test compares byte for byte with the pinned template. It runs pm-ops's installer, which calls `pm merge install` when the `pm` CLI is on `PATH` and skips with a notice when it is not. A production install of a clone (`npm ci --omit=dev`) has no `pm-ops`, so the launcher skips with one notice, while a stale or broken `pm-ops` fails the install. Registry installs of this package never run `prepare`. Being Node-based, it behaves identically on POSIX shells and Windows `cmd.exe`. To (re)run manually: `npm run merge:install`.

After merging a branch that touched `.agents/pm/`, reconcile any residual history-hash drift with
**`pm merge reconcile`** (pm-cli ≥ 2026.7.22): preview with `pm merge reconcile --dry-run`, apply with
`pm merge reconcile --message "post-merge reconcile"`, then confirm with `pm validate`, which scans the
whole tracker and flags remaining history drift across **every** affected item (`pm merge reconcile`
itself lists each affected stream in its output; `pm history --verify <id>` spot-checks one item). The field-aware driver already unions every author's
content, so `reconcile` only re-greens the hash chain (no data loss) — see the authoritative
[pm-cli merge-safety guide](https://github.com/unbraind/pm-cli/blob/main/docs/MERGE_SAFETY.md). The
older blunt `pm history-repair --all` remains available as a lower-level primitive.
