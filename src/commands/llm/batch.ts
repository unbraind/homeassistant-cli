import { Command } from "commander";
import { formatOutput } from "../../formatters/index.js";
import { withExit } from "../../utils/exit.js";
import { getClient, getFormat } from "./shared.js";

interface BatchOptions {
  domain: string;
  service: string;
  entities: string;
  data?: string;
}

interface BatchResult {
  entity_id: string;
  success: boolean;
  result?: unknown;
  error?: string;
}

export function createBatchCommand(): Command {
  const command = new Command("batch")
    .description("Execute multiple service calls in batch")
    .requiredOption("-d, --domain <domain>", "Service domain")
    .requiredOption("-s, --service <service>", "Service name")
    .requiredOption("-e, --entities <entities>", "Comma-separated entity IDs")
    .option("--data <json>", "JSON data to pass to each service call");

  command.action(withExit(async (options: BatchOptions, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

    const entities = options.entities.split(",").map((entityId) => entityId.trim());
    const baseData = options.data ? JSON.parse(options.data) as Record<string, unknown> : {};

    const results: BatchResult[] = [];

    for (const entityId of entities) {
      try {
        const data = { ...baseData, entity_id: entityId };
        const result = await client.callService(options.domain, options.service, data);
        results.push({ entity_id: entityId, success: true, result });
      } catch (error) {
        results.push({
          entity_id: entityId,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    console.log(formatOutput({
      total: entities.length,
      successful: results.filter((result) => result.success).length,
      failed: results.filter((result) => !result.success).length,
      results,
    }, format));
  }));

  return command;
}
