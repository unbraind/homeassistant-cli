import { Command } from "commander";
import { HomeAssistantClient } from "../api/index.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createInspectCommand(): Command {
  const command = new Command("inspect")
    .description("Deep inspect an entity with full details and history")
    .argument("<entity-id>", "Entity ID to inspect")
    .option("--history", "Include recent history")
    .option("-l, --limit <n>", "History entries limit", "10");

  command.action(withExit(async (entityId: string, options: { history?: boolean; limit?: string }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

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
    .description("Get a summary of all entities by domain and state")
    .option("--top-states <n>", "Limit state distribution to top N entries (default: 20)", "20")
    .option("--full-states", "Include complete state distribution without truncation");

  command.action(withExit(async (
    options: { topStates?: string; fullStates?: boolean },
    cmd,
  ) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

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
    const sortedStates = Object.entries(byState)
      .sort(([, leftCount], [, rightCount]) => rightCount - leftCount);
    const parsedTopStates = parseInt(options.topStates || "20", 10);
    const topStateLimit = Number.isFinite(parsedTopStates) && parsedTopStates > 0 ? parsedTopStates : 20;
    const stateEntries = options.fullStates ? sortedStates : sortedStates.slice(0, topStateLimit);
    const topStates = stateEntries.reduce<Record<string, number>>((acc, [state, count]) => {
      acc[state] = count;
      return acc;
    }, {});
    const otherStateCount = options.fullStates
      ? 0
      : sortedStates.slice(topStateLimit).reduce((acc, [, count]) => acc + count, 0);

    const unavailable = states.filter(s => s.state === "unavailable").length;

    console.log(formatOutput({
      total_entities: states.length,
      domains: Object.keys(byDomain).length,
      by_domain: byDomain,
      by_state_top: topStates,
      ...(options.fullStates ? { by_state: byState } : {}),
      ...(otherStateCount > 0 ? { by_state_other_count: otherStateCount } : {}),
      unavailable_count: unavailable,
    }, format));
  }));

  return command;
}
