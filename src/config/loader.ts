import { chmodSync, existsSync, mkdirSync, readFileSync, writeFileSync, unlinkSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { Config, OutputFormat } from "../types/index.js";

const CONFIG_DIR = join(homedir(), ".hassio-cli");
const CONFIG_FILE = join(CONFIG_DIR, "settings.json");
const VALID_OUTPUT_FORMATS: OutputFormat[] = ["toon", "json", "json-compact", "yaml", "table"];

interface ConfigFile {
  url?: string;
  token?: string;
  outputFormat?: OutputFormat;
  timeout?: number;
}

function resolveConfigPath(path?: string): string {
  return path ?? process.env["HASSIO_CONFIG"] ?? CONFIG_FILE;
}

function loadConfigFile(path?: string): ConfigFile {
  const configPath = resolveConfigPath(path);
  if (!existsSync(configPath)) {
    return {};
  }
  try {
    const content = readFileSync(configPath, "utf-8");
    return JSON.parse(content) as ConfigFile;
  } catch {
    return {};
  }
}

function parseOutputFormat(format?: string): OutputFormat | undefined {
  if (!format) {
    return undefined;
  }

  if (VALID_OUTPUT_FORMATS.includes(format as OutputFormat)) {
    return format as OutputFormat;
  }

  throw new Error(
    `Invalid output format: '${format}'. Valid formats: ${VALID_OUTPUT_FORMATS.join(", ")}`
  );
}

function parseTimeout(timeout?: number | string): number | undefined {
  if (timeout === undefined) {
    return undefined;
  }

  const parsed = typeof timeout === "number" ? timeout : parseInt(timeout, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Invalid timeout: '${String(timeout)}'. Must be a positive integer.`);
  }

  return parsed;
}

export function getConfig(options?: {
  url?: string;
  token?: string;
  format?: OutputFormat;
  timeout?: number;
  configPath?: string;
  config?: string;
}): Config {
  const configPath = resolveConfigPath(options?.configPath ?? options?.config);
  const fileConfig = loadConfigFile(configPath);

  const url =
    options?.url ??
    process.env["HASSIO_URL"] ??
    process.env["HOMEASSISTANT_URL"] ??
    fileConfig.url;

  const token =
    options?.token ??
    process.env["HASSIO_TOKEN"] ??
    process.env["HOMEASSISTANT_TOKEN"] ??
    fileConfig.token;

  const outputFormat = parseOutputFormat(
    options?.format ??
    process.env["HASSIO_FORMAT"] ??
    fileConfig.outputFormat ??
    "toon"
  );

  const timeout = parseTimeout(
    options?.timeout ??
    process.env["HASSIO_TIMEOUT"] ??
    fileConfig.timeout ??
    30000
  );

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
    outputFormat: outputFormat ?? "toon",
    timeout: timeout ?? 30000,
  };
}

export function getConfigSnapshot(options?: {
  url?: string;
  token?: string;
  format?: OutputFormat;
  timeout?: number;
  configPath?: string;
  config?: string;
}): Partial<Config> {
  const configPath = resolveConfigPath(options?.configPath ?? options?.config);
  const fileConfig = loadConfigFile(configPath);

  const snapshot: Partial<Config> = {};

  const url =
    options?.url ??
    process.env["HASSIO_URL"] ??
    process.env["HOMEASSISTANT_URL"] ??
    fileConfig.url;
  if (url) {
    snapshot.url = url;
  }

  const token =
    options?.token ??
    process.env["HASSIO_TOKEN"] ??
    process.env["HOMEASSISTANT_TOKEN"] ??
    fileConfig.token;
  if (token) {
    snapshot.token = token;
  }

  const outputFormat = parseOutputFormat(
    options?.format ??
    process.env["HASSIO_FORMAT"] ??
    fileConfig.outputFormat ??
    "toon"
  );
  if (outputFormat) {
    snapshot.outputFormat = outputFormat;
  }

  const timeout = parseTimeout(
    options?.timeout ??
    process.env["HASSIO_TIMEOUT"] ??
    fileConfig.timeout ??
    30000
  );
  if (timeout !== undefined) {
    snapshot.timeout = timeout;
  }

  return snapshot;
}

function ensureConfigDir(configPath: string): void {
  const configDir = dirname(configPath);
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }
}

export function saveConfig(config: Partial<ConfigFile>, path?: string): void {
  const configPath = resolveConfigPath(path);
  ensureConfigDir(configPath);

  const existing = loadConfigFile(configPath);
  const merged = { ...existing, ...config };

  writeFileSync(configPath, JSON.stringify(merged, null, 2), { encoding: "utf-8", mode: 0o600 });
  try {
    chmodSync(configPath, 0o600);
  } catch {
    // Ignore chmod failures on unsupported filesystems/platforms.
  }
}

export function resetConfig(path?: string): void {
  const configPath = resolveConfigPath(path);
  if (existsSync(configPath)) {
    unlinkSync(configPath);
  }
}

export function configExists(path?: string): boolean {
  return existsSync(resolveConfigPath(path));
}

export function getConfigPath(path?: string): string {
  return resolveConfigPath(path);
}
