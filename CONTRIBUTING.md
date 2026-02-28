# Contributing to Home Assistant CLI

## Development Setup

This project uses [Bun](https://bun.sh) as the primary package manager and runtime. Please use Bun instead of npm.

### Install Bun

```bash
curl -fsSL https://bun.sh/install | bash
```

### Setup Project

```bash
# Clone the repository
git clone https://github.com/your-org/homeassistant-cli.git
cd homeassistant-cli

# Install dependencies
bun install

# Build the project
bun run build

# Run tests
bun test
```

## Development Commands

| Command | Description |
|---------|-------------|
| `bun install` | Install dependencies |
| `bun run build` | Build TypeScript to dist/ |
| `bun run dev -- <cmd>` | Run CLI in development mode |
| `bun test` | Run tests |
| `bun run test:coverage` | Run tests with coverage |
| `bun run typecheck` | Run TypeScript type checking |
| `bun run lint` | Run ESLint |

## Project Structure

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

## Code Style

- Use TypeScript with strict mode
- Keep files under 300 lines of code (excluding comments)
- No comments unless explicitly requested
- Follow existing code patterns

## Testing

- All new features must include tests
- Aim for 100% test coverage
- Run tests before submitting PRs: `bun test`

## Security

- **Never commit credentials** - Use environment variables or config files
- The `.gitignore` excludes `.hassio-cli/`, `.env`, and credential files
- Test that no sensitive data is included: `grep -r "password\|token\|secret" src/`

## Pull Requests

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests: `bun test`
5. Run typecheck: `bun run typecheck`
6. Submit PR

## License

MIT
