# Home Assistant CLI

[![npm version](https://img.shields.io/npm/v/homeassistant-cli.svg)](https://www.npmjs.com/package/homeassistant-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Agent-optimized CLI tool for Home Assistant with token-efficient output. Default TOON format provides ~40% token reduction vs JSON. Optimized for LLM/agent consumption with structured, minimal output.

## Features

- **Broad Home Assistant API Coverage** - States, services, events, history, logbook, calendars, cameras, templates, and more
- **Device Control Commands** - Dedicated `light`, `switch`, `climate`, `cover`, `lock`, `fan` commands with full parameter support
- **Token-Efficient Output** - Default TOON format saves ~40% tokens vs JSON, no emojis/decorations
- **Multiple Output Formats** - TOON, JSON, JSON-compact, YAML, table, and markdown
- **Interactive Setup Wizard** - Easy first-time configuration
- **Flexible Configuration** - Environment variables, secure global config files (`settings/auth/data`), custom `--config` path, or CLI options
- **Read-Only Safety Mode** - Block all state-changing API calls with `--read-only` or `HASSIO_READONLY=true`
- **GitHub Star Prompt** - Setup/settings commands can prompt to star the repo via `gh` (when available and logged in)
- **Config Entry Management** - List/filter/count/delete Home Assistant config entries with safety confirmation
- **LLM-Optimized Commands** - Query language, batch operations, entity discovery
- **Capability Profiling for Agents** - `hassio capabilities` probes runtime API support and caches results
- **Agent Execution Planning** - `hassio capabilities --agent-plan` returns recommended and avoid command sets
- **Agent Execution Profile** - `hassio capabilities --agent-profile` returns a stable execution profile and fast-path commands
- **One-Shot Agent Context** - `hassio capabilities --agent-context --redact-private` returns summary + plan + profile safely
- **Fast Topology Snapshot** - `hassio summary` returns domain/state counts for quick agent planning
- **Search Endpoint Fallback** - Falls back to local entity-state search when `/api/search` is unavailable
- **Service Schema Intelligence** - Supports modern object-style `/api/services` payloads with filter/flat/count modes
- **WebSocket API Coverage** - Generic `websocket`/`ws` passthrough plus `websocket status` metadata
- **Supervisor API Coverage** - Generic `supervisor api` passthrough + common shortcuts (addons, host, logs)
- **Full TypeScript Support** - Complete type safety throughout
- **Comprehensive Testing** - 975 tests passing, 95.93% statement coverage

## Installation

### Using Bun (Recommended)

```bash
bun install -g homeassistant-cli
```

### Using npx (No Installation)

```bash
npx homeassistant-cli --help
```

### From Source

```bash
git clone https://github.com/unbraind/homeassistant-cli.git
cd homeassistant-cli
bun install
bun run build
```

## Quick Start

### Option 1: Interactive Setup (Recommended)

```bash
# Run the setup wizard
hassio settings wizard
hassio settings setup   # alias

# Agent/CI setup (no prompts)
hassio settings wizard --non-interactive \
  --ha-url "http://homeassistant.local:8123" \
  --ha-token "your-long-lived-access-token" \
  --skip-test

# Test connection
hassio status
```

### Option 2: Environment Variables

```bash
export HASSIO_URL="http://homeassistant.local:8123"
export HASSIO_TOKEN="your-long-lived-access-token"

# Initialize from environment
hassio settings init

# Or use directly without saving
hassio status
```

### Option 3: Manual Configuration

```bash
# Set configuration
hassio settings set --ha-url "http://192.168.1.100:8123" --ha-token "your-token"

# Set individual options
hassio settings set --default-format json
hassio settings set --default-timeout 60000
hassio settings set --read-only true

# Validate
hassio settings validate
```

## Configuration Management

```bash
# View current configuration (token masked)
hassio settings get
hassio settings get --runtime-summary

# Enable or disable read-only safety mode
hassio settings set --read-only true
hassio settings set --read-only false

# View configuration with token (be careful!)
hassio settings get --show-token

# Include full runtime cache details (can be large)
hassio settings get --include-runtime

# List all configuration options
hassio settings list

# Show settings/auth/data file paths
hassio settings path

# Run diagnostics (API, output validation, supervisor probe)
hassio settings doctor

# Probe runtime capabilities for this specific HA instance
hassio capabilities --refresh
hassio capabilities --count
hassio capabilities --api-matrix
hassio capabilities --agent-plan
hassio capabilities --agent-profile
hassio capabilities --agent-context --redact-private --format json

# Reset all configuration
hassio settings reset --force
```

If `gh` is installed and authenticated, `hassio settings ...` commands will ask you to star `unbraind/homeassistant-cli` until it is starred.

## Global Flags and Help

Global flags are supported for all commands:

```bash
-u, --url <url>
-t, --token <token>
-f, --format <format>
    --timeout <ms>
    --read-only
-c, --config <path>
```

Use `hassio <command> --help` to see command-specific options plus the global flag section.

## Getting Your Token

1. Open Home Assistant in your browser
2. Click your profile (bottom left)
3. Scroll to "Long-Lived Access Tokens"
4. Click "Create Token"
5. Copy the token immediately (it won't be shown again)

## Output Formats

### TOON (Default) - Optimized for LLMs

Token-efficient format - ~40% fewer tokens than JSON:

```
states[2]{entity_id,state,last_changed,attributes}:
  light.living_room,on,2024-01-01T00:00:00Z,"{ ""brightness"":255}"
  switch.kitchen,off,2024-01-01T01:00:00Z,"{}"
```

### Other Formats

```bash
hassio states --format json          # Pretty JSON
hassio states --format json-compact  # Minified JSON
hassio states --format yaml          # YAML
hassio states --format table         # ASCII table
hassio states --format markdown      # Markdown table
```

## Core Commands

### Basic Operations

```bash
# Check connection
hassio status

# Get entity states
hassio states                    # All entities
hassio states light.living_room  # Specific entity
hassio states --count            # Count only

# Control devices
hassio call-service light turn_on -e light.living_room
hassio call-service light turn_on -e light.living_room -d '{"brightness":200}'

# Call services
hassio call-service climate set_temperature -e climate.living_room -d '{"temperature":22}'

# Explore service schema (agent-friendly)
hassio services --count
hassio services --domain light --flat
```

### History & Logs

```bash
# Get history
hassio history -e sensor.temperature
hassio history -e sensor.temp1,sensor.temp2 -s "2024-01-01T00:00:00Z"

# View logs
hassio logbook
hassio error-log
```

### Configuration

```bash
# Validate HA configuration
hassio check-config

# Render templates
hassio render-template "{{ states('sensor.temperature') }}"
```

## LLM-Optimized Commands

### Entity Discovery

```bash
# Discover all entities
hassio discover

# Get domain statistics
hassio discover --domains
hassio discover --domains --limit 10

# Find unavailable entities
hassio discover --unavailable
```

### Entity Filtering

```bash
# Filter by domain
hassio entities -d light

# Filter by state
hassio entities -d light -s on

# Filter by pattern
hassio entities -p living_room

# Get count only
hassio entities --count

# Group by domain
hassio entities --domains

# Limit returned rows
hassio entities -d sensor --limit 25
```

### Query Language

```bash
# Query with expressions
hassio query "domain:light state:on"
hassio query "domain:light state:on" --limit 20
hassio query "domain:sensor attributes:unit_of_measurement=°C"
hassio query "name:living" --summary
```

### Batch Operations

```bash
# Turn off multiple lights
hassio batch -d light -s turn_off -e light.living_room,light.kitchen,light.bedroom

# Set brightness on multiple lights
hassio batch -d light -s turn_on -e light.living_room,light.kitchen --data '{"brightness":200}'
```

### Deep Inspection

```bash
# One-shot environment summary for agents
hassio summary
hassio summary --top-states 15
hassio summary --full-states

# Inspect entity
hassio inspect light.living_room

# With history
hassio inspect sensor.temperature --history
```

## Configuration

### Priority Order

Configuration is loaded in this order (later overrides earlier):

1. Config files (`~/.hassio-cli/settings.json`, `~/.hassio-cli/auth.json`, `~/.hassio-cli/data.json`)
2. Environment variables
3. CLI options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HASSIO_URL` | Home Assistant URL | - |
| `HASSIO_TOKEN` | Long-lived access token | - |
| `HASSIO_FORMAT` | Output format | `toon` |
| `HASSIO_TIMEOUT` | Request timeout (ms) | `30000` |
| `HASSIO_READONLY` | Block write operations (`true`/`false`) | `false` |
| `HASSIO_CONFIG` | Custom config file path | `~/.hassio-cli/settings.json` |

### Settings Commands

```bash
# Interactive wizard
hassio settings wizard

# Initialize from environment
hassio settings init

# Validate configuration
hassio settings validate

# Set options
hassio settings set --url "http://..." --token "..."

# View configuration (token masked)
hassio settings get

# Show config path
hassio settings path
```

Settings files are written with `0600` permissions (owner read/write only).

## Examples

### Home Automation Workflows

```bash
# Turn on all lights in living room
hassio query "domain:light name:living state:off"
hassio batch -d light -s turn_on -e light.living_room_ceiling,light.living_room_lamp

# Check temperature sensors
hassio query "domain:sensor attributes:unit_of_measurement=°C" --summary
hassio query "domain:sensor attributes:unit_of_measurement=°C"

# Find and fix unavailable entities
hassio discover --unavailable
```

### Calendar & Media

```bash
# List calendars
hassio calendars

# Get events
hassio calendar-events calendar.home \
    -s "2024-01-01T00:00:00Z" \
    -e "2024-01-31T23:59:59Z"

# Get camera snapshot
hassio camera camera.front_door -o snapshot.jpg
```

### Voice Assistant & Conversation

```bash
# Ask a question
hassio ask "what time is it"

# Control devices via voice
hassio ask "turn on living room light"

# List conversation agents
hassio conversation --agents

# Multi-turn conversation
hassio conversation -t "turn on lights" -c "conv-123"
```

### Text-to-Speech

```bash
# List TTS engines
hassio tts --engines

# Speak a message
hassio say "The front door is open" -p media_player.kitchen

# Use specific engine
hassio say "Welcome home" -p media_player.living_room -e tts.cloud
```

### Search

```bash
# Search entities
hassio search "living room"
hassio search "living room" --limit 25

# Quick local search
hassio search "temp" --quick

# Search with filters
hassio search "sensor" -d sensor --count
```

### WebSocket & Supervisor

```bash
# WebSocket connectivity/auth check
hassio websocket --connect-test

# WebSocket status metadata
hassio websocket status

# Generic WS command
hassio ws call -T get_states

# Target helper: resolve target selectors to concrete IDs
hassio ws target extract --area-id kitchen

# Target helper: get available services for a target
hassio ws target services --entity-id light.kitchen

# Target helper: resolve and fetch related registries
hassio ws target related --label-id lighting

# Capture WS events for 10s
hassio ws subscribe --event-type state_changed --wait-ms 10000 --max-events 20

# Supervisor shortcuts
hassio supervisor addons --list
hassio supervisor logs

# Full supervisor endpoint passthrough
hassio supervisor api -m GET -p /addons
hassio supervisor api -m GET --endpoint /addons

# Config entries (integration instances)
hassio config-entries --count
hassio config-entries --domain mqtt
hassio config-entries --delete <entry-id> --yes
```

If supervisor commands return `401` or `404`, the CLI now reports actionable guidance:
- `401`: token/permissions issue for supervisor access
- `404`: installation does not expose supervisor endpoints (common on Core/Container)

## Development

> **Note:** This project uses [Bun](https://bun.sh) as the primary package manager and runtime.

```bash
# Install dependencies
bun install

# Run in dev mode
bun run dev -- status

# Run tests
bun run test
bun run test:coverage
bun run test:e2e:live   # Requires HASSIO_URL + HASSIO_TOKEN

# Build
bun run build

# Type check
bun run typecheck

# Lint
bun run lint
```

## Documentation

- [API Reference](docs/API.md) - Complete command reference
- [Documentation Index](docs/INDEX.md) - All documentation
- [LLM Integration](docs/LLM_INTEGRATION.md) - Agent/LLM guide

## Security

- **Never commit tokens** to version control
- Config file is excluded from git via `.gitignore`
- Token is masked in `settings get` output
- Config file is written with `0600` permissions
- Use environment variables for CI/CD pipelines

## License

MIT
