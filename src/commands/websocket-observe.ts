/**
 * Defines bounded token-efficient entity observation and automation discovery commands.
 */
import { Command } from "commander";
import { HomeAssistantWebSocketClient } from "../api/websocket.js";
import { formatOutput } from "../formatters/index.js";
import { formatBoundedRows, parseLimit, resolveCommandOptions } from "../utils/command-helpers.js";
import { withExit } from "../utils/exit.js";

type CompressedState = {
  a?: Record<string, unknown>;
  c?: unknown;
  lc?: number;
  lu?: number;
  s?: string;
};

type EntityDelta = {
  a?: Record<string, CompressedState>;
  c?: Record<string, { "+"?: CompressedState; "-"?: Record<string, string[]> }>;
  r?: string[];
};

function splitCsv(value?: string): string[] {
  return value?.split(",").map((part) => part.trim()).filter(Boolean) ?? [];
}

function positive(value: string): number {
  return parseLimit(value) as number;
}

function stateRow(entityId: string, state: CompressedState): Record<string, unknown> {
  return {
    entity_id: entityId,
    state: state.s,
    attributes: state.a ?? {},
    context: state.c,
    last_changed: state.lc,
    last_updated: state.lu ?? state.lc,
  };
}

function changeRows(events: unknown[]): Record<string, unknown>[] {
  return events.flatMap((event) => {
    if (!event || typeof event !== "object") return [];
    const delta = event as EntityDelta;
    return [
      ...Object.entries(delta.a ?? {}).map(([entityId, state]) => ({
        kind: "added",
        ...stateRow(entityId, state),
      })),
      ...Object.entries(delta.c ?? {}).map(([entityId, patch]) => ({
        kind: "changed",
        entity_id: entityId,
        set: patch["+"] ?? {},
        remove: patch["-"] ?? {},
      })),
      ...(delta.r ?? []).map((entityId) => ({ kind: "removed", entity_id: entityId })),
    ];
  });
}

function createEntityObserveCommand(): Command {
  const command = new Command("observe-entities")
    .description("Collect a compact initial state snapshot and bounded entity deltas")
    .option("--entity-id <ids>", "Comma-separated entity IDs")
    .option("--domain <domains>", "Comma-separated included domains")
    .option("--exclude-entity-id <ids>", "Comma-separated entity IDs to exclude")
    .option("--exclude-domain <domains>", "Comma-separated domains to exclude")
    .option("--wait-ms <ms>", "Maximum collection duration", "5000")
    .option("--max-events <n>", "Maximum change events after the initial snapshot", "10")
    .option("--no-initial", "Omit initial snapshot rows from output");

  command.action(withExit(async (options: {
    entityId?: string;
    domain?: string;
    excludeEntityId?: string;
    excludeDomain?: string;
    waitMs: string;
    maxEvents: string;
    initial: boolean;
  }, cmd) => {
    const { config, format } = resolveCommandOptions((cmd as Command).optsWithGlobals());
    const client = new HomeAssistantWebSocketClient(config);
    try {
      const maxEvents = positive(options.maxEvents);
      const events = await client.subscribeEntities({
        entityIds: splitCsv(options.entityId),
        includeDomains: splitCsv(options.domain),
        excludeEntityIds: splitCsv(options.excludeEntityId),
        excludeDomains: splitCsv(options.excludeDomain),
        waitMs: positive(options.waitMs),
        maxEvents: maxEvents + 1,
      });
      const initial = changeRows(events.slice(0, 1));
      const changes = changeRows(events.slice(1));
      console.log(formatOutput({
        subscription: "entities",
        initial_count: initial.length,
        change_count: changes.length,
        ...(options.initial ? { initial } : {}),
        changes,
      }, format));
    } finally {
      await client.close();
    }
  }));
  return command;
}

function mergeCatalog(events: unknown[]): Record<string, unknown> {
  return Object.assign({}, ...events.filter(
    (event): event is Record<string, unknown> => Boolean(event) && typeof event === "object" && !Array.isArray(event),
  ));
}

function createAutomationPlatformsCommand(): Command {
  const command = new Command("automation-platforms")
    .description("Discover current purpose-specific trigger and condition platform schemas")
    .option("--kind <kind>", "Catalog kind: trigger|condition|all", "all")
    .option("--wait-ms <ms>", "Maximum duration for newly loaded platforms", "100")
    .option("--max-events <n>", "Maximum catalog events per kind", "1");

  command.action(withExit(async (options: { kind: string; waitMs: string; maxEvents: string }, cmd) => {
    if (!new Set(["trigger", "condition", "all"]).has(options.kind)) {
      throw new Error("Platform kind must be trigger, condition, or all");
    }
    const { config, format } = resolveCommandOptions((cmd as Command).optsWithGlobals());
    const client = new HomeAssistantWebSocketClient(config);
    try {
      const kinds: Array<"condition" | "trigger"> = options.kind === "all"
        ? ["trigger", "condition"]
        : [options.kind as "condition" | "trigger"];
      const catalogs: Record<string, Record<string, unknown>> = {};
      for (const kind of kinds) {
        catalogs[`${kind}s`] = mergeCatalog(await client.subscribeAutomationPlatforms({
          kind,
          waitMs: positive(options.waitMs),
          maxEvents: positive(options.maxEvents),
        }));
      }
      console.log(formatOutput({
        subscription: "automation_platforms",
        ...catalogs,
      }, format));
    } finally {
      await client.close();
    }
  }));
  return command;
}

function bootstrapRows(events: unknown[]): Record<string, unknown>[] {
  return events.flatMap((event, index) => {
    if (!event || typeof event !== "object" || Array.isArray(event)) return [];
    return Object.entries(event)
      .filter((entry): entry is [string, number] => (
        typeof entry[1] === "number" && Number.isFinite(entry[1]) && entry[1] >= 0
      ))
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([domain, elapsedSeconds]) => ({
        snapshot: index + 1,
        domain,
        elapsed_seconds: elapsedSeconds,
      }));
  });
}

function createBootstrapIntegrationsCommand(): Command {
  const command = new Command("bootstrap-integrations")
    .description("Observe integrations still loading during Home Assistant startup")
    .option("--wait-ms <ms>", "Maximum observation duration", "5000")
    .option("--max-events <n>", "Maximum bootstrap snapshots to collect", "10")
    .option("--limit <n>", "Maximum normalized integration rows to return", "100")
    .option("--all", "Return every normalized integration row")
    .option("--count", "Return only snapshot and integration-row counts")
    .addHelpText("after", `
Examples:
  hassio ws bootstrap-integrations --wait-ms 10000 --max-events 5
  hassio ws bootstrap-integrations --count --format json-compact

Home Assistant emits this read-only stream only while bootstrap integrations are
still loading. An empty result on an already-started server is expected. Each
row reports the Core-provided elapsed setup time in seconds. The command always
unsubscribes after the event or time bound is reached.
`);

  command.action(withExit(async (options: {
    waitMs: string;
    maxEvents: string;
    limit?: string;
    all?: boolean;
    count?: boolean;
  }, cmd) => {
    const waitMs = positive(options.waitMs);
    const maxEvents = positive(options.maxEvents);
    const { config, format } = resolveCommandOptions((cmd as Command).optsWithGlobals());
    const client = new HomeAssistantWebSocketClient(config);
    try {
      const events = await client.subscribeBootstrapIntegrations({ waitMs, maxEvents });
      console.log(formatOutput({
        subscription: "bootstrap_integrations",
        event_count: events.length,
        ...formatBoundedRows(bootstrapRows(events), options, "pending_integrations"),
      }, format));
    } finally {
      await client.close();
    }
  }));
  return command;
}

/** Build typed bounded observation commands for the WebSocket surface. */
export function createWebsocketObserveCommands(): Command[] {
  return [
    createEntityObserveCommand(),
    createAutomationPlatformsCommand(),
    createBootstrapIntegrationsCommand(),
  ];
}
