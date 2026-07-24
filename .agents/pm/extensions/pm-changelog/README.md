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

`--item-ref-style` controls how pm item IDs render as references:

- `auto` (default) — an internal `.toon` blob link when `--item-url-base` is set, otherwise a neutral `(id)` label. Byte-for-byte identical to prior behavior.
- `label` — always a neutral `(id)` label, never a link. Use for changelogs published to a public registry, where `.agents/pm/...` blob URLs leak tracker structure and may 404.
- `toon` — force the internal `.toon` blob link (requires `--item-url-base`; falls back to a label when it is unset).
- `github` — render a public GitHub issue/PR link derived from the item's `gh:owner/repo#number` provenance tag (written by [pm-github](https://github.com/unbraind/pm-github)); items without a valid provenance tag fall back to a neutral label.

See [Usage](docs/usage.md#opt-in-enhancements) for details.

### Release attribution: work that shipped before its tracker was closed

By default an item lands in the release window that contains its `closed_at` (falling back to
`updated_at`/`created_at`). In multi-agent workflows an agent often ships the fix in one release and
closes the tracker during a later one, which would date months-old work as new — and is why
shipped-but-unclosed trackers pile up: closing them corrupts the changelog.

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
per-clone Git config; `npm install` / `npm ci` wires them automatically via the `prepare` script (a portable Node guard, `scripts/prepare-merge-driver.mjs`: it runs
`pm merge install` only when the `pm` CLI is on `PATH`, and no-ops cleanly otherwise so
production / `--omit=dev` installs are not broken; being Node-based it behaves identically
on POSIX shells and Windows `cmd.exe`). To (re)run manually: `npm run merge:install`.

After merging a branch that touched `.agents/pm/`, reconcile any residual history-hash drift with
**`pm merge reconcile`** (pm-cli ≥ 2026.7.22): preview with `pm merge reconcile --dry-run`, apply with
`pm merge reconcile --message "post-merge reconcile"`, then confirm with `pm validate`, which scans the
whole tracker and flags remaining history drift across **every** affected item (`pm merge reconcile`
itself lists each affected stream in its output; `pm history --verify <id>` spot-checks one item). The field-aware driver already unions every author's
content, so `reconcile` only re-greens the hash chain (no data loss) — see the authoritative
[pm-cli merge-safety guide](https://github.com/unbraind/pm-cli/blob/main/docs/MERGE_SAFETY.md). The
older blunt `pm history-repair --all` remains available as a lower-level primitive.
