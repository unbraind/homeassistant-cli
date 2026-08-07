/**
 * Defines typed, bounded Home Assistant automation and script trace diagnostics.
 */
import { Command, Option } from "commander";
import { callWebsocketAndOutput, formatBoundedRows, parseLimit } from "../utils/command-helpers.js";
import { withExit } from "../utils/exit.js";

type TraceDomain = "automation" | "script";

type TraceListOptions = {
  all?: boolean;
  count?: boolean;
  domain: TraceDomain;
  itemId?: string;
  limit?: string;
};

type TraceContextOptions = {
  all?: boolean;
  count?: boolean;
  domain?: TraceDomain;
  itemId?: string;
  limit?: string;
};

const TRACE_DOMAINS = ["automation", "script"];
const IDENTIFIER_PATTERN = /^[a-z0-9_-]+$/i;

function parseIdentifier(value: string, label: string): string {
  if (!IDENTIFIER_PATTERN.test(value)) {
    throw new Error(`Invalid ${label} '${value}'. Use letters, numbers, underscores, or hyphens.`);
  }
  return value;
}

function validateBoundedOptions(options: { all?: boolean; count?: boolean; limit?: string }): void {
  if (!options.all && !options.count) parseLimit(options.limit);
}

function traceStart(entry: Record<string, unknown>): string {
  return String((entry["timestamp"] as Record<string, unknown> | undefined)?.["start"] ?? "");
}

function traceRows(result: unknown): Record<string, unknown>[] {
  if (!Array.isArray(result)) return [];
  return result
    .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
    .sort((left, right) => {
      return traceStart(right).localeCompare(traceStart(left), "en")
        || String(left["domain"]).localeCompare(String(right["domain"]), "en")
        || String(left["item_id"]).localeCompare(String(right["item_id"]), "en")
        || String(left["run_id"]).localeCompare(String(right["run_id"]), "en");
    });
}

function contextRows(result: unknown): Record<string, unknown>[] {
  if (!result || typeof result !== "object" || Array.isArray(result)) return [];
  return Object.entries(result as Record<string, unknown>)
    .map(([contextId, trace]) => ({
      context_id: contextId,
      ...(trace && typeof trace === "object" && !Array.isArray(trace)
        ? trace as Record<string, unknown>
        : { trace }),
    }))
    .sort((left, right) => String(left["context_id"]).localeCompare(String(right["context_id"]), "en"));
}

function addBoundedOptions(command: Command): Command {
  return command
    .option("--limit <n>", "Maximum rows to return unless --all is set", "50")
    .option("--all", "Return every matching row")
    .option("--count", "Return only the matching row count");
}

function createTraceListCommand(): Command {
  const command = addBoundedOptions(new Command("list")
    .description("List recent automation or script execution traces as bounded summaries")
    .addOption(new Option("--domain <domain>", "Trace domain to inspect").choices(TRACE_DOMAINS).makeOptionMandatory())
    .option("--item-id <id>", "Optional automation or script object ID"));
  command.action(withExit(async (options: TraceListOptions, cmd) => {
    validateBoundedOptions(options);
    const itemId = options.itemId ? parseIdentifier(options.itemId, "item ID") : undefined;
    await callWebsocketAndOutput(cmd as Command, "trace/list", {
      domain: options.domain,
      ...(itemId ? { item_id: itemId } : {}),
    }, (result) => ({
      domain: options.domain,
      item_id: itemId ?? null,
      ...formatBoundedRows(traceRows(result), options, "traces"),
    }));
  }));
  return command;
}

function createTraceGetCommand(): Command {
  const command = new Command("get")
    .description("Get one exact automation or script execution trace")
    .addOption(new Option("--domain <domain>", "Trace domain to inspect").choices(TRACE_DOMAINS).makeOptionMandatory())
    .requiredOption("--item-id <id>", "Automation or script object ID")
    .requiredOption("--run-id <id>", "Trace run ID returned by traces list");
  command.action(withExit(async (options: { domain: TraceDomain; itemId: string; runId: string }, cmd) => {
    const itemId = parseIdentifier(options.itemId, "item ID");
    const runId = parseIdentifier(options.runId, "run ID");
    await callWebsocketAndOutput(cmd as Command, "trace/get", {
      domain: options.domain,
      item_id: itemId,
      run_id: runId,
    }, (result) => result && typeof result === "object" && !Array.isArray(result)
      ? result as Record<string, unknown>
      : { result });
  }));
  return command;
}

function createTraceContextsCommand(): Command {
  const command = addBoundedOptions(new Command("contexts")
    .description("Map Home Assistant context IDs to available execution traces")
    .addOption(new Option("--domain <domain>", "Trace domain filter; requires --item-id").choices(TRACE_DOMAINS))
    .option("--item-id <id>", "Automation or script object ID; requires --domain"));
  command.action(withExit(async (options: TraceContextOptions, cmd) => {
    validateBoundedOptions(options);
    if (Boolean(options.domain) !== Boolean(options.itemId)) {
      throw new Error("Provide --domain and --item-id together, or omit both");
    }
    const itemId = options.itemId ? parseIdentifier(options.itemId, "item ID") : undefined;
    await callWebsocketAndOutput(cmd as Command, "trace/contexts", options.domain && itemId
      ? { domain: options.domain, item_id: itemId }
      : undefined, (result) => ({
      domain: options.domain ?? null,
      item_id: itemId ?? null,
      ...formatBoundedRows(contextRows(result), options, "contexts"),
    }));
  }));
  return command;
}

/** Build typed read-only automation and script trace diagnostic commands. */
export function createWebsocketTraceCommand(): Command {
  const command = new Command("traces")
    .description("Diagnose automation and script executions with stored Home Assistant traces")
    .addHelpText("after", `
Examples:
  hassio ws traces list --domain automation --limit 20
  hassio ws traces list --domain script --item-id evening_routine --count
  hassio ws traces get --domain automation --item-id lights --run-id <run-id>
  hassio ws traces contexts --limit 20
`);
  command.addCommand(createTraceListCommand());
  command.addCommand(createTraceGetCommand());
  command.addCommand(createTraceContextsCommand());
  return command;
}
