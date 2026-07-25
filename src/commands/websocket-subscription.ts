/**
 * Defines bounded Home Assistant automation-trigger subscriptions.
 */
import { readFile } from "node:fs/promises";
import { Command } from "commander";
import { HomeAssistantWebSocketClient } from "../api/websocket.js";
import { formatOutput } from "../formatters/index.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";
import { withExit } from "../utils/exit.js";

type TriggerDefinition = Record<string, unknown> | Record<string, unknown>[];

function parseTrigger(value: unknown): TriggerDefinition {
  if (value === null || typeof value !== "object") {
    throw new Error("Trigger must be a JSON object or array of objects");
  }
  if (Array.isArray(value)) {
    if (value.some((entry) => entry === null || typeof entry !== "object" || Array.isArray(entry))) {
      throw new Error("Trigger must be a JSON object or array of objects");
    }
    return value as Record<string, unknown>[];
  }
  return value as Record<string, unknown>;
}

function parseVariables(value: string | undefined): Record<string, unknown> | undefined {
  if (!value) return undefined;
  const parsed = JSON.parse(value) as unknown;
  if (parsed === null || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("Variables must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

function parsePositiveInteger(value: string, name: string): number {
  if (!/^[1-9]\d*$/.test(value)) {
    throw new Error(`${name} must be a positive integer`);
  }
  return Number(value);
}

/** Build the typed automation-trigger subscription command. */
export function createWebsocketTriggerSubscriptionCommand(): Command {
  const command = new Command("subscribe-trigger")
    .description("Observe automation triggers for a bounded period (admin only)")
    .option("--trigger <json>", "Trigger object or array as inline JSON")
    .option("--file <path>", "Path to a JSON trigger object or array; --trigger takes precedence")
    .option("--variables <json>", "Optional trigger variables as a JSON object")
    .option("--wait-ms <ms>", "How long to observe triggers", "5000")
    .option("--max-events <n>", "Maximum trigger events to return", "10")
    .addHelpText("after", `
Examples:
  hassio ws subscribe-trigger --trigger '{"trigger":"event","event_type":"doorbell"}'
  hassio ws subscribe-trigger --file trigger.json --wait-ms 30000 --max-events 5
  hassio ws subscribe-trigger --trigger '{"trigger":"state","entity_id":"binary_sensor.door"}' \\
    --variables '{"source":"agent-observation"}' --format json-compact

This read-only command requires a Home Assistant administrator. It subscribes,
waits for the bounded observation window, unsubscribes, and returns captured
trigger variables and contexts. It never fires the trigger itself.
`);

  command.action(withExit(async (options: {
    trigger?: string;
    file?: string;
    variables?: string;
    waitMs: string;
    maxEvents: string;
  }, cmd) => {
    if (!options.trigger && !options.file) {
      throw new Error("Provide --trigger or --file");
    }
    const rawTrigger = options.trigger
      ? JSON.parse(options.trigger) as unknown
      : JSON.parse(await readFile(options.file as string, "utf8")) as unknown;
    const subscription: {
      trigger: TriggerDefinition;
      variables?: Record<string, unknown>;
      waitMs: number;
      maxEvents: number;
    } = {
      trigger: parseTrigger(rawTrigger),
      waitMs: parsePositiveInteger(options.waitMs, "--wait-ms"),
      maxEvents: parsePositiveInteger(options.maxEvents, "--max-events"),
    };
    const variables = parseVariables(options.variables);
    if (variables) subscription.variables = variables;
    const { config, format } = resolveCommandOptions((cmd as Command).optsWithGlobals());
    const client = new HomeAssistantWebSocketClient(config);
    try {
      const events = await client.subscribeTrigger(subscription);
      console.log(formatOutput({
        subscription: "trigger",
        event_count: events.length,
        events,
      }, format));
    } finally {
      await client.close();
    }
  }));

  return command;
}
