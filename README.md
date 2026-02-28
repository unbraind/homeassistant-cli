# Home Assistant CLI

[![npm version](https://img.shields.io/npm/v/homeassistant-cli.svg)](https://www.npmjs.com/package/homeassistant-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Agent-optimized CLI tool for interacting with the Home Assistant API. Designed for LLM/agent usage with TOON format as the default output for maximum token efficiency.

## Features

- **Full Home Assistant API Coverage** - States, services, events, history, logbook, calendars, cameras, templates, and more
- **Agent-Optimized Output** - Default TOON format for ~40% token reduction vs JSON
- **Multiple Output Formats** - TOON, JSON, JSON-compact, YAML, and table
- **Flexible Configuration** - Environment variables, config file, or CLI options
- **Full TypeScript Support** - Complete type safety throughout
- **Comprehensive Testing** - 96+ tests with high coverage

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
git clone https://github.com/your-org/homeassistant-cli.git
cd homeassistant-cli
bun install
bun run build
```

## Quick Start

1. **Get your token**: In Home Assistant, go to Profile > Long-Lived Access Tokens > Create Token

2. **Configure authentication**:

   ```bash
   # Option 1: Config file (recommended)
   hassio config-set --url "http://homeassistant.local:8123" --token "your-token"

   # Option 2: Environment variables
   export HASSIO_URL="http://homeassistant.local:8123"
   export HASSIO_TOKEN="your-token"
   ```

3. **Start using**:

   ```bash
   # Check connection
   hassio status

   # Get all entity states
   hassio states

   # Control a light
   hassio call-service light turn_on -e light.living_room
   ```

## Output Formats

### TOON (Default)

Token-efficient format designed for LLMs - ~40% fewer tokens than JSON:

```
states[2]{entity_id,state,last_changed,attributes}:
  light.living_room,on,2024-01-01T00:00:00Z,"{""brightness"":255}"
  switch.kitchen,off,2024-01-01T01:00:00Z,"{}"
```

### Other Formats

```bash
hassio states --format json          # Pretty JSON
hassio states --format json-compact  # Minified JSON
hassio states --format yaml          # YAML
hassio states --format table         # ASCII table
```

## Commands

| Command | Description |
|---------|-------------|
| `status` | Check API status |
| `config` | Get HA configuration |
| `components` | List loaded components |
| `events` | List available events |
| `services` | List available services |
| `states [entity]` | Get entity states |
| `set-state <id> <state>` | Set entity state |
| `delete-state <id>` | Delete entity state |
| `call-service <domain> <service>` | Call a service |
| `fire-event <type>` | Fire an event |
| `render-template <template>` | Render Jinja2 template |
| `history -e <entities>` | Get state history |
| `logbook` | Get logbook entries |
| `error-log` | Get error log |
| `calendars` | List calendars |
| `calendar-events <id>` | Get calendar events |
| `camera <id>` | Get camera image |
| `check-config` | Validate HA config |

## Examples

```bash
# Get specific entity
hassio states sensor.temperature

# Turn on light with options
hassio call-service light turn_on -e light.living_room -d '{"brightness":200}'

# Get history for time range
hassio history -e sensor.temperature -s "2024-01-01T00:00:00Z" -t "2024-01-02T00:00:00Z"

# Render a template
hassio render-template "Temperature: {{ states('sensor.temperature') }}°C"

# Get calendar events
hassio calendar-events calendar.home -s "2024-01-01T00:00:00Z" -e "2024-01-31T23:59:59Z"
```

## Configuration

### Environment Variables

| Variable | Description |
|----------|-------------|
| `HASSIO_URL` | Home Assistant URL |
| `HASSIO_TOKEN` | Long-lived access token |
| `HASSIO_FORMAT` | Output format (default: toon) |
| `HASSIO_TIMEOUT` | Request timeout in ms (default: 30000) |

### Config File

```bash
# Set configuration
hassio config-set --url "http://homeassistant.local:8123" --token "your-token"

# View current config
hassio config-get

# Show config path
hassio config-path
```

Config file location: `~/.hassio-cli/settings.json`

## Development

> **Note:** This project uses [Bun](https://bun.sh) as the primary package manager and runtime. Please use Bun instead of npm.

```bash
# Install Bun (if not already installed)
curl -fsSL https://bun.sh/install | bash

# Install dependencies
bun install

# Run in dev mode
bun run dev -- status

# Run tests
bun test

# Run tests with coverage
bun run test:coverage

# Build
bun run build

# Type check
bun run typecheck
```

## Documentation

- [API Reference](docs/API.md) - Complete command documentation
- [Documentation Index](docs/INDEX.md) - All documentation

## Security

- Never commit tokens to version control
- Use environment variables or config files for credentials
- Config file is excluded from git via `.gitignore`

## License

MIT
