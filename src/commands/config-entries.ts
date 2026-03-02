import { Command } from "commander";
import { ConfigEntriesApiClient } from "../api/config-entries.js";
import { getConfig } from "../config/index.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import type { HaConfigEntry, OutputFormat } from "../types/index.js";

interface ConfigEntriesOptions {
  domain?: string;
  state?: string;
  source?: string;
  count?: boolean;
  delete?: string;
  yes?: boolean;
}

function getClient(options: { url?: string; token?: string; format?: OutputFormat; timeout?: number }) {
  return new ConfigEntriesApiClient(getConfig(options));
}

function getFormat(options: { format?: OutputFormat }): OutputFormat {
  return getConfig(options).outputFormat;
}

function filterConfigEntries(entries: HaConfigEntry[], options: ConfigEntriesOptions): HaConfigEntry[] {
  return entries
    .filter((entry) => !options.domain || entry.domain === options.domain)
    .filter((entry) => !options.state || entry.state === options.state)
    .filter((entry) => !options.source || entry.source === options.source)
    .sort((a, b) => {
      const domainCmp = a.domain.localeCompare(b.domain);
      if (domainCmp !== 0) return domainCmp;
      return a.title.localeCompare(b.title);
    });
}

function summarizeEntries(entries: HaConfigEntry[]): {
  count: number;
  by_domain: Array<{ domain: string; count: number }>;
  by_state: Array<{ state: string; count: number }>;
} {
  const byDomain = new Map<string, number>();
  const byState = new Map<string, number>();

  for (const entry of entries) {
    byDomain.set(entry.domain, (byDomain.get(entry.domain) ?? 0) + 1);
    byState.set(entry.state, (byState.get(entry.state) ?? 0) + 1);
  }

  return {
    count: entries.length,
    by_domain: [...byDomain.entries()]
      .map(([domain, count]) => ({ domain, count }))
      .sort((a, b) => b.count - a.count || a.domain.localeCompare(b.domain)),
    by_state: [...byState.entries()]
      .map(([state, count]) => ({ state, count }))
      .sort((a, b) => b.count - a.count || a.state.localeCompare(b.state)),
  };
}

export function createConfigEntriesCommand(): Command {
  const command = new Command("config-entries")
    .description("List and manage Home Assistant config entries")
    .option("-d, --domain <domain>", "Filter entries by integration domain")
    .option("-s, --state <state>", "Filter entries by state (e.g., loaded, setup_error)")
    .option("--source <source>", "Filter entries by source (e.g., import, user)")
    .option("--count", "Return summary counts only")
    .option("--delete <entry-id>", "Delete a config entry by entry_id")
    .option("--yes", "Confirm destructive actions like --delete");

  command.action(withExit(async (options: ConfigEntriesOptions, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

    if (options.delete) {
      if (!options.yes) {
        throw new Error("Deletion requires --yes to confirm. Example: hassio config-entries --delete <entry-id> --yes");
      }
      await client.deleteConfigEntry(options.delete);
      console.log(formatOutput({ deleted: true, entry_id: options.delete }, format));
      return;
    }

    const entries = await client.getConfigEntries();
    const filtered = filterConfigEntries(entries, options);

    if (options.count) {
      console.log(formatOutput(summarizeEntries(filtered), format));
      return;
    }

    console.log(formatOutput({ config_entries: filtered }, format));
  }));

  return command;
}
