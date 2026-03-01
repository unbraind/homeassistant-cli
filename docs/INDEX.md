# Documentation Index

Complete documentation for the Home Assistant CLI tool.

## Table of Contents

- [README](../README.md) - Installation and quick start
- [API Reference](./API.md) - Complete command reference
- [LLM Integration Guide](./LLM_INTEGRATION.md) - Agent/LLM optimized features

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
| `check-config` | Validate configuration |

### History, Logs & Statistics

| Command | Description |
|---------|-------------|
| `history -e <entities>` | Get entity history |
| `logbook` | Get logbook entries |
| `error-log` | Get error log |
| `statistics` | Query historical statistics |

### Calendar & Media

| Command | Description |
|---------|-------------|
| `calendars` | List calendars |
| `calendar-events <entity-id>` | Get calendar events |
| `camera <entity-id>` | Get camera image |

### Registry Commands

| Command | Description |
|---------|-------------|
| `registries --entities` | Entity registry |
| `registries --devices` | Device registry |
| `registries --areas` | Area registry |
| `registries --floors` | Floor registry |
| `registries --labels` | Label registry |
| `registries --categories` | Category registry |

### List Management

| Command | Description |
|---------|-------------|
| `todo` | Manage todo lists |
| `shopping-list` | Manage shopping list |
| `notifications` | Persistent notifications |

### System Commands

| Command | Description |
|---------|-------------|
| `persons` | List persons (from entity states) |
| `zones` | List zones (from entity states) |
| `analytics` | System analytics |
| `backups` | Backup management (via service calls) |

### LLM/Agent Optimized Commands

| Command | Description |
|---------|-------------|
| `entities` | List/filter entities with advanced options |
| `discover` | Discover and categorize all entities |
| `query <expression>` | Query using simple expressions |
| `batch` | Execute service calls in batch |
| `inspect <entity-id>` | Deep inspect entity with history |
| `search <query>` | Search entities via API |
| `find <pattern>` | Quick search by name/ID pattern |
| `ask <text>` | Ask voice assistant a question |

### Conversation & Voice Commands

| Command | Description |
|---------|-------------|
| `conversation` | Interact with voice assistants |
| `ask <text>` | Shortcut for conversation (ask question) |
| `tts` | Text-to-Speech operations |
| `say <message>` | Speak text through media player |

### Automation Commands

| Command | Description |
|---------|-------------|
| `automations` | Manage automations (list, trigger, toggle, reload) |
| `scripts` | Manage scripts (list, run, reload) |
| `scenes` | Manage scenes (list, apply, reload) |

### LLM/Agent Helper Commands

| Command | Description |
|---------|-------------|
| `schema` | Export CLI schema for LLM consumption |
| `action <intent>` | Intelligent action helper for LLMs |

### Extended Commands

| Command | Description |
|---------|-------------|
| `energy` | Get energy dashboard preferences |
| `weather [entity-id]` | Get weather forecasts |
| `health` | Get system health information |
| `info` | Get comprehensive system summary |

## LLM/Agent Features

The CLI is optimized for use by LLMs and AI agents:

- **TOON Format**: Default output uses TOON for ~40% token reduction
- **Query Language**: Simple expression syntax for filtering
- **Batch Operations**: Execute multiple operations efficiently
- **Structured Output**: Predictable, parseable formats
- **Entity Discovery**: Comprehensive entity exploration
- **Registry Access**: Query entity/device/area metadata
- **Statistics**: Historical data and analytics
- **List Management**: Todo lists, shopping list, notifications

See [LLM Integration Guide](./LLM_INTEGRATION.md) for detailed examples.

## API Coverage

### Core REST API
✅ Status and configuration  
✅ Entity states (GET/POST/DELETE)  
✅ Services and events  
✅ History and logbook  
✅ Templates and intents  
✅ Calendars and cameras  

### Extended API
✅ Entity Registry  
✅ Device Registry  
✅ Area Registry  
✅ Floor Registry  
✅ Label Registry  
✅ Category Registry  
✅ Statistics API  
✅ Todo Lists  
✅ Shopping List  
✅ Persistent Notifications  
✅ Persons  
✅ Zones  
✅ Analytics  
✅ Backups  
✅ Automations  
✅ Scripts  
✅ Scenes  
✅ LLM Schema Export  
✅ Intelligent Action Helper  

## Project Structure

```
homeassistant-cli/
├── src/
│   ├── api/              # Home Assistant API clients
│   │   ├── client.ts     # Core API client
│   │   ├── registries.ts # Registry API client
│   │   ├── statistics.ts # Statistics API client
│   │   ├── lists.ts      # Lists API client
│   │   └── system.ts     # System API client
│   ├── commands/         # CLI command implementations
│   │   ├── core.ts       # Core API commands
│   │   ├── services.ts   # Service/event commands
│   │   ├── history.ts    # History/log commands
│   │   ├── media.ts      # Calendar/camera commands
│   │   ├── cli-config.ts # Configuration commands
│   │   ├── llm.ts        # LLM-optimized commands
│   │   ├── registries.ts # Registry commands
│   │   ├── statistics.ts # Statistics commands
│   │   ├── lists.ts      # List commands
│   │   └── system.ts     # System commands
│   ├── config/           # Configuration management
│   ├── formatters/       # Output formatters
│   ├── types/            # TypeScript definitions
│   ├── cli.ts            # CLI entry point
│   └── index.ts          # Library exports
├── tests/                # Test files
├── docs/                 # Documentation
└── dist/                 # Compiled output
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

### Test Coverage

Current coverage: **94.42%** with 125 tests passing across 10 test files.

## Security

- Never commit tokens to version control
- Config file is excluded from git via `.gitignore`
- Use environment variables in CI/CD
- Token is masked in configuration display
- Config file should have 600 permissions (owner read/write only)

## Related Resources

- [Home Assistant Documentation](https://www.home-assistant.io/docs/)
- [Home Assistant REST API](https://developers.home-assistant.io/docs/api/rest/)
- [TOON Format Specification](https://github.com/toon-format/toon)
