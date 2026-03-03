# Documentation Index

Complete documentation for the Home Assistant CLI tool.

## Table of Contents

- [README](../README.md) - Installation and quick start
- [API Reference](./API.md) - Complete command reference
- [LLM Integration Guide](./LLM_INTEGRATION.md) - Agent/LLM optimized features
- [API Research (2026-03-01)](./API_RESEARCH_2026-03-01.md) - Live endpoint findings and CLI enhancements
- [API Research (2026-03-02)](./API_RESEARCH_2026-03-02.md) - Updated live validation and diagnostics improvements
- [API Research (2026-03-03)](./API_RESEARCH_2026-03-03.md) - Live capability matrix, agent-context output, and private-field redaction
- [Live E2E Testing](./E2E_LIVE_TESTING.md) - End-to-end smoke testing against a real Home Assistant instance
- [Enhancement Summary (2026-03-03)](./ENHANCEMENT_SUMMARY_2026-03-03.md) - Comprehensive verification and enhancement report

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

1. Config files (`~/.hassio-cli/settings.json`, `~/.hassio-cli/auth.json`, `~/.hassio-cli/data.json`)
2. Environment variables (`HASSIO_URL`, `HASSIO_TOKEN`, etc.)
3. CLI options (`--url`, `--token`, `--format`)

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HASSIO_URL` | Home Assistant URL | - |
| `HASSIO_TOKEN` | Long-lived access token | - |
| `HASSIO_FORMAT` | Output format | `toon` |
| `HASSIO_TIMEOUT` | Request timeout (ms) | `30000` |
| `HASSIO_READONLY` | Block write operations (`true`/`false`) | `false` |
| `HASSIO_CONFIG` | Config file path | `~/.hassio-cli/settings.json` |

### Configuration Commands

| Command | Description |
|---------|-------------|
| `settings wizard` | Interactive setup wizard |
| `settings init` | Initialize from environment variables |
| `settings validate` | Validate configuration and test connection |
| `settings doctor` | Agent-friendly diagnostics (API, output formats, supervisor probe) |
| `settings set` | Set configuration options |
| `settings get` | View current configuration (token masked, runtime summary by default) |
| `settings path` | Show settings/auth/data file paths |

`settings` commands may prompt to star `https://github.com/unbraind/homeassistant-cli` when `gh` is installed, authenticated, and the repo is not starred yet.

## Output Formats

| Format | Description | Best For |
|--------|-------------|----------|
| **TOON** (default) | Token-efficient structured format | LLMs, agents, automation |
| JSON | Pretty-printed JSON | Human readability |
| JSON-compact | Minified JSON | Data transmission |
| YAML | YAML format | Configuration files |
| Table | ASCII table | Terminal display |
| Markdown | Markdown table format | Docs, PR comments, reports |

## Command Categories

### Core API Commands

| Command | Description |
|---------|-------------|
| `status` | Check API status |
| `config` | Get Home Assistant configuration |
| `components` | List loaded components |
| `events` | List available events |
| `services` | List/filter service schema (`--domain`, `--service`, `--count`, `--flat`, `--schema`) |

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

### Config Entry Commands

| Command | Description |
|---------|-------------|
| `config-entries` | List/filter/count/delete integration config entries |

### WebSocket & Supervisor

| Command | Description |
|---------|-------------|
| `websocket` / `ws` | Full WebSocket API passthrough (`status`, `call`, `subscribe`, `--connect-test`) |
| `supervisor api` | Raw Supervisor proxy passthrough |
| `supervisor addons` | Add-on list/info/start/stop/restart |
| `supervisor host` | Host reboot/shutdown |
| `supervisor logs` | Fetch supervisor logs |

### LLM/Agent Optimized Commands

| Command | Description |
|---------|-------------|
| `entities` | List/filter entities with advanced options |
| `discover` | Discover and categorize all entities |
| `summary` | One-shot domain/state topology snapshot (`--top-states`, `--full-states`) |
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
| `capabilities` | Probe/cache runtime capability matrix for agent planning |
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
- **Search Fallback**: Automatically uses local entity-state search if `/api/search` is unavailable
- **Capability Matrix**: `hassio capabilities` exposes per-instance API availability and scope hints
- **Service Input Validation**: `call-service --validate-input` checks payloads against live HA service definitions before execution
- **Agent Plan Output**: `hassio capabilities --agent-plan` returns command recommendations and avoid-lists based on live capability probes
- **Agent Profile Output**: `hassio capabilities --agent-profile` returns a stable execution profile (`preferred_output_format`, `capabilities`, `planning.fast_path`, `streaming_ready`)
- **Agent Context Output**: `hassio capabilities --agent-context` returns combined summary + plan + profile for one-shot agent bootstrap
- **Private Redaction**: `hassio capabilities --redact-private` masks sensitive instance fields before sharing outputs

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
✅ Config Entries  
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

Current test run: **181 tests passing across 19 test files**.
Latest coverage run (v8): **35.70% statements / 81.81% branches / 68.72% functions / 35.70% lines**.

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
