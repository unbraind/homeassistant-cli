# Home Assistant CLI

[![npm version](https://img.shields.io/npm/v/homeassistant-cli.svg)](https://www.npmjs.com/package/homeassistant-cli)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

Agent-optimized CLI tool for interacting with the Home Assistant API. Designed for LLM/agent usage with TOON format as the default output for maximum token efficiency.

## Features

- **Full Home Assistant API Coverage** - States, services, events, history, logbook, calendars, cameras, templates, and more
- **Agent-Optimized Output** - Default TOON format for ~40% token reduction vs JSON
- **Multiple Output Formats** - TOON, JSON, JSON-compact, YAML, and table
- **Interactive Setup Wizard** - Easy first-time configuration
- **Flexible Configuration** - Environment variables, config file, or CLI options
- **LLM-Optimized Commands** - Query language, batch operations, entity discovery
- **Full TypeScript Support** - Complete type safety throughout
- **Comprehensive Testing** - High test coverage

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

### Option 1: Interactive Setup (Recommended)

```bash
# Run the setup wizard
hassio settings wizard

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
hassio settings set --url "http://homeassistant.local:8123" --token "your-token"

# Validate
hassio settings validate
```

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
```

## Core Commands

### Basic Operations

```bash
# Check connection
hassio status

# Get entity states
hassio states                    # All entities
hassio states light.living_room  # Specific entity

# Control devices
hassio call-service light turn_on -e light.living_room
hassio call-service light turn_on -e light.living_room -d '{"brightness":200}'

# Call services
hassio call-service climate set_temperature -e climate.living_room -d '{"temperature":22}'
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
```

### Query Language

```bash
# Query with expressions
hassio query "domain:light state:on"
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
# Inspect entity
hassio inspect light.living_room

# With history
hassio inspect sensor.temperature --history
```

## Configuration

### Priority Order

Configuration is loaded in this order (later overrides earlier):

1. Config file (`~/.hassio-cli/settings.json`)
2. Environment variables
3. CLI options

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HASSIO_URL` | Home Assistant URL | - |
| `HASSIO_TOKEN` | Long-lived access token | - |
| `HASSIO_FORMAT` | Output format | `toon` |
| `HASSIO_TIMEOUT` | Request timeout (ms) | `30000` |

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

## Development

> **Note:** This project uses [Bun](https://bun.sh) as the primary package manager and runtime.

```bash
# Install dependencies
bun install

# Run in dev mode
bun run dev -- status

# Run tests
bun test
bun run test:coverage

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
- Use environment variables for CI/CD pipelines

## License

MIT
