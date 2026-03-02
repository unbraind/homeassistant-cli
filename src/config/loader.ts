import { chmodSync, existsSync, mkdirSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import type { Config, OutputFormat } from "../types/index.js";

const CONFIG_DIR = join(homedir(), ".hassio-cli");
const SETTINGS_FILE = join(CONFIG_DIR, "settings.json");
const AUTH_FILE = join(CONFIG_DIR, "auth.json");
const DATA_FILE = join(CONFIG_DIR, "data.json");
const VALID_OUTPUT_FORMATS: OutputFormat[] = ["toon", "json", "json-compact", "yaml", "table", "markdown"];

interface SettingsFile {
  url?: string;
  outputFormat?: OutputFormat;
  timeout?: number;
  readOnly?: boolean;
  token?: string;
}

interface AuthFile {
  token?: string;
}

interface DataFile {
  lastValidatedAt?: string;
  lastVersion?: string;
  lastLocation?: string;
}

interface ConfigFiles {
  settings: string;
  auth: string;
  data: string;
}

function resolveSettingsPath(path?: string): string {
  return path ?? process.env["HASSIO_CONFIG"] ?? SETTINGS_FILE;
}

function resolveConfigFiles(path?: string): ConfigFiles {
  const settings = resolveSettingsPath(path);
  const dir = dirname(settings);
  const defaultDir = dirname(SETTINGS_FILE);
  return {
    settings,
    auth: dir === defaultDir ? AUTH_FILE : join(dir, "auth.json"),
    data: dir === defaultDir ? DATA_FILE : join(dir, "data.json"),
  };
}

function loadJsonFile<T extends object>(path: string): Partial<T> {
  if (!existsSync(path)) {
    return {};
  }
  try {
    const content = readFileSync(path, "utf-8");
    return JSON.parse(content) as T;
  } catch {
    return {};
  }
}

function writeJsonFile(path: string, data: object): void {
  const configDir = dirname(path);
  if (!existsSync(configDir)) {
    mkdirSync(configDir, { recursive: true });
  }

  writeFileSync(path, JSON.stringify(data, null, 2), { encoding: "utf-8", mode: 0o600 });
  try {
    chmodSync(path, 0o600);
  } catch {
    // Ignore chmod failures on unsupported filesystems/platforms.
  }
}

function parseOutputFormat(format?: string): OutputFormat | undefined {
  if (!format) {
    return undefined;
  }
  if (VALID_OUTPUT_FORMATS.includes(format as OutputFormat)) {
    return format as OutputFormat;
  }
  throw new Error(`Invalid output format: '${format}'. Valid formats: ${VALID_OUTPUT_FORMATS.join(", ")}`);
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

function parseBoolean(value?: boolean | string): boolean | undefined {
  if (value === undefined) {
    return undefined;
  }
  if (typeof value === "boolean") {
    return value;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }
  throw new Error(`Invalid boolean value: '${value}'. Use true/false.`);
}

function getRawConfig(options?: {
  url?: string;
  token?: string;
  format?: OutputFormat;
  timeout?: number;
  readOnly?: boolean | string;
  configPath?: string;
  config?: string;
}): Partial<Config> {
  const files = resolveConfigFiles(options?.configPath ?? options?.config);
  const settings = loadJsonFile<SettingsFile>(files.settings);
  const auth = loadJsonFile<AuthFile>(files.auth);

  const outputFormat = parseOutputFormat(
    options?.format ?? process.env["HASSIO_FORMAT"] ?? settings.outputFormat ?? "toon"
  );

  const timeout = parseTimeout(
    options?.timeout ?? process.env["HASSIO_TIMEOUT"] ?? settings.timeout ?? 30000
  );

  const readOnly = parseBoolean(
    options?.readOnly ?? process.env["HASSIO_READONLY"] ?? settings.readOnly ?? false
  );

  const token =
    options?.token ??
    process.env["HASSIO_TOKEN"] ??
    process.env["HOMEASSISTANT_TOKEN"] ??
    auth.token ??
    settings.token;

  const url =
    options?.url ??
    process.env["HASSIO_URL"] ??
    process.env["HOMEASSISTANT_URL"] ??
    settings.url;

  const raw: Partial<Config> = {
    outputFormat: outputFormat ?? "toon",
    timeout: timeout ?? 30000,
    readOnly: readOnly ?? false,
  };

  if (url) {
    raw.url = url;
  }
  if (token) {
    raw.token = token;
  }

  return raw;
}

export function getConfig(options?: {
  url?: string;
  token?: string;
  format?: OutputFormat;
  timeout?: number;
  readOnly?: boolean | string;
  configPath?: string;
  config?: string;
}): Config {
  const raw = getRawConfig(options);

  if (!raw.url) {
    throw new Error(
      "Home Assistant URL is required. Set HASSIO_URL environment variable, " +
        "add 'url' to ~/.hassio-cli/settings.json, or use --url option."
    );
  }

  if (!raw.token) {
    throw new Error(
      "Home Assistant token is required. Set HASSIO_TOKEN environment variable, " +
        "add 'token' to ~/.hassio-cli/auth.json, or use --token option."
    );
  }

  return {
    url: raw.url.replace(/\/$/, ""),
    token: raw.token,
    outputFormat: raw.outputFormat ?? "toon",
    timeout: raw.timeout ?? 30000,
    readOnly: raw.readOnly ?? false,
  };
}

export function getConfigSnapshot(options?: {
  url?: string;
  token?: string;
  format?: OutputFormat;
  timeout?: number;
  readOnly?: boolean | string;
  configPath?: string;
  config?: string;
}): Partial<Config> {
  return getRawConfig(options);
}

export function saveConfig(config: Partial<SettingsFile & AuthFile>, path?: string): void {
  const files = resolveConfigFiles(path);
  const currentSettings = loadJsonFile<SettingsFile>(files.settings);
  const currentAuth = loadJsonFile<AuthFile>(files.auth);

  const nextSettings: SettingsFile = {
    ...currentSettings,
    ...config,
  };
  delete nextSettings.token;

  const nextAuth: AuthFile = { ...currentAuth };
  if (config.token !== undefined) {
    nextAuth.token = config.token;
  }

  writeJsonFile(files.settings, nextSettings);
  writeJsonFile(files.auth, nextAuth);
}

export function saveData(data: Partial<DataFile>, path?: string): void {
  const files = resolveConfigFiles(path);
  const current = loadJsonFile<DataFile>(files.data);
  const next = { ...current, ...data };
  writeJsonFile(files.data, next);
}

export function getData(path?: string): Partial<DataFile> {
  const files = resolveConfigFiles(path);
  return loadJsonFile<DataFile>(files.data);
}

export function resetConfig(path?: string): void {
  const files = resolveConfigFiles(path);
  for (const filePath of [files.settings, files.auth, files.data]) {
    if (existsSync(filePath)) {
      unlinkSync(filePath);
    }
  }
}

export function configExists(path?: string): boolean {
  const files = resolveConfigFiles(path);
  return [files.settings, files.auth, files.data].some((filePath) => existsSync(filePath));
}

export function getConfigPath(path?: string): string {
  return resolveConfigFiles(path).settings;
}

export function getAuthPath(path?: string): string {
  return resolveConfigFiles(path).auth;
}

export function getDataPath(path?: string): string {
  return resolveConfigFiles(path).data;
}
