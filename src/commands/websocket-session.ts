/**
 * Defines typed commands for stable Home Assistant WebSocket session operations.
 */
import { Command } from "commander";
import { HomeAssistantWebSocketClient } from "../api/websocket.js";
import { formatOutput } from "../formatters/index.js";
import { parseLimit, resolveCommandOptions } from "../utils/command-helpers.js";
import { withExit } from "../utils/exit.js";

type ExposureMap = Record<string, Record<string, boolean>>;
const SUPPORTED_ASSISTANTS = new Set(["conversation", "cloud.alexa", "cloud.google_assistant"]);

function splitCsv(value?: string): string[] {
  return value?.split(",").map((part) => part.trim()).filter(Boolean) ?? [];
}

async function outputCall(
  command: Command,
  type: string,
  payload?: Record<string, unknown>,
): Promise<void> {
  const { config, format } = resolveCommandOptions(command.optsWithGlobals());
  const client = new HomeAssistantWebSocketClient(config);
  try {
    console.log(formatOutput(await client.call(type, payload), format));
  } finally {
    await client.close();
  }
}

function createPanelsCommand(): Command {
  const command = new Command("panels")
    .description("List registered Home Assistant frontend panels");
  command.action(withExit(async (_options, cmd) => outputCall(cmd as Command, "get_panels")));
  return command;
}

function createPingCommand(): Command {
  const command = new Command("ping")
    .description("Verify WebSocket liveness with a protocol ping/pong");
  command.action(withExit(async (_options, cmd) => outputCall(cmd as Command, "ping")));
  return command;
}

function createSignPathCommand(): Command {
  const command = new Command("sign-path")
    .description("Create a short-lived authenticated path; treat the output as a credential")
    .requiredOption("--path <path>", "Instance-relative path beginning with /")
    .option("--expires <seconds>", "Positive lifetime in seconds (Home Assistant defaults to 30)");

  command.action(withExit(async (options: { path: string; expires?: string }, cmd) => {
    if (!options.path.startsWith("/")) {
      throw new Error("Signed path must begin with '/'");
    }
    const payload: Record<string, unknown> = { path: options.path };
    if (options.expires !== undefined) {
      const expires = parseLimit(options.expires);
      payload["expires"] = expires;
    }
    await outputCall(cmd as Command, "auth/sign_path", payload);
  }));
  return command;
}

function exposureRows(result: unknown): Array<Record<string, string | boolean>> {
  if (!result || typeof result !== "object") return [];
  const exposed = (result as { exposed_entities?: unknown }).exposed_entities;
  if (!exposed || typeof exposed !== "object") return [];
  return Object.entries(exposed as ExposureMap).flatMap(([entityId, assistants]) =>
    Object.entries(assistants).map(([assistant, exposedValue]) => ({
      entity_id: entityId,
      assistant,
      exposed: exposedValue,
    })),
  );
}

function createExposureListCommand(): Command {
  const command = new Command("list")
    .description("List explicit voice-assistant exposure settings as filterable rows")
    .option("--entity-id <ids>", "Comma-separated entity IDs")
    .option("--assistant <ids>", "Comma-separated assistant IDs")
    .option("--limit <n>", "Maximum rows to return")
    .option("--count", "Return only the matching row count");

  command.action(withExit(async (options: {
    entityId?: string;
    assistant?: string;
    limit?: string;
    count?: boolean;
  }, cmd) => {
    const { config, format } = resolveCommandOptions((cmd as Command).optsWithGlobals());
    const client = new HomeAssistantWebSocketClient(config);
    try {
      const entities = new Set(splitCsv(options.entityId));
      const assistants = new Set(splitCsv(options.assistant));
      const rows = exposureRows(await client.call("homeassistant/expose_entity/list"))
        .filter((row) => entities.size === 0 || entities.has(String(row["entity_id"])))
        .filter((row) => assistants.size === 0 || assistants.has(String(row["assistant"])));
      const limit = parseLimit(options.limit);
      console.log(formatOutput(options.count
        ? { count: rows.length }
        : { count: rows.length, exposures: limit ? rows.slice(0, limit) : rows }, format));
    } finally {
      await client.close();
    }
  }));
  return command;
}

function createExposureMutationCommand(name: "enable" | "disable", shouldExpose: boolean): Command {
  const command = new Command(name)
    .description(`${name === "enable" ? "Expose" : "Unexpose"} entities for voice assistants`)
    .requiredOption("--entity-id <ids>", "Comma-separated entity IDs")
    .requiredOption("--assistant <ids>", "Comma-separated assistant IDs");

  command.action(withExit(async (options: { entityId: string; assistant: string }, cmd) => {
    const { config, format } = resolveCommandOptions((cmd as Command).optsWithGlobals());
    if (config.readOnly) throw new Error("Read-only mode blocks entity exposure changes");
    const entityIds = splitCsv(options.entityId);
    const assistants = splitCsv(options.assistant);
    if (entityIds.length === 0 || assistants.length === 0) {
      throw new Error("At least one entity ID and assistant ID are required");
    }
    const unsupported = assistants.filter((assistant) => !SUPPORTED_ASSISTANTS.has(assistant));
    if (unsupported.length > 0) {
      throw new Error(`Unsupported assistant ID: ${unsupported.join(", ")}`);
    }
    const client = new HomeAssistantWebSocketClient(config);
    try {
      await client.call("homeassistant/expose_entity", {
        assistants,
        entity_ids: entityIds,
        should_expose: shouldExpose,
      });
      console.log(formatOutput({ assistants, entity_ids: entityIds, exposed: shouldExpose }, format));
    } finally {
      await client.close();
    }
  }));
  return command;
}

function createExposureCommand(): Command {
  const command = new Command("exposure")
    .description("Manage explicit voice-assistant entity exposure")
    .addHelpText("after", `
Assistant IDs: conversation | cloud.alexa | cloud.google_assistant

Examples:
  hassio ws exposure list --assistant conversation --limit 20
  hassio ws exposure enable --entity-id light.kitchen --assistant conversation
  hassio ws exposure disable --entity-id light.kitchen --assistant conversation
`);
  command.addCommand(createExposureListCommand());
  command.addCommand(createExposureMutationCommand("enable", true));
  command.addCommand(createExposureMutationCommand("disable", false));
  return command;
}

/** Build typed commands for stable WebSocket session and authentication operations. */
export function createWebsocketSessionCommands(): Command[] {
  return [createPanelsCommand(), createPingCommand(), createSignPathCommand(), createExposureCommand()];
}
