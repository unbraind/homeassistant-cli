/**
 * Defines the history command surface, options, help, and output behavior.
 */
import { Command } from "commander";
import { HomeAssistantClient } from "../api/index.js";
import { formatHistory, formatLogbook, formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createHistoryCommand(): Command {
  const command = new Command("history")
    .description("Get state history for entities")
    .requiredOption("-e, --entity-id <entities>", "Entity ID(s), comma-separated")
    .option("-s, --start-time <timestamp>", "Start time (ISO format)")
    .option("--end-time <timestamp>", "End time (ISO format)")
    .option("-m, --minimal-response", "Use minimal response format", false)
    .option("--no-attributes", "Exclude attributes from response", false)
    .option("--significant-only", "Only significant changes", false);

  command.action(withExit(async (options, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

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
  }));

  return command;
}

export function createLogbookCommand(): Command {
  const command = new Command("logbook")
    .description("Get logbook entries")
    .option("-e, --entity-id <entity>", "Filter by entity ID")
    .option("-s, --start-time <timestamp>", "Start time (ISO format)")
    .option("--end-time <timestamp>", "End time (ISO format)");

  command.action(withExit(async (options, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    const result = await client.getLogbook({
      entityId: options.entityId,
      startTime: options.startTime,
      endTime: options.endTime,
    });
    console.log(formatLogbook(result, format));
  }));

  return command;
}

export function createErrorLogCommand(): Command {
  return new Command("error-log")
    .description("Get the Home Assistant error log")
    .action(withExit(async (_options, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const { config, format } = resolveCommandOptions(globalOpts);
      const client = new HomeAssistantClient(config);
      const result = await client.getErrorLog();
      console.log(formatOutput({ error_log: result }, format));
    }));
}
