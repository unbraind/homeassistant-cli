/**
 * Defines typed Home Assistant repair issue and fix-flow commands.
 */
import { Command } from "commander";
import { DiagnosticsApiClient } from "../api/diagnostics.js";
import { formatOutput } from "../formatters/index.js";
import { parseLimit, resolveCommandOptions } from "../utils/command-helpers.js";
import { withExit } from "../utils/exit.js";

interface RepairListOptions {
  count?: boolean;
  domain?: string;
  fixable?: boolean;
  ignored?: boolean;
  limit: string;
  severity?: string;
}

const REPAIR_SEVERITIES = ["critical", "error", "warning"] as const;

function requireNonEmpty(value: string, label: string): string {
  const normalized = value.trim();
  if (!normalized) throw new Error(`${label} must not be empty`);
  return normalized;
}

function parseObject(value: string): Record<string, unknown> {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("--data must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

async function withDiagnostics(
  command: Command,
  operation: (client: DiagnosticsApiClient) => Promise<unknown>,
): Promise<void> {
  const { config, format } = resolveCommandOptions(command.optsWithGlobals());
  const client = new DiagnosticsApiClient(config);
  try {
    console.log(formatOutput(await operation(client), format));
  } finally {
    await client.close();
  }
}

function createRepairListCommand(): Command {
  const command = new Command("list")
    .description("List active Home Assistant repair issues with deterministic bounded output")
    .option("--severity <severity>", "Filter by severity such as critical, error, or warning")
    .option("--domain <domain>", "Filter by issue owner domain")
    .option("--ignored", "Return only ignored issues")
    .option("--fixable", "Return only issues with an interactive fix flow")
    .option("--limit <n>", "Maximum issues to return", "50")
    .option("--count", "Return aggregate counts without issue identifiers");

  command.action(withExit(async (options: RepairListOptions, cmd) => {
    if (options.severity && !REPAIR_SEVERITIES.includes(options.severity as typeof REPAIR_SEVERITIES[number])) {
      throw new Error(`Unsupported severity '${options.severity}'. Valid values: ${REPAIR_SEVERITIES.join(", ")}`);
    }
    const limit = parseLimit(options.limit) as number;
    await withDiagnostics(cmd as Command, async (client) => {
      const issues = (await client.listRepairIssues()).issues
        .filter((issue) => !options.severity || issue.severity === options.severity)
        .filter((issue) => !options.domain || issue.domain === options.domain)
        .filter((issue) => !options.ignored || issue.ignored)
        .filter((issue) => !options.fixable || issue.is_fixable)
        .sort((a, b) => (REPAIR_SEVERITIES.indexOf(a.severity as typeof REPAIR_SEVERITIES[number]) + 1 || 99)
          - (REPAIR_SEVERITIES.indexOf(b.severity as typeof REPAIR_SEVERITIES[number]) + 1 || 99)
          || a.domain.localeCompare(b.domain)
          || a.issue_id.localeCompare(b.issue_id));
      const bySeverity = [...new Set(issues.map((issue) => issue.severity))]
        .map((severity) => ({ severity, count: issues.filter((issue) => issue.severity === severity).length }));
      return {
        count: issues.length,
        by_severity: bySeverity,
        ...(options.count ? {} : { issues: issues.slice(0, limit) }),
      };
    });
  }));
  return command;
}

function createRepairShowCommand(): Command {
  const command = new Command("show")
    .description("Get integration-provided data for one active repair issue")
    .argument("<domain>", "Issue owner domain")
    .argument("<issue-id>", "Issue identifier");
  command.action(withExit(async (domain: string, issueId: string, _options, cmd) => {
    const normalizedDomain = requireNonEmpty(domain, "Domain");
    const normalizedIssueId = requireNonEmpty(issueId, "Issue ID");
    await withDiagnostics(cmd as Command, async (client) => ({
      domain: normalizedDomain,
      issue_id: normalizedIssueId,
      ...(await client.getRepairIssueData(normalizedDomain, normalizedIssueId)),
    }));
  }));
  return command;
}

function createRepairIgnoreCommand(): Command {
  const command = new Command("ignore")
    .description("Ignore or restore one repair issue (write operation)")
    .argument("<domain>", "Issue owner domain")
    .argument("<issue-id>", "Issue identifier")
    .option("--restore", "Restore a previously ignored issue")
    .option("--yes", "Confirm the state-changing operation");
  command.action(withExit(async (
    domain: string,
    issueId: string,
    options: { restore?: boolean; yes?: boolean },
    cmd,
  ) => {
    if (!options.yes) throw new Error("Changing an issue requires --yes confirmation");
    const normalizedDomain = requireNonEmpty(domain, "Domain");
    const normalizedIssueId = requireNonEmpty(issueId, "Issue ID");
    await withDiagnostics(cmd as Command, async (client) => {
      await client.setRepairIssueIgnored(normalizedDomain, normalizedIssueId, !options.restore);
      return { domain: normalizedDomain, issue_id: normalizedIssueId, ignored: !options.restore };
    });
  }));
  return command;
}

function createRepairFixCommand(): Command {
  const command = new Command("fix")
    .description("Run administrator repair fix flows (write operations)");
  command.command("start")
    .description("Start a repair fix flow")
    .argument("<handler>", "Repair handler or integration domain")
    .argument("<issue-id>", "Issue identifier")
    .option("--yes", "Confirm starting the state-changing flow")
    .action(withExit(async (handler: string, issueId: string, options: { yes?: boolean }, cmd) => {
      if (!options.yes) throw new Error("Starting a repair flow requires --yes confirmation");
      await withDiagnostics(cmd as Command, (client) => client.startRepairFlow(
        requireNonEmpty(handler, "Handler"),
        requireNonEmpty(issueId, "Issue ID"),
      ));
    }));
  command.command("status")
    .description("Read the current state of a repair fix flow")
    .argument("<flow-id>", "Repair flow identifier")
    .action(withExit(async (flowId: string, _options, cmd) => {
      await withDiagnostics(cmd as Command, (client) => client.getRepairFlow(requireNonEmpty(flowId, "Flow ID")));
    }));
  command.command("submit")
    .description("Submit a JSON object to a repair fix flow")
    .argument("<flow-id>", "Repair flow identifier")
    .requiredOption("--data <json>", "Flow input as a JSON object")
    .option("--yes", "Confirm submitting the state-changing flow input")
    .action(withExit(async (flowId: string, options: { data: string; yes?: boolean }, cmd) => {
      if (!options.yes) throw new Error("Submitting a repair flow requires --yes confirmation");
      const data = parseObject(options.data);
      await withDiagnostics(cmd as Command, (client) => client.submitRepairFlow(
        requireNonEmpty(flowId, "Flow ID"),
        data,
      ));
    }));
  return command;
}

/** Build the typed Home Assistant Repairs command group. */
export function createRepairsCommand(): Command {
  return new Command("repairs")
    .description("Inspect and safely manage Home Assistant repair issues")
    .addHelpText("after", `
Examples:
  hassio repairs list --count
  hassio repairs list --severity critical --limit 20
  hassio repairs show <domain> <issue-id>
  hassio repairs ignore <domain> <issue-id> --yes
  hassio repairs fix start <handler> <issue-id> --yes

Issue and flow identifiers may reveal private instance details. Read-only mode
allows list, show, and fix status, but blocks ignore and fix-flow writes.
`)
    .addCommand(createRepairListCommand())
    .addCommand(createRepairShowCommand())
    .addCommand(createRepairIgnoreCommand())
    .addCommand(createRepairFixCommand());
}
