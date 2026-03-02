import { Command } from "commander";
import { formatOutput, formatStates } from "../../formatters/index.js";
import { withExit } from "../../utils/exit.js";
import type { HaState } from "../../types/index.js";
import { getClient, getFormat, parseLimit } from "./shared.js";

interface DiscoverOptions {
  domains?: boolean;
  unavailable?: boolean;
  byArea?: boolean;
  limit?: string;
}

export function createDiscoverCommand(): Command {
  const command = new Command("discover")
    .description("Discover and categorize all Home Assistant entities")
    .option("--domains", "List all domains with counts")
    .option("--unavailable", "List unavailable entities")
    .option("--by-area", "Group by area (requires area registry access)")
    .option("-l, --limit <n>", "Limit returned rows for list views");

  command.action(withExit(async (options: DiscoverOptions, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

    const states = await client.getStates();

    if (options.unavailable) {
      const unavailable = states.filter((s: HaState) => s.state === "unavailable" || s.state === "unknown");
      const limit = parseLimit(options.limit);
      console.log(formatStates(limit ? unavailable.slice(0, limit) : unavailable, format));
      return;
    }

    if (options.domains) {
      const domainStats = states.reduce((acc: Record<string, { count: number; states: Record<string, number> }>, s: HaState) => {
        const domain = s.entity_id.split(".")[0] || "unknown";
        if (!acc[domain]) {
          acc[domain] = { count: 0, states: {} };
        }
        acc[domain].count += 1;
        acc[domain].states[s.state] = (acc[domain].states[s.state] || 0) + 1;
        return acc;
      }, {});

      const result = Object.entries(domainStats)
        .map(([domain, stats]) => ({ domain, ...stats }))
        .sort((a, b) => b.count - a.count);

      const limit = parseLimit(options.limit);
      console.log(formatOutput(limit ? result.slice(0, limit) : result, format));
      return;
    }

    const byDomain = states.reduce((acc: Record<string, number>, s: HaState) => {
      const domain = s.entity_id.split(".")[0] || "unknown";
      acc[domain] = (acc[domain] || 0) + 1;
      return acc;
    }, {});

    const byState = states.reduce((acc: Record<string, number>, s: HaState) => {
      acc[s.state] = (acc[s.state] || 0) + 1;
      return acc;
    }, {});

    const unavailable = states.filter((s: HaState) => s.state === "unavailable").length;

    console.log(formatOutput({
      entities: states.length,
      domains: Object.keys(byDomain).length,
      unavailable,
      top_domains: Object.entries(byDomain)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([name, count]) => ({ name, count })),
      states: Object.entries(byState)
        .sort(([, a], [, b]) => (b as number) - (a as number))
        .slice(0, 10)
        .reduce((acc, [name, count]) => ({ ...acc, [name]: count }), {}),
    }, format));
  }));

  return command;
}
