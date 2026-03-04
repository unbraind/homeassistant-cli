# Contributing to Home Assistant CLI

Thanks for contributing.

## Prerequisites

- Bun (latest)
- Node.js 20+ (CI uses Node 22)
- Git

## Local Setup

```bash
git clone https://github.com/unbraind/homeassistant-cli.git
cd homeassistant-cli
bun install
```

## Development Commands

| Command | Purpose |
|---|---|
| `bun run dev -- <command>` | Run CLI directly from source |
| `bun run lint` | Lint source and tests |
| `bun run typecheck` | TypeScript type-check |
| `bun run build` | Build `dist/` with TypeScript |
| `bun run test` | Run full test suite |
| `bun run test:coverage` | Run tests with coverage |
| `bun run release:dry-run` | Package smoke check (`npx` + `bunx`) |

Node/npm users can run equivalent scripts with `npm run <script>` (`lint`, `typecheck`, `build`, `test`).

## Quality Bar

Before opening a PR, run:

```bash
bun run lint
bun run typecheck
bun run build
bun run test
```

For release-impacting changes, also run:

```bash
bun run test:coverage
bun run release:dry-run
bun run commit:audit
```

## Commit Style

Use Conventional Commits:

- `feat(scope): ...`
- `fix(scope): ...`
- `docs: ...`
- `test(scope): ...`
- `refactor(scope): ...`
- `chore(scope): ...`

Prefer focused commits with imperative, professional summaries. Avoid placeholders, trailing punctuation artifacts, or catch-all messages.

## Security

- Never commit tokens or credentials.
- Keep Home Assistant secrets outside the repo (`~/.hassio-cli/`).
- Use placeholders in docs/examples.

Quick check:

```bash
git diff --cached -U0 | rg -n '^\+.*(ghp_[A-Za-z0-9]{36}|github_pat_[A-Za-z0-9_]{40,}|npm_[A-Za-z0-9]{36}|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9._-]{10,}\.[A-Za-z0-9._-]{10,}|-----BEGIN (RSA|OPENSSH|EC|DSA|PGP) PRIVATE KEY-----|_authToken\s*=)'
bun run security:scan:history
```

## Release Process

Release process and CI/CD details are documented in [docs/RELEASING.md](./docs/RELEASING.md).
