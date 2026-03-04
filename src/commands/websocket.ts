import { Command } from "commander";
import { HomeAssistantWebSocketClient } from "../api/websocket.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

function parseJson(value?: string): Record<string, unknown> | undefined {
  if (!value) return undefined;
  return JSON.parse(value) as Record<string, unknown>;
}

type TargetOptions = {
  entityId?: string;
  deviceId?: string;
  areaId?: string;
  floorId?: string;
  labelId?: string;
};

function splitCsv(value?: string): string[] {
  if (!value) {
    return [];
  }
  return value
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
}

function toTargetPayload(options: TargetOptions): Record<string, string[]> {
  const payload: Record<string, string[]> = {};
  const entityIds = splitCsv(options.entityId);
  const deviceIds = splitCsv(options.deviceId);
  const areaIds = splitCsv(options.areaId);
  const floorIds = splitCsv(options.floorId);
  const labelIds = splitCsv(options.labelId);

  if (entityIds.length > 0) {
    payload["entity_id"] = entityIds;
  }
  if (deviceIds.length > 0) {
    payload["device_id"] = deviceIds;
  }
  if (areaIds.length > 0) {
    payload["area_id"] = areaIds;
  }
  if (floorIds.length > 0) {
    payload["floor_id"] = floorIds;
  }
  if (labelIds.length > 0) {
    payload["label_id"] = labelIds;
  }

  return payload;
}

async function withWebsocketClient<T>(
  command: Command,
  handler: (client: HomeAssistantWebSocketClient, format: string) => Promise<T>
): Promise<void> {
  const globalOpts = command.optsWithGlobals();
  const { config, format } = resolveCommandOptions(globalOpts);
  const client = new HomeAssistantWebSocketClient(config);
  try {
    const result = await handler(client, format);
    console.log(formatOutput(result, format));
  } finally {
    await client.close();
  }
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

function addTargetOptions(command: Command): Command {
  return command
    .option("--entity-id <ids>", "Comma-separated entity IDs")
    .option("--device-id <ids>", "Comma-separated device IDs")
    .option("--area-id <ids>", "Comma-separated area IDs")
    .option("--floor-id <ids>", "Comma-separated floor IDs")
    .option("--label-id <ids>", "Comma-separated label IDs");
}

function createWebsocketTargetCommand(): Command {
  const cmd = new Command("target")
    .description("Resolve Home Assistant targets (entity/device/area/floor/label) via WebSocket helpers")
    .addHelpText("after", `
Examples:
  hassio ws target extract --entity-id light.kitchen
  hassio ws target services --area-id kitchen
  hassio ws target related --label-id security
`);

  const extract = addTargetOptions(
    new Command("extract")
      .description("Expand target selectors into explicit IDs (WebSocket: extract_from_target)")
      .option("--expand-group", "Expand group members in target resolution", false)
  );

  extract.action(withExit(async (options: TargetOptions & { expandGroup?: boolean }, command) => {
    const target = toTargetPayload(options);
    await withWebsocketClient(command as Command, async (client) => {
      const result = await client.call("extract_from_target", {
        target,
        expand_group: options.expandGroup ?? false,
      });
      return { target, result };
    });
  }));

  const services = addTargetOptions(
    new Command("services")
      .description("List services available for a target (WebSocket: get_services_for_target)")
  );

  services.action(withExit(async (options: TargetOptions, command) => {
    const target = toTargetPayload(options);
    await withWebsocketClient(command as Command, async (client) => {
      const result = await client.call("get_services_for_target", { target });
      return { target, result };
    });
  }));

  const related = addTargetOptions(
    new Command("related")
      .description("Resolve and fetch matching entity/device/area/floor/label registry entries")
      .option("--expand-group", "Expand group members in target resolution", false)
  );

  related.action(withExit(async (options: TargetOptions & { expandGroup?: boolean }, command) => {
    const target = toTargetPayload(options);
    await withWebsocketClient(command as Command, async (client) => {
      const extracted = await client.call("extract_from_target", {
        target,
        expand_group: options.expandGroup ?? false,
      }) as Record<string, unknown>;

      const entityIds = Array.isArray(extracted["entity_ids"]) ? extracted["entity_ids"] as string[] : [];
      const deviceIds = Array.isArray(extracted["device_ids"]) ? extracted["device_ids"] as string[] : [];
      const areaIds = Array.isArray(extracted["area_ids"]) ? extracted["area_ids"] as string[] : [];
      const floorIds = Array.isArray(extracted["floor_ids"]) ? extracted["floor_ids"] as string[] : [];
      const labelIds = Array.isArray(extracted["label_ids"]) ? extracted["label_ids"] as string[] : [];

      const [entities, devices, areas, floors, labels] = await Promise.all([
        entityIds.length > 0 ? client.call("config/entity_registry/get_entries", { entity_ids: entityIds }) : Promise.resolve([]),
        deviceIds.length > 0 ? client.call("config/device_registry/list", { device_ids: deviceIds }) : Promise.resolve([]),
        areaIds.length > 0 ? client.call("config/area_registry/list", { area_ids: areaIds }) : Promise.resolve([]),
        floorIds.length > 0 ? client.call("config/floor_registry/list", { floor_ids: floorIds }) : Promise.resolve([]),
        labelIds.length > 0 ? client.call("config/label_registry/list", { label_ids: labelIds }) : Promise.resolve([]),
      ]);

      return {
        target,
        extracted,
        related: {
          entities,
          devices,
          areas,
          floors,
          labels,
        },
      };
    });
  }));

  cmd.addCommand(extract);
  cmd.addCommand(services);
  cmd.addCommand(related);
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
