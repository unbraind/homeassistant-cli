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
