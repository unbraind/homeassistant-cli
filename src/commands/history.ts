import { Command } from "commander";
import { getConfig } from "../config/index.js";
import { HomeAssistantClient } from "../api/index.js";
import { formatHistory, formatLogbook } from "../formatters/index.js";
import type { OutputFormat } from "../types/index.js";

function getClient(options: { url?: string; token?: string; format?: OutputFormat; timeout?: number }) {
  const config = getConfig(options);
  return new HomeAssistantClient(config);
}

function getFormat(options: { format?: OutputFormat }): OutputFormat {
  const config = getConfig(options);
  return config.outputFormat;
}

export function createHistoryCommand(): Command {
  const command = new Command("history")
    .description("Get state history for entities")
    .requiredOption("-e, --entity-id <entities>", "Entity ID(s), comma-separated")
    .option("-s, --start-time <timestamp>", "Start time (ISO format)")
    .option("--end-time <timestamp>", "End time (ISO format)")
    .option("-m, --minimal-response", "Use minimal response format", false)
    .option("--no-attributes", "Exclude attributes from response", false)
    .option("--significant-only", "Only significant changes", false);

  command.action(async (options, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

    const entities = options.entityId.split(",").map((e: string) => e.trim());
    const result = await client.getHistory({
      entityId: entities,
      startTime: options.startTime,
      endTime: options.endTime,
      minimalResponse: options.minimalResponse,
      noAttributes: options.noAttributes,
      significantChangesOnly: options.significantOnly,
    });
    console.log(formatHistory(result, format));
  });

  return command;
}

export function createLogbookCommand(): Command {
  const command = new Command("logbook")
    .description("Get logbook entries")
    .option("-e, --entity-id <entity>", "Filter by entity ID")
    .option("-s, --start-time <timestamp>", "Start time (ISO format)")
    .option("--end-time <timestamp>", "End time (ISO format)");

  command.action(async (options, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

    const result = await client.getLogbook({
      entityId: options.entityId,
      startTime: options.startTime,
      endTime: options.endTime,
    });
    console.log(formatLogbook(result, format));
  });

  return command;
}

export function createErrorLogCommand(): Command {
  return new Command("error-log")
    .description("Get the Home Assistant error log")
    .action(async (_options, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const client = getClient(globalOpts);
      const result = await client.getErrorLog();
      console.log(result);
    });
}
