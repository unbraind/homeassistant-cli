import { Command } from "commander";
import { formatOutput, formatStates } from "../../formatters/index.js";
import { withExit } from "../../utils/exit.js";
import type { HaState } from "../../types/index.js";
import { getClient, getFormat, parseLimit } from "./shared.js";

interface QueryOptions {
  summary?: boolean;
  limit?: string;
}

function applyCondition(states: HaState[], condition: string): HaState[] {
  if (condition.startsWith("domain:")) {
    const domain = condition.slice(7);
    return states.filter((s: HaState) => s.entity_id.startsWith(`${domain}.`));
  }

  if (condition.startsWith("state:")) {
    const state = condition.slice(6);
    return states.filter((s: HaState) => s.state === state);
  }

  if (condition.startsWith("attributes:")) {
    const attrSpec = condition.slice(11);
    const [attrName, attrValue] = attrSpec.split("=");
    return states.filter((s: HaState) => {
      const val = s.attributes[attrName ?? ""];
      if (attrValue === undefined) {
        return val !== undefined;
      }
      return String(val) === attrValue;
    });
  }

  if (condition.startsWith("name:")) {
    const pattern = condition.slice(5).toLowerCase();
    return states.filter((s: HaState) => s.entity_id.toLowerCase().includes(pattern));
  }

  return states;
}

export function createQueryCommand(): Command {
  const command = new Command("query")
    .description("Query entities using simple expressions (LLM-friendly)")
    .argument("<expression>", "Query expression (e.g., 'domain:light state:on', 'domain:sensor attributes:unit_of_measurement=C')")
    .option("--summary", "Return summary statistics only")
    .option("-l, --limit <n>", "Limit returned entities (non-summary mode)");

  command.action(withExit(async (expression: string, options: QueryOptions, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

    const states = await client.getStates();
    const conditions = expression.split(/\s+/).filter(Boolean);

    let filtered = states;
    for (const condition of conditions) {
      filtered = applyCondition(filtered, condition);
    }

    if (options.summary) {
      const byState = filtered.reduce((acc: Record<string, number>, s: HaState) => {
        acc[s.state] = (acc[s.state] || 0) + 1;
        return acc;
      }, {});

      const byDomain = filtered.reduce((acc: Record<string, number>, s: HaState) => {
        const domain = s.entity_id.split(".")[0] || "unknown";
        acc[domain] = (acc[domain] || 0) + 1;
        return acc;
      }, {});

      console.log(formatOutput({ total: filtered.length, by_state: byState, by_domain: byDomain }, format));
      return;
    }

    const limit = parseLimit(options.limit);
    console.log(formatStates(limit ? filtered.slice(0, limit) : filtered, format));
  }));

  return command;
}
