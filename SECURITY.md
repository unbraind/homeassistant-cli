# Security Policy

## Supported Versions

This project is pre-release. Security fixes are applied on `master`.

## Reporting a Vulnerability

Please do not open public issues for suspected secrets or vulnerabilities.

1. Email the maintainer privately with a minimal reproduction and impact summary.
2. Include affected versions/commit SHA and any proof-of-concept details.
3. Allow time for remediation and coordinated disclosure.

## Secret Handling Rules

- Never commit Home Assistant tokens, API keys, or private keys.
- Keep local credentials only in `~/.hassio-cli/` with strict file permissions.
- Use placeholders in examples and docs.

## Automated Security Checks

- CI workflow: `.github/workflows/security.yml`
- Local history scan: `bun run security:scan:history`
- Release verification includes staged-content checks and full history scan.
