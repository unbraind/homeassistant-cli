# Quality and Security Gates

The repository treats local verification and hosted CI as one production contract. Run `bun run release:verify` before proposing a release; it composes the mandatory checks below and exits on the first regression.

| Gate | Local command | Hosted enforcement |
|---|---|---|
| Strict TypeScript and ESLint | `bun run typecheck`, `bun run lint` | CI Bun and Node matrix; `static-contracts` |
| Source documentation | `bun run quality:docstrings` | `static-contracts` (exactly 100% of `src/**/*.ts`) |
| Source coverage | `bun run test:coverage` | `coverage` (100/100/100/100 plus Codecov OIDC upload) |
| Duplicate-code ratchet | `bun run quality:duplication` | `static-contracts` (jscpd must remain at or below 4.36%) |
| Source size | `bun run quality:file-size` | `static-contracts` (maximum 300 code lines) |
| Shell scripts | `bun run quality:shell` | `static-contracts` (ShellCheck) |
| PM integrity | `bun run quality:pm` | `static-contracts` (latest pm CLI, strict files/resolution/history/health) |
| Dependencies | `bun run security:audit` | `Dependency audit` |
| Vulnerabilities/config/secrets | `bun run security:trivy` | `Trivy repository scan` |
| Code scanning | GitHub-hosted | `CodeQL (JavaScript/TypeScript)` |
| Package behavior | `bun run release:dry-run` | `package-smoke` |
| Generated changelog | `bun run changelog:pm:check` | `changelog` |

The ESLint contract prohibits explicit `any`, dynamic or inline imports, and non-erasable TypeScript constructs. Coverage includes the executable CLI entrypoint and package export surface; ignore directives and source exclusions are not accepted as coverage fixes.

PSScriptAnalyzer is intentionally inapplicable because this repository contains no PowerShell source. ShellCheck covers its shell automation. Greptile, CodeRabbit, and Gemini are review agents rather than deterministic build tools; their findings are inventoried, reacted to, and answered with [the PR review loop](PR_REVIEW_LOOP.md), while merge protection relies on reproducible GitHub check contexts available on the free plan.

Branch protection uses strict up-to-date status checks. When a new workflow context is introduced, let it complete once on the pull request before adding it to the required-context list; this avoids creating a required check that GitHub has never registered.
