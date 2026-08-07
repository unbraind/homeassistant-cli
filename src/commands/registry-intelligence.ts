/**
 * Defines typed Home Assistant registry topology and entity-ID settings commands.
 */
import { Command } from "commander";
import { WebSocketRegistryClient } from "../api/registries.js";
import { formatOutput } from "../formatters/index.js";
import type { HaEntityNamePart } from "../types/api.js";
import { formatBoundedRows, resolveCommandOptions } from "../utils/command-helpers.js";
import { withExit } from "../utils/exit.js";

type ListOptions = {
  all?: boolean;
  count?: boolean;
  limit?: string;
};

const ENTITY_ID_PATTERN = /^[a-z0-9_]+\.[a-z0-9_]+$/;
const ENTITY_NAME_PARTS = new Set<HaEntityNamePart>(["area", "device", "entity", "floor"]);

function addListOptions(command: Command): Command {
  return command
    .option("--limit <n>", "Maximum rows to return unless --all is set", "100")
    .option("--all", "Return every row")
    .option("--count", "Return only the row count");
}

function parseEntityIds(values: string[]): string[] {
  const entityIds = [...new Set(values.flatMap((value) => value.split(",")).map((value) => value.trim()).filter(Boolean))];
  const invalid = entityIds.find((entityId) => !ENTITY_ID_PATTERN.test(entityId));
  if (invalid) throw new Error(`Invalid entity ID '${invalid}'. Expected domain.object_id.`);
  if (entityIds.length === 0) throw new Error("Provide at least one entity ID.");
  return entityIds;
}

function parseEntityNameParts(value: string): HaEntityNamePart[] {
  const parts = value.split(",").map((part) => part.trim()).filter(Boolean);
  const invalid = parts.find((part) => !ENTITY_NAME_PARTS.has(part as HaEntityNamePart));
  if (invalid) throw new Error(`Invalid entity-ID part '${invalid}'. Use floor, area, device, or entity.`);
  if (new Set(parts).size !== parts.length) throw new Error("Entity-ID parts must be unique.");
  if (!parts.includes("device") || !parts.includes("entity")) {
    throw new Error("Entity-ID parts must include both device and entity.");
  }
  return parts as HaEntityNamePart[];
}

async function outputRegistryResult<Result>(
  command: Command,
  request: (client: WebSocketRegistryClient) => Promise<Result>,
  normalize: (result: Result) => Record<string, unknown>,
): Promise<void> {
  const { config, format } = resolveCommandOptions(command.optsWithGlobals());
  const client = new WebSocketRegistryClient(config);
  try {
    console.log(formatOutput(normalize(await request(client)), format));
  } finally {
    await client.close();
  }
}

function createCompositeSplitsCommand(): Command {
  const command = addListOptions(new Command("composite-splits")
    .description("List legacy composite device IDs and their Core 2026.8 split replacements"));
  command.action(withExit(async (_options, cmd) => {
    const globalOptions = cmd.optsWithGlobals();
    const options = globalOptions as typeof globalOptions & ListOptions;
    await outputRegistryResult(cmd as Command, (client) => client.getCompositeDeviceSplits(), (result) => {
      const rows = Object.entries(result).map(([compositeDeviceId, split]) => ({
        composite_device_id: compositeDeviceId,
        primary_device_id: split.primary_id,
        split_device_ids: [...split.split_ids].sort((left, right) => left.localeCompare(right, "en")),
      })).sort((left, right) => left.composite_device_id.localeCompare(right.composite_device_id, "en"));
      return formatBoundedRows(rows, options, "composite_splits");
    });
  }));
  return command;
}

function createLinkedDevicesCommand(): Command {
  const command = addListOptions(new Command("linked-devices")
    .description("List devices in other config entries that share identifiers or connections")
    .argument("<device-id>", "Home Assistant device registry ID"));
  command.action(withExit(async (deviceId: string, _options, cmd) => {
    const globalOptions = cmd.optsWithGlobals();
    const options = globalOptions as typeof globalOptions & ListOptions;
    await outputRegistryResult(cmd as Command, (client) => client.getLinkedDevices(deviceId), (result) => {
      const rows = [...result.linked_devices]
        .sort((left, right) => left.localeCompare(right, "en"))
        .map((linkedDeviceId) => ({ device_id: linkedDeviceId }));
      return {
        source_device_id: deviceId,
        ...formatBoundedRows(rows, options, "linked_devices"),
      };
    });
  }));
  return command;
}

function createAutomaticEntityIdsCommand(): Command {
  const command = new Command("automatic-entity-ids")
    .description("Preview automatic entity IDs for existing or proposed registry IDs")
    .argument("<entity-ids...>", "Entity IDs as space- or comma-separated values");
  command.action(withExit(async (values: string[], _options, cmd) => {
    const entityIds = parseEntityIds(values);
    await outputRegistryResult(cmd as Command, (client) => client.getAutomaticEntityIds(entityIds), (result) => ({
        count: entityIds.length,
        entity_ids: entityIds.map((entityId) => ({
          entity_id: entityId,
          automatic_entity_id: result[entityId] ?? null,
        })),
    }));
  }));
  return command;
}

function createEntityIdSettingsCommand(): Command {
  const command = new Command("entity-id-settings")
    .description("Inspect or update Core 2026.8 automatic entity-ID naming policy");
  const get = new Command("get").description("Get the global entity-ID naming parts override");
  get.action(withExit(async (_options, cmd) => {
    await outputRegistryResult(cmd as Command, (client) => client.getEntityIdSettings(), (result) => ({
      ...result,
      uses_default: result.entity_id_parts === null,
    }));
  }));
  const update = new Command("update")
    .description("Set or reset the admin-only entity-ID naming parts override")
    .option("--parts <parts>", "Ordered CSV of floor,area,device,entity; device and entity are required")
    .option("--reset", "Restore Home Assistant's default naming policy");
  update.action(withExit(async (options: { parts?: string; reset?: boolean }, cmd) => {
    if (Boolean(options.parts) === Boolean(options.reset)) {
      throw new Error("Choose exactly one of --parts or --reset.");
    }
    const entityIdParts = options.reset ? null : parseEntityNameParts(options.parts as string);
    await outputRegistryResult(cmd as Command, (client) => client.updateEntityIdSettings(entityIdParts), (result) => ({
      ...result,
      updated: true,
      uses_default: result.entity_id_parts === null,
    }));
  }));
  command.addCommand(get);
  command.addCommand(update);
  return command;
}

/** Build typed registry topology and naming-policy subcommands. */
export function createRegistryIntelligenceCommands(): Command[] {
  return [
    createCompositeSplitsCommand(),
    createLinkedDevicesCommand(),
    createAutomaticEntityIdsCommand(),
    createEntityIdSettingsCommand(),
  ];
}
