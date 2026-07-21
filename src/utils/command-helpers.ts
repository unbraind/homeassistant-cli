/**
 * Provides shared command helpers behavior for the Home Assistant CLI runtime.
 */
import type { Command } from "commander";
import { getConfig } from "../config/index.js";
import type { Config, OutputFormat } from "../types/index.js";

export type GlobalOptions = {
  url?: string;
  token?: string;
  format?: OutputFormat;
  timeout?: number;
  readOnly?: boolean | string;
  config?: string;
};

/**
 * Resolves CLI global options into a typed Config and output format.
 * Calls getConfig once and returns both the full config (for client construction)
 * and the resolved output format, eliminating the need for separate getClient/getFormat helpers.
 */
export function resolveCommandOptions(options: GlobalOptions): { config: Config; format: OutputFormat } {
  const config = getConfig(options);
  return { config, format: config.outputFormat };
}

/**
 * Parses a string limit value into a positive integer, or returns undefined.
 * Throws if the value is not a valid positive integer.
 */
export function parseLimit(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }

  const limit = parseInt(value, 10);
  if (!Number.isFinite(limit) || limit <= 0) {
    throw new Error(`Invalid limit '${value}'. Must be a positive integer.`);
  }

  return limit;
}

const GLOBAL_FLAGS_HELP = `
Global flags:
  -u, --url <url>          Home Assistant URL (or HASSIO_URL)
  -t, --token <token>      Long-lived access token (or HASSIO_TOKEN)
  -f, --format <format>    Output format: toon|json|json-compact|yaml|table|markdown
      --timeout <ms>       Request timeout in milliseconds (or HASSIO_TIMEOUT)
      --read-only          Block all state-changing API calls (or HASSIO_READONLY=true)
  -c, --config <path>      Path to settings file (or HASSIO_CONFIG)
`;

export function attachGlobalFlagsHelp(program: Command): void {
  const stack: Command[] = [program];

  while (stack.length > 0) {
    // The non-empty stack condition guarantees pop returns a command.
    const command = stack.pop() as Command;

    if (command.parent) {
      command.addHelpText("after", GLOBAL_FLAGS_HELP);
    }

    for (const child of command.commands) {
      stack.push(child);
    }
  }
}
