import { Command } from "commander";
import { getConfig } from "../config/index.js";
import { HomeAssistantClient } from "../api/index.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import type { OutputFormat } from "../types/index.js";

function getClient(options: { url?: string; token?: string; format?: OutputFormat; timeout?: number }) {
  const config = getConfig(options);
  return new HomeAssistantClient(config);
}

function getFormat(options: { format?: OutputFormat }): OutputFormat {
  const config = getConfig(options);
  return config.outputFormat;
}

export function createInspectCommand(): Command {
  const command = new Command("inspect")
    .description("Deep inspect an entity with full details and history")
    .argument("<entity-id>", "Entity ID to inspect")
    .option("--history", "Include recent history")
    .option("-l, --limit <n>", "History entries limit", "10");

  command.action(withExit(async (entityId: string, options: { history?: boolean; limit?: string }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

    const state = await client.getState(entityId);
    
    const result: Record<string, unknown> = {
      entity_id: state.entity_id,
      state: state.state,
      attributes: state.attributes,
      last_changed: state.last_changed,
      last_updated: state.last_updated,
    };

    if (options.history) {
      const endTime = new Date().toISOString();
      const startTime = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const limit = parseInt(options.limit || "10", 10);
      
      try {
        const history = await client.getHistory({
          entityId: entityId,
          startTime,
          endTime,
          minimalResponse: true,
        });
        
        const entityHistory = history[0] || [];
        result["recent_history"] = entityHistory.slice(-limit);
      } catch (error) {
        result["history_error"] = error instanceof Error ? error.message : String(error);
      }
    }

    console.log(formatOutput(result, format));
  }));

  return command;
}

export function createSummaryCommand(): Command {
  const command = new Command("summary")
    .description("Get a summary of all entities by domain and state");

  command.action(withExit(async (_options, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

    const states = await client.getStates();

    const byDomain = states.reduce((acc: Record<string, number>, s) => {
      const domain = s.entity_id.split(".")[0] || "unknown";
      acc[domain] = (acc[domain] || 0) + 1;
      return acc;
    }, {});

    const byState = states.reduce((acc: Record<string, number>, s) => {
      acc[s.state] = (acc[s.state] || 0) + 1;
      return acc;
    }, {});

    const unavailable = states.filter(s => s.state === "unavailable").length;

    console.log(formatOutput({
      total_entities: states.length,
      domains: Object.keys(byDomain).length,
      by_domain: byDomain,
      by_state: byState,
      unavailable_count: unavailable,
    }, format));
  }));

  return command;
}
