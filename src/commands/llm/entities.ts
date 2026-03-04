import { Command } from "commander";
import { formatOutput, formatStates } from "../../formatters/index.js";
import { withExit } from "../../utils/exit.js";
import type { HaState } from "../../types/index.js";
import { resolveCommandOptions, parseLimit } from "../../utils/command-helpers.js";
import { HomeAssistantClient } from "../../api/client.js";

interface EntitiesOptions {
  domain?: string;
  state?: string;
  pattern?: string;
  attributes?: string;
  limit?: string;
  count?: boolean;
  domains?: boolean;
}

function toDomainCounts(states: HaState[]): Array<{ domain: string; count: number }> {
  const domainCounts = states.reduce((acc: Record<string, number>, s: HaState) => {
    const domain = s.entity_id.split(".")[0] || "unknown";
    acc[domain] = (acc[domain] || 0) + 1;
    return acc;
  }, {});

  return Object.entries(domainCounts)
    .map(([domain, count]) => ({ domain, count }))
    .sort((a, b) => b.count - a.count);
}

export function createEntitiesCommand(): Command {
  const command = new Command("entities")
    .description("List entities with optional filtering (LLM-optimized)")
    .option("-d, --domain <domain>", "Filter by domain (e.g., light, sensor)")
    .option("-s, --state <state>", "Filter by state (e.g., on, off, unavailable)")
    .option("-p, --pattern <pattern>", "Filter by entity_id pattern (substring match)")
    .option("-a, --attributes <attrs>", "Include specific attributes (comma-separated)")
    .option("-l, --limit <n>", "Limit returned rows")
    .option("--count", "Only return count, not full list")
    .option("--domains", "Group and count by domain");

  command.action(withExit(async (options: EntitiesOptions, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    const states = await client.getStates();

    let filtered = states;
    if (options.domain) {
      filtered = filtered.filter((s: HaState) => s.entity_id.startsWith(`${options.domain}.`));
    }
    if (options.state) {
      filtered = filtered.filter((s: HaState) => s.state === options.state);
    }
    if (options.pattern) {
      const pattern = options.pattern.toLowerCase();
      filtered = filtered.filter((s: HaState) => s.entity_id.toLowerCase().includes(pattern));
    }

    if (options.count) {
      console.log(formatOutput({ count: filtered.length }, format));
      return;
    }

    if (options.domains) {
      const limit = parseLimit(options.limit);
      const result = toDomainCounts(filtered);
      console.log(formatOutput(limit ? result.slice(0, limit) : result, format));
      return;
    }

    const limit = parseLimit(options.limit);
    const limited = limit ? filtered.slice(0, limit) : filtered;

    if (options.attributes) {
      const attrs = options.attributes.split(",").map((attr) => attr.trim());
      const mappedStates = limited.map((s: HaState) => ({
        entity_id: s.entity_id,
        state: s.state,
        last_changed: s.last_changed,
        last_updated: s.last_updated,
        attributes: Object.fromEntries(Object.entries(s.attributes).filter(([key]) => attrs.includes(key))),
      }));
      console.log(formatOutput(mappedStates, format));
      return;
    }

    console.log(formatStates(limited, format));
  }));

  return command;
}
