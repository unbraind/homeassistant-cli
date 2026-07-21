/**
 * Defines the websocket target command surface, options, help, and output behavior.
 */
import { Command } from "commander";
import { HomeAssistantWebSocketClient } from "../api/websocket.js";
import { formatOutput } from "../formatters/index.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";
import { withExit } from "../utils/exit.js";

type TargetOptions = {
  entityId?: string;
  deviceId?: string;
  areaId?: string;
  floorId?: string;
  labelId?: string;
};

type ExtractedTarget = {
  referenced_entities?: unknown;
  referenced_devices?: unknown;
  referenced_areas?: unknown;
  entity_ids?: unknown;
  device_ids?: unknown;
  area_ids?: unknown;
  floor_ids?: unknown;
  label_ids?: unknown;
  [key: string]: unknown;
};

function splitCsv(value?: string): string[] {
  return value?.split(",").map((part) => part.trim()).filter(Boolean) ?? [];
}

function unique(values: string[]): string[] {
  return [...new Set(values)];
}

function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function toTargetPayload(options: TargetOptions): Record<string, string[]> {
  const target: Record<string, string[]> = {};
  const mappings: Array<[keyof TargetOptions, string]> = [
    ["entityId", "entity_id"],
    ["deviceId", "device_id"],
    ["areaId", "area_id"],
    ["floorId", "floor_id"],
    ["labelId", "label_id"],
  ];

  for (const [option, field] of mappings) {
    const values = splitCsv(options[option]);
    if (values.length > 0) target[field] = values;
  }

  if (Object.keys(target).length === 0) {
    throw new Error("At least one target selector is required");
  }
  return target;
}

function extractedIds(extracted: ExtractedTarget, target: Record<string, string[]>) {
  return {
    entities: unique([
      ...stringArray(extracted.referenced_entities),
      ...stringArray(extracted.entity_ids),
    ]),
    devices: unique([
      ...stringArray(extracted.referenced_devices),
      ...stringArray(extracted.device_ids),
      ...(target["device_id"] ?? []),
    ]),
    areas: unique([
      ...stringArray(extracted.referenced_areas),
      ...stringArray(extracted.area_ids),
      ...(target["area_id"] ?? []),
    ]),
    floors: unique([...stringArray(extracted.floor_ids), ...(target["floor_id"] ?? [])]),
    labels: unique([...stringArray(extracted.label_ids), ...(target["label_id"] ?? [])]),
  };
}

function filterRegistry(result: unknown, ids: string[], fields: string[]): Record<string, unknown>[] {
  if (!Array.isArray(result) || ids.length === 0) return [];
  const wanted = new Set(ids);
  return result.filter((entry): entry is Record<string, unknown> => {
    if (!entry || typeof entry !== "object") return false;
    const row = entry as Record<string, unknown>;
    return fields.some((field) => typeof row[field] === "string" && wanted.has(row[field]));
  });
}

function normalizeEntityEntries(result: unknown): Record<string, unknown>[] {
  if (Array.isArray(result)) {
    return result.filter((entry): entry is Record<string, unknown> => Boolean(entry) && typeof entry === "object");
  }
  if (!result || typeof result !== "object") return [];
  return Object.entries(result as Record<string, unknown>).flatMap(([entityId, entry]) =>
    entry && typeof entry === "object"
      ? [{ entity_id: entityId, ...(entry as Record<string, unknown>) }]
      : []
  );
}

function collectEntryIds(entries: Record<string, unknown>[], field: string): string[] {
  return entries.flatMap((entry) => {
    const value = entry[field];
    return typeof value === "string" ? [value] : stringArray(value);
  });
}

async function withClient<T>(
  command: Command,
  handler: (client: HomeAssistantWebSocketClient) => Promise<T>
): Promise<void> {
  const { config, format } = resolveCommandOptions(command.optsWithGlobals());
  const client = new HomeAssistantWebSocketClient(config);
  try {
    console.log(formatOutput(await handler(client), format));
  } finally {
    await client.close();
  }
}

function addTargetOptions(command: Command): Command {
  return command
    .option("--entity-id <ids>", "Comma-separated entity IDs")
    .option("--device-id <ids>", "Comma-separated device IDs")
    .option("--area-id <ids>", "Comma-separated area IDs")
    .option("--floor-id <ids>", "Comma-separated floor IDs")
    .option("--label-id <ids>", "Comma-separated label IDs");
}

function createDiscoveryCommand(name: string, type: string, description: string): Command {
  const command = addTargetOptions(
    new Command(name)
      .description(description)
      .option("--no-expand-group", "Do not include primitives for group member entities")
  );
  command.action(withExit(async (options: TargetOptions & { expandGroup: boolean }, cmd) => {
    const target = toTargetPayload(options);
    await withClient(cmd as Command, async (client) => ({
      target,
      result: await client.call(type, { target, expand_group: options.expandGroup }),
    }));
  }));
  return command;
}

function createExtractCommand(): Command {
  const command = addTargetOptions(
    new Command("extract")
      .description("Expand selectors into referenced and missing target IDs")
      .option("--expand-group", "Expand group members in target resolution", false)
  );
  command.action(withExit(async (options: TargetOptions & { expandGroup: boolean }, cmd) => {
    const target = toTargetPayload(options);
    await withClient(cmd as Command, async (client) => ({
      target,
      result: await client.call("extract_from_target", {
        target,
        expand_group: options.expandGroup,
      }),
    }));
  }));
  return command;
}

function createRelatedCommand(): Command {
  const command = addTargetOptions(
    new Command("related")
      .description("Resolve target IDs and return only matching registry entries")
      .option("--expand-group", "Expand group members in target resolution", false)
  );
  command.action(withExit(async (options: TargetOptions & { expandGroup: boolean }, cmd) => {
    const target = toTargetPayload(options);
    await withClient(cmd as Command, async (client) => {
      const extracted = await client.call("extract_from_target", {
        target,
        expand_group: options.expandGroup,
      }) as ExtractedTarget;
      const ids = extractedIds(extracted, target);
      const entityResult = ids.entities.length
        ? await client.call("config/entity_registry/get_entries", { entity_ids: ids.entities })
        : [];
      const entities = normalizeEntityEntries(entityResult);
      ids.devices = unique([...ids.devices, ...collectEntryIds(entities, "device_id")]);
      ids.areas = unique([...ids.areas, ...collectEntryIds(entities, "area_id")]);
      ids.labels = unique([...ids.labels, ...collectEntryIds(entities, "labels")]);

      const deviceRegistry = ids.devices.length ? await client.call("config/device_registry/list") : [];
      const devices = filterRegistry(deviceRegistry, ids.devices, ["id", "device_id"]);
      ids.areas = unique([...ids.areas, ...collectEntryIds(devices, "area_id")]);
      ids.labels = unique([...ids.labels, ...collectEntryIds(devices, "labels")]);

      const areaRegistry = ids.areas.length ? await client.call("config/area_registry/list") : [];
      const areas = filterRegistry(areaRegistry, ids.areas, ["area_id", "id"]);
      ids.floors = unique([...ids.floors, ...collectEntryIds(areas, "floor_id")]);
      ids.labels = unique([...ids.labels, ...collectEntryIds(areas, "labels")]);

      const [floorRegistry, labelRegistry] = await Promise.all([
        ids.floors.length ? client.call("config/floor_registry/list") : [],
        ids.labels.length ? client.call("config/label_registry/list") : [],
      ]);

      return {
        target,
        extracted,
        related: {
          entities,
          devices,
          areas,
          floors: filterRegistry(floorRegistry, ids.floors, ["floor_id", "id"]),
          labels: filterRegistry(labelRegistry, ids.labels, ["label_id", "id"]),
        },
      };
    });
  }));
  return command;
}

export function createWebsocketTargetCommand(): Command {
  const command = new Command("target")
    .description("Resolve targets and discover applicable automation primitives")
    .addHelpText("after", `
Examples:
  hassio ws target extract --entity-id light.kitchen
  hassio ws target triggers --area-id kitchen
  hassio ws target conditions --label-id security
  hassio ws target services --area-id kitchen
  hassio ws target related --label-id security
`);

  command.addCommand(createExtractCommand());
  command.addCommand(createDiscoveryCommand("triggers", "get_triggers_for_target", "List triggers applicable to a target"));
  command.addCommand(createDiscoveryCommand("conditions", "get_conditions_for_target", "List conditions applicable to a target"));
  command.addCommand(createDiscoveryCommand("services", "get_services_for_target", "List services applicable to a target"));
  command.addCommand(createRelatedCommand());
  return command;
}
