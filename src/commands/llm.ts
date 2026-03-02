import { Command } from "commander";
import { getConfig } from "../config/index.js";
import { HomeAssistantClient } from "../api/index.js";
import { formatOutput, formatStates } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import type { OutputFormat, HaState } from "../types/index.js";

function getClient(options: { url?: string; token?: string; format?: OutputFormat; timeout?: number }) {
  const config = getConfig(options);
  return new HomeAssistantClient(config);
}

function getFormat(options: { format?: OutputFormat }): OutputFormat {
  const config = getConfig(options);
  return config.outputFormat;
}

function parseLimit(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const limit = parseInt(value, 10);
  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error(`Invalid limit '${value}'. Must be a positive integer.`);
  }

  return limit;
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

  command.action(withExit(async (options: {
    domain?: string;
    state?: string;
    pattern?: string;
    attributes?: string;
    limit?: string;
    count?: boolean;
    domains?: boolean;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

    const states = await client.getStates();

    let filtered = states;

    if (options.domain) {
      filtered = filtered.filter((s: HaState) => 
        s.entity_id.startsWith(`${options.domain}.`)
      );
    }

    if (options.state) {
      filtered = filtered.filter((s: HaState) => s.state === options.state);
    }

    if (options.pattern) {
      const pattern = options.pattern.toLowerCase();
      filtered = filtered.filter((s: HaState) => 
        s.entity_id.toLowerCase().includes(pattern)
      );
    }

    if (options.count) {
      console.log(formatOutput({ count: filtered.length }, format));
      return;
    }

    if (options.domains) {
      const domainCounts = filtered.reduce((acc: Record<string, number>, s: HaState) => {
        const domain = s.entity_id.split(".")[0] || "unknown";
        acc[domain] = (acc[domain] || 0) + 1;
        return acc;
      }, {});
      
      const result = Object.entries(domainCounts)
        .map(([domain, count]) => ({ domain, count }))
        .sort((a, b) => b.count - a.count);

      const limit = parseLimit(options.limit);
      const limited = limit ? result.slice(0, limit) : result;
      console.log(formatOutput(limited, format));
      return;
    }

    const limit = parseLimit(options.limit);
    const limited = limit ? filtered.slice(0, limit) : filtered;

    if (options.attributes) {
      const attrs = options.attributes.split(",").map(a => a.trim());
      const mappedStates = limited.map((s: HaState) => ({
        entity_id: s.entity_id,
        state: s.state,
        last_changed: s.last_changed,
        last_updated: s.last_updated,
        attributes: Object.fromEntries(
          Object.entries(s.attributes).filter(([k]) => attrs.includes(k))
        ),
      }));
      console.log(formatOutput(mappedStates, format));
      return;
    }

    console.log(formatStates(limited, format));
  }));

  return command;
}

export function createBatchCommand(): Command {
  const command = new Command("batch")
    .description("Execute multiple service calls in batch")
    .requiredOption("-d, --domain <domain>", "Service domain")
    .requiredOption("-s, --service <service>", "Service name")
    .requiredOption("-e, --entities <entities>", "Comma-separated entity IDs")
    .option("--data <json>", "JSON data to pass to each service call");

  command.action(withExit(async (options: {
    domain: string;
    service: string;
    entities: string;
    data?: string;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

    const entities = options.entities.split(",").map(e => e.trim());
    const baseData = options.data ? JSON.parse(options.data) as Record<string, unknown> : {};

    const results: Array<{ entity_id: string; success: boolean; result?: unknown; error?: string }> = [];

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
      successful: results.filter(r => r.success).length,
      failed: results.filter(r => !r.success).length,
      results,
    }, format));
  }));

  return command;
}

export function createQueryCommand(): Command {
  const command = new Command("query")
    .description("Query entities using simple expressions (LLM-friendly)")
    .argument("<expression>", "Query expression (e.g., 'domain:light state:on', 'domain:sensor attributes:unit_of_measurement=C')")
    .option("--summary", "Return summary statistics only")
    .option("-l, --limit <n>", "Limit returned entities (non-summary mode)");

  command.action(withExit(async (expression: string, options: { summary?: boolean; limit?: string }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

    const states = await client.getStates();
    
    const conditions = expression.split(/\s+/).filter(Boolean);
    let filtered = states;

    for (const condition of conditions) {
      if (condition.startsWith("domain:")) {
        const domain = condition.slice(7);
        filtered = filtered.filter((s: HaState) => s.entity_id.startsWith(`${domain}.`));
      } else if (condition.startsWith("state:")) {
        const state = condition.slice(6);
        filtered = filtered.filter((s: HaState) => s.state === state);
      } else if (condition.startsWith("attributes:")) {
        const attrSpec = condition.slice(11);
        const [attrName, attrValue] = attrSpec.split("=");
        filtered = filtered.filter((s: HaState) => {
          const val = s.attributes[attrName ?? ""];
          if (attrValue === undefined) return val !== undefined;
          return String(val) === attrValue;
        });
      } else if (condition.startsWith("name:")) {
        const pattern = condition.slice(5).toLowerCase();
        filtered = filtered.filter((s: HaState) => 
          s.entity_id.toLowerCase().includes(pattern)
        );
      }
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

      console.log(formatOutput({
        total: filtered.length,
        by_state: byState,
        by_domain: byDomain,
      }, format));
    } else {
      const limit = options.limit ? parseInt(options.limit, 10) : undefined;
      const limited = limit && limit > 0 ? filtered.slice(0, limit) : filtered;
      console.log(formatStates(limited, format));
    }
  }));

  return command;
}

export function createDiscoverCommand(): Command {
  const command = new Command("discover")
    .description("Discover and categorize all Home Assistant entities")
    .option("--domains", "List all domains with counts")
    .option("--unavailable", "List unavailable entities")
    .option("--by-area", "Group by area (requires area registry access)")
    .option("-l, --limit <n>", "Limit returned rows for list views");

  command.action(withExit(async (options: {
    domains?: boolean;
    unavailable?: boolean;
    byArea?: boolean;
    limit?: string;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

    const states = await client.getStates();

    if (options.unavailable) {
      const unavailable = states.filter((s: HaState) => s.state === "unavailable" || s.state === "unknown");
      const limit = options.limit ? parseInt(options.limit, 10) : undefined;
      const limited = limit && limit > 0 ? unavailable.slice(0, limit) : unavailable;
      console.log(formatStates(limited, format));
      return;
    }

    if (options.domains) {
      const domainStats = states.reduce((acc: Record<string, { count: number; states: Record<string, number> }>, s: HaState) => {
        const domain = s.entity_id.split(".")[0] || "unknown";
        if (!acc[domain]) {
          acc[domain] = { count: 0, states: {} };
        }
        acc[domain].count++;
        acc[domain].states[s.state] = (acc[domain].states[s.state] || 0) + 1;
        return acc;
      }, {});

      const result = Object.entries(domainStats)
        .map(([domain, stats]) => ({ domain, ...stats }))
        .sort((a, b) => b.count - a.count);
      const limit = options.limit ? parseInt(options.limit, 10) : undefined;
      const limited = limit && limit > 0 ? result.slice(0, limit) : result;
      console.log(formatOutput(limited, format));
      return;
    }

    const total = states.length;
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
      entities: total,
      domains: Object.keys(byDomain).length,
      unavailable,
      top_domains: Object.entries(byDomain)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 10)
        .map(([name, count]) => ({ name, count })),
      states: Object.entries(byState)
        .sort(([,a], [,b]) => (b as number) - (a as number))
        .slice(0, 10)
        .reduce((acc, [k, v]) => ({ ...acc, [k]: v }), {}),
    }, format));
  }));

  return command;
}
