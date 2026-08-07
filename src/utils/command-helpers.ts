/**
 * Provides shared command helpers behavior for the Home Assistant CLI runtime.
 */
import type { Command } from "commander";
import { HomeAssistantWebSocketClient } from "../api/websocket.js";
import { getConfig } from "../config/index.js";
import { formatOutput } from "../formatters/index.js";
import type { Config, OutputFormat } from "../types/index.js";

export type GlobalOptions = {
  url?: string;
  token?: string;
  format?: OutputFormat;
  timeout?: number;
  readOnly?: boolean | string;
  config?: string;
};

export type BoundedListOptions = {
  all?: boolean;
  count?: boolean;
  limit?: string;
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

  const limit = Number(value);
  if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(limit)) {
    throw new Error(`Invalid limit '${value}'. Must be a positive integer.`);
  }

  return limit;
}

/** Format deterministic rows with count metadata and an optional positive bound. */
export function formatBoundedRows(
  rows: Record<string, unknown>[],
  options: BoundedListOptions,
  collectionKey: string,
): Record<string, unknown> {
  if (options.count) return { count: rows.length };
  const limit = options.all ? undefined : parseLimit(options.limit);
  const visible = limit === undefined ? rows : rows.slice(0, limit);
  return {
    count: rows.length,
    returned_count: visible.length,
    truncated: visible.length < rows.length,
    [collectionKey]: visible,
  };
}

/** Execute a typed WebSocket request, format its normalized result, and always close the client. */
export async function callWebsocketAndOutput(
  command: Command,
  type: string,
  payload: Record<string, unknown> | undefined,
  normalize: (result: unknown) => Record<string, unknown>,
): Promise<void> {
  const { config, format } = resolveCommandOptions(command.optsWithGlobals());
  const client = new HomeAssistantWebSocketClient(config);
  try {
    console.log(formatOutput(normalize(await client.call(type, payload)), format));
  } finally {
    await client.close();
  }
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
