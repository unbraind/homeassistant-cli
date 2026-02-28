# Documentation Index

## Getting Started

- [README](./README.md) - Installation and quick start guide
- [API Reference](./API.md) - Complete command reference

## Topics

### Configuration

- Environment variables (`HASSIO_URL`, `HASSIO_TOKEN`, `HASSIO_FORMAT`)
- Config file (`~/.hassio-cli/settings.json`)
- CLI options (`--url`, `--token`, `--format`)

### Output Formats

- **TOON** - Default, token-efficient for LLMs
- **JSON** - Standard pretty-printed JSON
- **JSON Compact** - Minified JSON
- **YAML** - Human-readable YAML
- **Table** - ASCII table format

### API Coverage

| Category | Commands |
|----------|----------|
| Core | `status`, `config`, `components`, `events`, `services` |
| States | `states`, `set-state`, `delete-state` |
| Services | `call-service`, `fire-event`, `render-template` |
| History | `history`, `logbook`, `error-log` |
| Calendar | `calendars`, `calendar-events` |
| Media | `camera` |
| Config | `check-config`, `handle-intent` |
| CLI | `config-set`, `config-get`, `config-path` |

## For Developers

### Requirements

- [Bun](https://bun.sh) - Primary package manager and runtime
- Node.js 20+ (for distribution)

### Project Structure

```
homeassistant-cli/
├── src/
│   ├── api/           # Home Assistant API client
│   ├── commands/      # CLI command implementations
│   ├── config/        # Configuration management
│   ├── formatters/    # Output formatters (TOON, JSON, YAML, table)
│   ├── types/         # TypeScript type definitions
│   ├── cli.ts         # CLI entry point
│   └── index.ts       # Library exports
├── tests/             # Test files
├── docs/              # Documentation
└── dist/              # Compiled output
```

### Building

```bash
bun install
bun run build
```

### Testing

```bash
bun test
bun run test:coverage
```

### Development Mode

```bash
bun run dev -- <command>
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `HASSIO_URL` | Home Assistant URL | - |
| `HASSIO_TOKEN` | Long-lived access token | - |
| `HASSIO_FORMAT` | Output format | `toon` |
| `HASSIO_TIMEOUT` | Request timeout (ms) | `30000` |
| `HOMEASSISTANT_URL` | Alternative URL variable | - |
| `HOMEASSISTANT_TOKEN` | Alternative token variable | - |

## Related Resources

- [Home Assistant Documentation](https://www.home-assistant.io/docs/)
- [Home Assistant REST API](https://developers.home-assistant.io/docs/api/rest/)
- [Home Assistant WebSocket API](https://developers.home-assistant.io/docs/api/websocket/)
- [TOON Format Specification](https://github.com/toon-format/toon)
