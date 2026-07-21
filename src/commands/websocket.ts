/**
 * Defines the websocket command surface, options, help, and output behavior.
 */
import { Command } from "commander";
import { HomeAssistantWebSocketClient } from "../api/websocket.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";
import { createWebsocketTargetCommand } from "./websocket-target.js";

function parseJson(value?: string): Record<string, unknown> | undefined {
  if (!value) return undefined;
  return JSON.parse(value) as Record<string, unknown>;
}

export function createWebsocketCommand(): Command {
  const cmd = new Command("websocket")
    .alias("ws")
    .description("Access Home Assistant WebSocket API (full feature passthrough)")
    .option("--connect-test", "Validate WebSocket auth and connectivity");

  cmd.action(withExit(async (options: { connectTest?: boolean }, command) => {
    if (!options.connectTest) {
      command.help();
      return;
    }

    const globalOpts = command.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantWebSocketClient(config);

    try {
      await client.connect();
      console.log(formatOutput({ connected: true, auth: "ok" }, format));
    } finally {
      await client.close();
    }
  }));

  cmd.addCommand(createWebsocketCallCommand());
  cmd.addCommand(createWebsocketStatusCommand());
  cmd.addCommand(createWebsocketSubscribeCommand());
  cmd.addCommand(createWebsocketTargetCommand());
  return cmd;
}

function createWebsocketStatusCommand(): Command {
  const cmd = new Command("status")
    .description("Get WebSocket auth/connectivity and server capability metadata");

  cmd.action(withExit(async (_options, command) => {
    const globalOpts = command.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantWebSocketClient(config);

    try {
      await client.connect();
      const [config, currentUser] = await Promise.all([
        client.call("get_config"),
        client.call("auth/current_user"),
      ]);

      console.log(formatOutput({
        connected: true,
        auth: "ok",
        websocket: {
          config,
          current_user: currentUser,
        },
      }, format));
    } finally {
      await client.close();
    }
  }));

  return cmd;
}

function createWebsocketCallCommand(): Command {
  const cmd = new Command("call")
    .description("Send any WebSocket command type with optional JSON payload")
    .requiredOption("-T, --type <type>", "WebSocket command type (e.g. get_states, config/device_registry/list)")
    .option("-d, --data <json>", "JSON payload");

  cmd.action(withExit(async (options: { type: string; data?: string }, command) => {
    const globalOpts = command.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantWebSocketClient(config);

    try {
      const result = await client.call(options.type, parseJson(options.data));
      console.log(formatOutput({ type: options.type, result }, format));
    } finally {
      await client.close();
    }
  }));

  return cmd;
}

function createWebsocketSubscribeCommand(): Command {
  const cmd = new Command("subscribe")
    .description("Subscribe to WebSocket events for a period and return captured events")
    .option("-e, --event-type <type>", "Optional event type filter")
    .option("--wait-ms <ms>", "How long to collect events", "5000")
    .option("--max-events <n>", "Max events to return", "10");

  cmd.action(withExit(async (options: { eventType?: string; waitMs: string; maxEvents: string }, command) => {
    const globalOpts = command.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantWebSocketClient(config);

    try {
      const waitMs = parseInt(options.waitMs, 10);
      const maxEvents = parseInt(options.maxEvents, 10);
      const subscribeOptions: { eventType?: string; waitMs?: number; maxEvents?: number } = {
        waitMs: Number.isFinite(waitMs) && waitMs > 0 ? waitMs : 5000,
        maxEvents: Number.isFinite(maxEvents) && maxEvents > 0 ? maxEvents : 10,
      };
      if (options.eventType) {
        subscribeOptions.eventType = options.eventType;
      }
      const events = await client.subscribeEvents(subscribeOptions);
      console.log(formatOutput({ event_count: events.length, events }, format));
    } finally {
      await client.close();
    }
  }));

  return cmd;
}
