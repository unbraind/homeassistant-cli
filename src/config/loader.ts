import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import type { Config, OutputFormat } from "../types/index.js";

const CONFIG_DIR = join(homedir(), ".hassio-cli");
const CONFIG_FILE = join(CONFIG_DIR, "settings.json");

interface ConfigFile {
  url?: string;
  token?: string;
  outputFormat?: OutputFormat;
  timeout?: number;
}

function loadConfigFile(path: string): ConfigFile {
  if (!existsSync(path)) {
    return {};
  }
  try {
    const content = readFileSync(path, "utf-8");
    return JSON.parse(content) as ConfigFile;
  } catch {
    return {};
  }
}

export function getConfig(options?: {
  url?: string;
  token?: string;
  format?: OutputFormat;
  timeout?: number;
  configPath?: string;
}): Config {
  const configPath = options?.configPath ?? CONFIG_FILE;
  const fileConfig = loadConfigFile(configPath);

  const url =
    options?.url ??
    process.env.HASSIO_URL ??
    process.env.HOMEASSISTANT_URL ??
    fileConfig.url;

  const token =
    options?.token ??
    process.env.HASSIO_TOKEN ??
    process.env.HOMEASSISTANT_TOKEN ??
    fileConfig.token;

  const outputFormat =
    options?.format ??
    (process.env.HASSIO_FORMAT as OutputFormat) ??
    fileConfig.outputFormat ??
    "toon";

  const timeout =
    options?.timeout ??
    (process.env["HASSIO_TIMEOUT"]
      ? parseInt(process.env["HASSIO_TIMEOUT"], 10)
      : undefined) ??
    fileConfig.timeout ??
    30000;

  if (!url) {
    throw new Error(
      "Home Assistant URL is required. Set HASSIO_URL environment variable, " +
        "add 'url' to ~/.hassio-cli/settings.json, or use --url option."
    );
  }

  if (!token) {
    throw new Error(
      "Home Assistant token is required. Set HASSIO_TOKEN environment variable, " +
        "add 'token' to ~/.hassio-cli/settings.json, or use --token option."
    );
  }

  return {
    url: url.replace(/\/$/, ""),
    token,
    outputFormat,
    timeout,
  };
}

export function saveConfig(config: Partial<ConfigFile>, path?: string): void {
  const configPath = path ?? CONFIG_FILE;

  if (!existsSync(CONFIG_DIR)) {
    mkdirSync(CONFIG_DIR, { recursive: true });
  }

  const existing = loadConfigFile(configPath);
  const merged = { ...existing, ...config };

  writeFileSync(configPath, JSON.stringify(merged, null, 2), "utf-8");
}

export function getConfigPath(): string {
  return CONFIG_FILE;
}
