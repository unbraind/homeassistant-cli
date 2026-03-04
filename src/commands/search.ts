import { Command } from "commander";
import { SearchApiClient } from "../api/search.js";
import { formatOutput, formatStates } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createSearchCommand(): Command {
  const command = new Command("search")
    .description("Search Home Assistant entities")
    .argument("<query>", "Search query")
    .option("-d, --domain <domain>", "Filter by domain")
    .option("-a, --area <area>", "Filter by area")
    .option("-s, --state <state>", "Filter by state")
    .option("--quick", "Use quick local search (no API)")
    .option("--count", "Only return count")
    .option("-l, --limit <n>", "Limit returned rows");

  command.action(withExit(async (query: string, options: {
    domain?: string;
    area?: string;
    state?: string;
    quick?: boolean;
    count?: boolean;
    limit?: string;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new SearchApiClient(config);

    if (options.quick) {
      const quickResults = await client.quickSearch(query);
      const limit = options.limit ? parseInt(options.limit, 10) : undefined;
      const results = limit && limit > 0 ? quickResults.slice(0, limit) : quickResults;
      if (options.count) {
        console.log(formatOutput({ count: results.length }, format));
      } else {
        console.log(formatStates(results, format));
      }
      return;
    }

    let results = await client.search(query);

    if (options.domain) {
      results = results.filter(r => r.domain === options.domain);
    }
    if (options.area) {
      results = results.filter(r => r.area === options.area);
    }
    if (options.state) {
      results = results.filter(r => r.state === options.state);
    }
    const limit = options.limit ? parseInt(options.limit, 10) : undefined;
    if (limit && limit > 0) {
      results = results.slice(0, limit);
    }

    if (options.count) {
      console.log(formatOutput({ count: results.length }, format));
      return;
    }

    console.log(formatOutput({ results }, format));
  }));

  return command;
}

export function createFindCommand(): Command {
  const command = new Command("find")
    .description("Quick search for entities by name/ID pattern")
    .argument("<pattern>", "Search pattern")
    .option("-d, --domain <domain>", "Filter by domain")
    .option("-s, --state <state>", "Filter by state")
    .option("--count", "Only return count");

  command.action(withExit(async (pattern: string, options: {
    domain?: string;
    state?: string;
    count?: boolean;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new SearchApiClient(config);

    let results = await client.quickSearch(pattern);

    if (options.domain) {
      results = results.filter(s => s.entity_id.startsWith(`${options.domain}.`));
    }
    if (options.state) {
      results = results.filter(s => s.state === options.state);
    }

    if (options.count) {
      console.log(formatOutput({ count: results.length }, format));
      return;
    }

    console.log(formatStates(results, format));
  }));

  return command;
}
