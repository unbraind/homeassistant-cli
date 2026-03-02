import { getConfig } from "../../config/index.js";
import { HomeAssistantClient } from "../../api/index.js";
import type { OutputFormat } from "../../types/index.js";

export interface LlmGlobalOptions {
  url?: string;
  token?: string;
  format?: OutputFormat;
  timeout?: number;
}

export function getClient(options: LlmGlobalOptions): HomeAssistantClient {
  const config = getConfig(options);
  return new HomeAssistantClient(config);
}

export function getFormat(options: LlmGlobalOptions): OutputFormat {
  const config = getConfig(options);
  return config.outputFormat;
}

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
