/**
 * Defines typed Home Assistant WebSocket integration-intelligence commands.
 */
import { Command } from "commander";
import { HomeAssistantWebSocketClient } from "../api/websocket.js";
import { formatOutput } from "../formatters/index.js";
import { parseLimit, resolveCommandOptions } from "../utils/command-helpers.js";
import { withExit } from "../utils/exit.js";

type ListOptions = {
  all?: boolean;
  count?: boolean;
  domain?: string;
  limit?: string;
};

const DOMAIN_PATTERN = /^[a-z0-9_]+$/;

function parseDomains(value?: string): string[] {
  const domains = [...new Set(value?.split(",").map((part) => part.trim()).filter(Boolean) ?? [])];
  const invalid = domains.find((domain) => !DOMAIN_PATTERN.test(domain));
  if (invalid) throw new Error(`Invalid integration domain '${invalid}'. Use lowercase letters, numbers, and underscores.`);
  return domains;
}

function parseDomain(value: string): string {
  const domains = parseDomains(value);
  if (domains.length !== 1) throw new Error("Provide exactly one integration domain");
  return domains[0] as string;
}

function rowsFromRecord(result: unknown, key: string): Record<string, unknown>[] {
  if (!result || typeof result !== "object" || Array.isArray(result)) return [];
  return Object.entries(result as Record<string, unknown>).map(([name, value]) => ({
    [key]: name,
    ...(value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : { value }),
  }));
}

function descriptionRows(result: unknown): Record<string, unknown>[] {
  const root = result && typeof result === "object" && !Array.isArray(result)
    ? result as Record<string, unknown>
    : {};
  const core = root["core"] && typeof root["core"] === "object" && !Array.isArray(root["core"])
    ? root["core"] as Record<string, unknown>
    : {};
  const translatedNames = new Set(
    Array.isArray(core["translated_name"])
      ? core["translated_name"].filter((value): value is string => typeof value === "string")
      : [],
  );

  return ["core", "custom"].flatMap((source) => {
    const sourceRecord = root[source] && typeof root[source] === "object" && !Array.isArray(root[source])
      ? root[source] as Record<string, unknown>
      : {};
    return ["integration", "helper"].flatMap((category) =>
      rowsFromRecord(sourceRecord[category], "domain").map((row) => ({
        source,
        category,
        translated_name: translatedNames.has(String(row["domain"])),
        ...row,
      })),
    );
  });
}

function boundedRows(
  rows: Record<string, unknown>[],
  options: ListOptions,
  collectionKey: string,
): Record<string, unknown> {
  const limit = options.all ? undefined : parseLimit(options.limit);
  const visible = limit === undefined ? rows : rows.slice(0, limit);
  if (options.count) return { count: rows.length };
  return {
    count: rows.length,
    returned_count: visible.length,
    truncated: visible.length < rows.length,
    [collectionKey]: visible,
  };
}

async function callAndOutput(
  command: Command,
  type: string,
  payload: Record<string, unknown> | undefined,
  normalize: (result: unknown) => Record<string, unknown>,
): Promise<void> {
  const { config, format } = resolveCommandOptions(command.optsWithGlobals());
  const client = new HomeAssistantWebSocketClient(config);
  try {
    console.log(formatOutput(normalize(await client.call(type, payload)), format));
  } finally {
    await client.close();
  }
}

function addListOptions(command: Command, noun: string): Command {
  return command
    .option("--domain <domains>", `Comma-separated ${noun} domains to include`)
    .option("--limit <n>", "Maximum rows to return unless --all is set", "100")
    .option("--all", "Return every matching row")
    .option("--count", "Return only the matching row count");
}

function createIntegrationListCommand(): Command {
  const command = addListOptions(
    new Command("list").description("List loaded integration manifests as deterministic bounded rows"),
    "integration",
  );
  command.action(withExit(async (options: ListOptions, cmd) => {
    const domains = parseDomains(options.domain);
    await callAndOutput(cmd as Command, "manifest/list", domains.length > 0 ? { integrations: domains } : undefined, (result) => {
      const rows = Array.isArray(result)
        ? result.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object")
        : [];
      rows.sort((left, right) => String(left["domain"]).localeCompare(String(right["domain"]), "en"));
      return boundedRows(rows, options, "integrations");
    });
  }));
  return command;
}

function createIntegrationGetCommand(): Command {
  const command = new Command("get")
    .description("Get the manifest for one integration domain")
    .argument("<domain>", "Integration domain, for example light or mqtt");
  command.action(withExit(async (domain: string, _options, cmd) => {
    const validatedDomain = parseDomain(domain);
    await callAndOutput(cmd as Command, "manifest/get", { integration: validatedDomain }, (result) => ({
      integration: result,
    }));
  }));
  return command;
}

function createIntegrationRowsCommand(
  name: string,
  description: string,
  type: string,
  toRows: (result: unknown) => Record<string, unknown>[],
): Command {
  const command = addListOptions(
    new Command(name).description(description),
    "integration",
  );
  command.action(withExit(async (options: ListOptions, cmd) => {
    const domains = new Set(parseDomains(options.domain));
    await callAndOutput(cmd as Command, type, undefined, (result) => {
      const rows = toRows(result)
        .filter((entry) => domains.size === 0 || domains.has(String(entry["domain"])))
        .sort((left, right) =>
          String(left["domain"]).localeCompare(String(right["domain"]), "en")
          || String(left["source"]).localeCompare(String(right["source"]), "en")
          || String(left["category"]).localeCompare(String(right["category"]), "en")
        );
      return boundedRows(rows, options, "integrations");
    });
  }));
  return command;
}

function createIntegrationWaitCommand(): Command {
  const command = new Command("wait")
    .description("Wait until an integration domain finishes loading")
    .argument("<domain>", "Integration domain, for example homeassistant");
  command.action(withExit(async (domain: string, _options, cmd) => {
    const validatedDomain = parseDomain(domain);
    await callAndOutput(cmd as Command, "integration/wait", { domain: validatedDomain }, (result) => ({
      domain: validatedDomain,
      ...(result && typeof result === "object" && !Array.isArray(result)
        ? result as Record<string, unknown>
        : { result }),
    }));
  }));
  return command;
}

function createIntegrationsCommand(): Command {
  const command = new Command("integrations")
    .description("Inspect loaded integration metadata, setup health, and readiness")
    .addHelpText("after", `
Examples:
  hassio ws integrations list --domain light,mqtt
  hassio ws integrations get homeassistant
  hassio ws integrations setup --limit 20
  hassio ws integrations descriptions --domain mqtt
  hassio ws integrations wait homeassistant
`);
  command.addCommand(createIntegrationListCommand());
  command.addCommand(createIntegrationGetCommand());
  command.addCommand(createIntegrationRowsCommand(
    "setup",
    "List integration setup timings for startup diagnostics",
    "integration/setup_info",
    (result) => (Array.isArray(result) ? result : [])
      .filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object"),
  ));
  command.addCommand(createIntegrationRowsCommand(
    "descriptions",
    "List integration and brand descriptions (admin only)",
    "integration/descriptions",
    descriptionRows,
  ));
  command.addCommand(createIntegrationWaitCommand());
  return command;
}

function createEntitySourcesCommand(): Command {
  const command = addListOptions(
    new Command("entity-sources").description("Map readable entities to their providing integration domains"),
    "source",
  ).option("--entity-id <ids>", "Comma-separated entity IDs to include");
  command.action(withExit(async (options: ListOptions & { entityId?: string }, cmd) => {
    const domains = new Set(parseDomains(options.domain));
    const entityIds = new Set(options.entityId?.split(",").map((part) => part.trim()).filter(Boolean) ?? []);
    await callAndOutput(cmd as Command, "entity/source", undefined, (result) => {
      const rows = rowsFromRecord(result, "entity_id")
        .filter((entry) => domains.size === 0 || domains.has(String(entry["domain"])))
        .filter((entry) => entityIds.size === 0 || entityIds.has(String(entry["entity_id"])))
        .sort((left, right) => String(left["entity_id"]).localeCompare(String(right["entity_id"]), "en"));
      return boundedRows(rows, options, "entities");
    });
  }));
  return command;
}

function createSlugifyCommand(): Command {
  const command = new Command("slugify")
    .description("Convert text with Home Assistant's canonical slug generator")
    .argument("<text>", "Text to convert into a Home Assistant slug");
  command.action(withExit(async (value: string, _options, cmd) => {
    if (value.trim().length === 0) throw new Error("Slug text must not be empty");
    await callAndOutput(cmd as Command, "slugify", { text: value }, (result) => ({ input: value, result }));
  }));
  return command;
}

/** Build typed read-only WebSocket integration-intelligence commands. */
export function createWebsocketIntegrationCommands(): Command[] {
  return [createIntegrationsCommand(), createEntitySourcesCommand(), createSlugifyCommand()];
}
