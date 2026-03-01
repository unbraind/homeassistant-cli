import { Command } from "commander";
import { getConfig } from "../config/index.js";
import { SearchApiClient } from "../api/search.js";
import { formatOutput, formatStates } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import type { OutputFormat } from "../types/index.js";

function getClient(options: { url?: string; token?: string; format?: OutputFormat; timeout?: number }) {
  const config = getConfig(options);
  return new SearchApiClient(config);
}

function getFormat(options: { format?: OutputFormat }): OutputFormat {
  const config = getConfig(options);
  return config.outputFormat;
}

export function createSearchCommand(): Command {
  const command = new Command("search")
    .description("Search Home Assistant entities")
    .argument("<query>", "Search query")
    .option("-d, --domain <domain>", "Filter by domain")
    .option("-a, --area <area>", "Filter by area")
    .option("-s, --state <state>", "Filter by state")
    .option("--quick", "Use quick local search (no API)")
    .option("--count", "Only return count");

  command.action(withExit(async (query: string, options: {
    domain?: string;
    area?: string;
    state?: string;
    quick?: boolean;
    count?: boolean;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

    if (options.quick) {
      const results = await client.quickSearch(query);
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
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

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
