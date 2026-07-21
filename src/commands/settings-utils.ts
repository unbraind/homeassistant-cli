/**
 * Defines the settings utils command surface, options, help, and output behavior.
 */
import type { Command } from "commander";
import type { OutputFormat } from "../types/index.js";

const VALID_FORMATS: OutputFormat[] = ["toon", "json", "json-compact", "yaml", "table", "markdown"];

interface GlobalOptions {
  config?: string;
}

export function parseFormat(value?: string): OutputFormat | undefined {
  if (!value) {
    return undefined;
  }
  if (!VALID_FORMATS.includes(value as OutputFormat)) {
    throw new Error(`Invalid format '${value}'. Valid values: ${VALID_FORMATS.join(", ")}`);
  }
  return value as OutputFormat;
}

export function parseTimeout(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }
  const timeout = parseInt(value, 10);
  if (!Number.isFinite(timeout) || timeout <= 0) {
    throw new Error(`Invalid timeout '${value}'. Must be a positive integer.`);
  }
  return timeout;
}

export function parseBoolean(value?: string): boolean | undefined {
  if (!value) {
    return undefined;
  }
  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on", "y"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off", "n"].includes(normalized)) {
    return false;
  }
  throw new Error(`Invalid boolean '${value}'. Use yes/no or true/false.`);
}

export function getConfigPathFromCommand(cmd: Command): string | undefined {
  const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
  return globalOpts.config;
}

export function withConfigPath(configPath?: string): { configPath?: string } {
  return configPath ? { configPath } : {};
}
