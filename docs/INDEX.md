# Documentation Index

Complete documentation for the Home Assistant CLI tool.

## Table of Contents

- [README](./README.md) - Installation and quick start
- [API Reference](./API.md) - Complete command reference
- [LLM Integration](./LLM_INTEGRATION.md) - Agent/LLM optimized features

## Quick Start

```bash
# Install
bun install -g homeassistant-cli

# Setup (interactive wizard)
hassio settings wizard

# Or initialize from environment variables
hassio settings init

# Test connection
hassio status

# Validate configuration
hassio settings validate
```

## Configuration

Configuration is loaded in priority order (later overrides earlier):

1. Config file (`~/.hassio-cli/settings.json`)
2. Environment variables (`HASSIO_URL`, `HASSIO_TOKEN`, etc.)
3. CLI options (`--url`, `--token`, `--format`)

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HASSIO_URL` | Home Assistant URL | - |
| `HASSIO_TOKEN` | Long-lived access token | - |
| `HASSIO_FORMAT` | Output format | `toon` |
| `HASSIO_TIMEOUT` | Request timeout (ms) | `30000` |
| `HASSIO_CONFIG` | Config file path | `~/.hassio-cli/settings.json` |

### Configuration Commands

| Command | Description |
|---------|-------------|
| `settings wizard` | Interactive setup wizard |
| `settings init` | Initialize from environment variables |
| `settings validate` | Validate configuration and test connection |
| `settings set` | Set configuration options |
| `settings get` | View current configuration (token masked) |
| `settings path` | Show configuration file path |

## Output Formats

| Format | Description | Best For |
|--------|-------------|----------|
| **TOON** (default) | Token-efficient structured format | LLMs, agents, automation |
| JSON | Pretty-printed JSON | Human readability |
| JSON-compact | Minified JSON | Data transmission |
| YAML | YAML format | Configuration files |
| Table | ASCII table | Terminal display |

## Command Categories

### Core API Commands

| Command | Description |
|---------|-------------|
| `status` | Check API status |
| `config` | Get Home Assistant configuration |
| `components` | List loaded components |
| `events` | List available events |
| `services` | List available services |

### State Management

| Command | Description |
|---------|-------------|
| `states [entity-id]` | Get entity states (all or specific) |
| `set-state <entity-id> <state>` | Set/update entity state |
| `delete-state <entity-id>` | Delete entity state |

### Service & Event Operations

| Command | Description |
|---------|-------------|
| `call-service <domain> <service>` | Call a service |
| `fire-event <event-type>` | Fire an event |
| `render-template <template>` | Render a template |
| `handle-intent <name>` | Handle an intent |

### History & Logs

| Command | Description |
|---------|-------------|
| `history -e <entities>` | Get entity history |
| `logbook` | Get logbook entries |
| `error-log` | Get error log |

### Calendar & Media

| Command | Description |
|---------|-------------|
| `calendars` | List calendars |
| `calendar-events <entity-id>` | Get calendar events |
| `camera <entity-id>` | Get camera image |

### LLM/Agent Optimized Commands

| Command | Description |
|---------|-------------|
| `entities` | List/filter entities with advanced options |
| `discover` | Discover and categorize all entities |
| `query <expression>` | Query using simple expressions |
| `batch` | Execute service calls in batch |
| `inspect <entity-id>` | Deep inspect entity with history |

## LLM/Agent Features

The CLI is optimized for use by LLMs and AI agents:

- **TOON Format**: Default output uses TOON for ~40% token reduction
- **Query Language**: Simple expression syntax for filtering
- **Batch Operations**: Execute multiple operations efficiently
- **Structured Output**: Predictable, parseable formats
- **Entity Discovery**: Comprehensive entity exploration

See [LLM Integration Guide](./LLM_INTEGRATION.md) for detailed examples.

## Project Structure

```
homeassistant-cli/
├── src/
│   ├── api/           # Home Assistant API client
│   ├── commands/      # CLI command implementations
│   │   ├── core.ts    # Core API commands
│   │   ├── services.ts # Service/event commands
│   │   ├── history.ts # History/log commands
│   │   ├── media.ts   # Calendar/camera commands
│   │   ├── cli-config.ts # Configuration commands
│   │   └── llm.ts     # LLM-optimized commands
│   ├── config/        # Configuration management
│   ├── formatters/    # Output formatters
│   ├── types/         # TypeScript definitions
│   ├── cli.ts         # CLI entry point
│   └── index.ts       # Library exports
├── tests/             # Test files
├── docs/              # Documentation
└── dist/              # Compiled output
```

## Development

### Requirements

- [Bun](https://bun.sh) - Primary runtime
- Node.js 20+ - For distribution

### Commands

```bash
# Install dependencies
bun install

# Build
bun run build

# Run tests
bun test

# Run tests with coverage
bun run test:coverage

# Type check
bun run typecheck

# Development mode
bun run dev -- <command>
```

## Security

- Never commit tokens to version control
- Config file is excluded from git via `.gitignore`
- Use environment variables in CI/CD
- Token is masked in configuration display

## Related Resources

- [Home Assistant Documentation](https://www.home-assistant.io/docs/)
- [Home Assistant REST API](https://developers.home-assistant.io/docs/api/rest/)
- [TOON Format Specification](https://github.com/toon-format/toon)
