# AGENTS.md — Agent & Contributor Reference

This file contains guidance for AI agents, LLMs, and human contributors working on `homeassistant-cli`.

---

## Versioning Scheme

This project uses **date-based versioning** with a daily release sequence:

```
YYYY.M.D[-N]
```

Where:
- `YYYY.M.D` — The ISO date of the release commit (no zero-padding; e.g. `2026.3.3`)
- `N` — The release sequence number for that same day on `master` (`2`, `3`, `4`, ...)
- If it is the first release of the day, omit `-N` entirely.

### Examples

| Releases that day (including release commit) | Release date | Version         |
|-----------------------------------------------|--------------|-----------------|
| 1                                             | 2025.12.31   | `2025.12.31`    |
| 2                                             | 2026.3.3     | `2026.3.3-2`    |
| 5                                             | 2026.3.3     | `2026.3.3-5`    |

### How to compute the version before committing

```bash
# Count release commits already made today on master, then add one for the new release commit
TODAY=$(date +%Y-%m-%d)
DATE=$(node -e 'const d=new Date(); console.log(`${d.getFullYear()}.${d.getMonth()+1}.${d.getDate()}`)')
TODAY_RELEASE_COUNT=$( (git log --first-parent --since="${TODAY} 00:00:00" --until="${TODAY} 23:59:59" --pretty=format:'%s' HEAD | rg -n "^chore\\(release\\): v${DATE}(-[0-9]+)?$" || true) | wc -l | tr -d ' ')
NEXT=$((TODAY_RELEASE_COUNT + 1))
if [ "$NEXT" -eq 1 ]; then
  echo "Version: ${DATE}"
else
  echo "Version: ${DATE}-${NEXT}"
fi
```

After running that, bump `package.json` and `src/cli.ts` to match, then commit.

> **Important:** The version in `package.json` and `src/cli.ts` must **always** match and reflect the release sequence number **for that date**.

### Version fields to update

1. `package.json` → `"version"` field
2. `src/cli.ts` → `.version("...")` call on the Commander program

---

## Repository Layout

```
homeassistant-cli/
├── src/
│   ├── cli.ts                  # Entry point — registers all commands
│   ├── index.ts                # Library export surface
│   ├── api/                    # One file per HA API domain
│   │   ├── base.ts             # HTTP client with retry + timeout
│   │   ├── client.ts           # Core REST endpoints
│   │   ├── websocket.ts        # WebSocket client
│   │   ├── registries.ts       # Registry reads (WS)
│   │   ├── registries-crud.ts  # Registry writes (WS)
│   │   └── ...                 # automation, tts, conversation, etc.
│   ├── commands/               # One file per command group (≤300 LOC each)
│   ├── config/                 # Config loader (settings/auth/data files)
│   ├── formatters/             # toon, json, yaml, table, markdown
│   ├── types/                  # Full TypeScript type definitions
│   └── utils/                  # exit, github-star, services helpers
├── tests/                      # Vitest unit tests (mirrors src/)
├── docs/                       # Full documentation
│   ├── INDEX.md                # Documentation index
│   ├── API.md                  # API reference
│   ├── LLM_INTEGRATION.md      # Agent/LLM integration guide
│   └── AGENT_OPTIMIZATION.md   # Agent-specific features
├── AGENTS.md                   # This file
├── README.md                   # User-facing README
└── CHANGELOG.md                # Release notes
```

---

## File Size Constraint

**No source file may exceed 300 lines of code** (excluding blank lines and comments).
If a file approaches this limit, split it into focused sub-modules.

---

## Technology Stack

| Tool          | Version  | Purpose                        |
|---------------|----------|--------------------------------|
| TypeScript    | 5.7+     | Language (strict mode)         |
| Bun           | latest   | Runtime + package manager      |
| Commander.js  | 12+      | CLI framework                  |
| undici        | 6+       | HTTP client                    |
| ws            | 8+       | WebSocket client               |
| Vitest        | 2+       | Test framework + coverage      |
| yaml          | 2+       | YAML serialization             |

> **Use `bun` instead of `npm`** for all package operations (`bun install`, `bun run build`, etc.).

---

## Development Workflow

```bash
# Install dependencies
bun install

# Build (TypeScript → dist/)
bun run build

# Type-check without emitting
bun run typecheck

# Run all unit tests
bun run test

# Run with coverage report
bun run test:coverage

# Run live E2E tests (requires real HA instance)
bun run test:e2e:live

# Start dev mode (no build step)
bun run dev -- status
```

---

## Configuration & Secrets

All secrets live **outside** the repository in `~/.hassio-cli/`:

```
~/.hassio-cli/
├── settings.json   # URL, format, timeout, read-only flag (no token)
├── auth.json       # Long-lived access token (0o600 permissions)
└── data.json       # Cached capability/registry data
```

**Never commit tokens or credentials.** Before every push, scan:

```bash
git diff --cached -U0 | rg -n '^\+.*(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{40,}|npm_[A-Za-z0-9]{36}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]{10,}\.[A-Za-z0-9._-]{10,}|-----BEGIN (RSA|OPENSSH|EC|DSA|PGP) PRIVATE KEY-----|_authToken\s*=)'
```

Environment variables override file config:

| Variable          | Meaning                        |
|-------------------|--------------------------------|
| `HASSIO_URL`      | Home Assistant base URL        |
| `HASSIO_TOKEN`    | Long-lived access token        |
| `HASSIO_TIMEOUT`  | Request timeout (ms)           |
| `HASSIO_READONLY` | Set to `true` to block writes  |
| `HASSIO_CONFIG`   | Path to settings.json          |

---

## Output Format Strategy

The **default output format is TOON** (Token-Oriented Object Notation), which uses ~40% fewer tokens than JSON — ideal for LLM/agent consumption.

Available formats: `toon` (default) | `json` | `json-compact` | `yaml` | `table` | `markdown`

```bash
hassio status                        # toon (default)
hassio status --format json          # pretty JSON
hassio status --format json-compact  # minified JSON (for piping)
hassio status --format yaml          # YAML
hassio status --format table         # ASCII table
hassio status --format markdown      # Markdown table
```

---

## Agent-Optimized Features

This CLI is designed for LLM/agent consumption. Key features:

### 1. Capability Discovery
```bash
hassio capabilities --agent-context      # Full one-shot bootstrap payload
hassio capabilities --agent-profile      # Stable execution profile
hassio capabilities --api-matrix         # Live endpoint availability matrix
hassio capabilities --redact-private     # Mask private fields in output
```

### 2. Batch Operations
```bash
# Execute multiple service calls in one command
hassio batch '[{"domain":"light","service":"turn_on","entity_id":"light.living_room"},{"domain":"switch","service":"turn_off","entity_id":"switch.fan"}]'
```

### 3. Advanced Entity Queries
```bash
hassio entities --domain light --state on --count
hassio query "domain=light AND state=on"
hassio discover                     # Categorized entity topology
hassio inspect light.living_room    # Deep entity inspection with history
hassio summary                      # Domain/state snapshot
```

### 4. Schema Export for LLMs
```bash
hassio schema                        # Export full CLI command schema as JSON
hassio schema --format json-compact  # Minified for token efficiency
```

### 5. Service Validation
```bash
hassio services --schema light turn_on   # Show JSON schema for a service call
hassio call-service light turn_on --data '{"entity_id":"light.x","brightness":128}'
```

---

## Test Coverage Target

- **Target: ≥90% statement coverage** across all `src/` files
- **Current**: Check with `bun run test:coverage`
- Tests live in `tests/` and mirror `src/` structure
- Use `vi.mock("undici")` to mock HTTP calls
- Use `vi.mock("ws")` to mock WebSocket connections

### Coverage improvement priorities (lowest coverage first)

1. `commands/conversation.ts` — command-level tests
2. `commands/registries.ts` — WebSocket mock tests
3. `commands/registry-crud.ts` — CRUD operation tests
4. `commands/statistics.ts` — statistics query tests
5. `commands/tts.ts` — TTS command tests
6. `api/websocket.ts` — WebSocket protocol tests
7. `api/media.ts` — Camera/media tests

---

## Adding New Commands

1. Create `src/api/<feature>.ts` — API client class (≤300 LOC)
2. Create `src/commands/<feature>.ts` — Commander command (≤300 LOC)
3. Export from `src/commands/index.ts`
4. Register in `src/cli.ts`
5. Create `tests/<feature>-command.test.ts`
6. Add to `docs/API.md` and `docs/INDEX.md`
7. Update `CHANGELOG.md`

---

## Commit Message Convention

```
<type>(<scope>): <short description>

Types: feat, fix, docs, test, refactor, chore
Scope: optional (e.g. api, commands, formatters, config)
```

Examples:
- `feat(commands): add timer management command`
- `test(coverage): add conversation and TTS command tests`
- `docs: update API.md with new endpoints`
- `fix(websocket): handle reconnection on auth failure`

---

## Release Checklist

Before tagging a release:

- [ ] `bun run build` — no errors
- [ ] `bun run typecheck` — no type errors
- [ ] `bun run test` — all tests pass
- [ ] `bun run test:coverage` — ≥90% statement coverage
- [ ] Scan for secrets: `git diff HEAD~1 -U0 | rg -n '^\+.*(ghp_|github_pat_|npm_|_authToken|-----BEGIN (RSA|OPENSSH|EC|DSA|PGP) PRIVATE KEY-----|eyJ[A-Za-z0-9_-]{10,}\.)'`
- [ ] Update `CHANGELOG.md` with release notes
- [ ] Update version in `package.json` and `src/cli.ts` to `YYYY.M.D[-N]`
- [ ] Commit with message: `chore(release): vYYYY.M.D[-N]`
- [ ] Push to `master`

---

## Home Assistant API Coverage

The CLI covers all major HA REST and WebSocket endpoints:

| Category           | Commands                                              |
|--------------------|-------------------------------------------------------|
| Core               | status, config, components, events, services          |
| States             | states, set-state, delete-state                       |
| Services           | call-service, fire-event, render-template             |
| History            | history, logbook, error-log                           |
| Registries         | registries, area-*/floor-*/label-* CRUD               |
| Automations        | automations, scripts, scenes                          |
| Voice              | conversation, ask, tts, say, pipeline                 |
| Lists              | todo, shopping-list, notifications                    |
| System             | persons, zones, analytics, backups, restart, stop     |
| Media              | calendars, calendar-events, camera                    |
| Search             | search, find                                          |
| Statistics         | statistics                                            |
| Config Entries     | config-entries                                        |
| Supervisor         | supervisor (addons, host, logs, api)                  |
| WebSocket          | websocket/ws (status, call, subscribe)                |
| Agent/LLM          | entities, batch, query, discover, inspect, summary    |
| Capabilities       | capabilities (agent-context, api-matrix, profile)     |
| Extended           | energy, weather, health, info                         |
| Notify             | notify                                                |

---

## LLM Agent Quick-Start

For an LLM agent bootstrapping against a new HA instance:

```bash
# 1. One-shot capability discovery
hassio capabilities --agent-context --redact-private --format json-compact

# 2. Get entity topology
hassio discover --format json-compact

# 3. Query specific domain
hassio entities --domain light --format json-compact

# 4. Execute action
hassio call-service light turn_on --data '{"entity_id":"light.living_room"}'

# 5. Verify action
hassio states --entity-id light.living_room --format json-compact
```
