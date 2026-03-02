import { Command } from "commander";
import { getConfig, getConfigPath, getConfigSnapshot, saveConfig } from "../config/index.js";
import { withExit } from "../utils/exit.js";
import { maybePromptToStarRepo } from "../utils/github-star.js";
import type { OutputFormat } from "../types/index.js";

const VALID_FORMATS: OutputFormat[] = ["toon", "json", "json-compact", "yaml", "table", "markdown"];

interface GlobalOptions {
  config?: string;
}

interface SettingsSetOptions {
  haUrl?: string;
  haToken?: string;
  defaultFormat?: string;
  defaultTimeout?: string;
  readOnly?: string;
}

function getConfigPathFromCommand(cmd: Command): string | undefined {
  const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
  return globalOpts.config;
}

function withConfigPath(configPath?: string): { configPath?: string } {
  return configPath ? { configPath } : {};
}

function parseFormat(value?: string): OutputFormat | undefined {
  if (!value) {
    return undefined;
  }
  if (!VALID_FORMATS.includes(value as OutputFormat)) {
    throw new Error(`Invalid format '${value}'. Valid values: ${VALID_FORMATS.join(", ")}`);
  }
  return value as OutputFormat;
}

function parseTimeout(value?: string): number | undefined {
  if (!value) {
    return undefined;
  }
  const timeout = parseInt(value, 10);
  if (!Number.isFinite(timeout) || timeout <= 0) {
    throw new Error(`Invalid timeout '${value}'. Must be a positive integer.`);
  }
  return timeout;
}

function parseBoolean(value?: string): boolean | undefined {
  if (!value) {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (["1", "true", "yes", "on"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off"].includes(normalized)) {
    return false;
  }

  throw new Error(`Invalid boolean '${value}'. Valid values: true|false`);
}

export function createConfigSetCommand(): Command {
  const command = new Command("set")
    .description("Set CLI configuration options permanently")
    .option("--ha-url <url>", "Home Assistant URL")
    .option("--ha-token <token>", "Long-lived access token")
    .option("--default-format <format>", "Default output format (toon, json, json-compact, yaml, table, markdown)")
    .option("--default-timeout <ms>", "Request timeout in milliseconds")
    .option("--read-only <boolean>", "Enable safety mode that blocks write operations (true|false)");

  command.action(withExit(async (options: SettingsSetOptions, cmd) => {
    await maybePromptToStarRepo();
    const configPath = getConfigPathFromCommand(cmd as Command);
    const config: Record<string, unknown> = {};

    if (options.haUrl) {
      config["url"] = options.haUrl.replace(/\/$/, "");
    }
    if (options.haToken) {
      config["token"] = options.haToken;
    }

    const format = parseFormat(options.defaultFormat);
    if (format) {
      config["outputFormat"] = format;
    }

    const timeout = parseTimeout(options.defaultTimeout);
    if (timeout !== undefined) {
      config["timeout"] = timeout;
    }

    const readOnly = parseBoolean(options.readOnly);
    if (readOnly !== undefined) {
      config["readOnly"] = readOnly;
    }

    if (Object.keys(config).length === 0) {
      console.error("ERROR: No configuration options provided");
      process.exit(1);
    }

    saveConfig(config, configPath);
    console.log(`saved:${getConfigPath(configPath)}`);
    console.log(JSON.stringify({ ...config, token: config["token"] ? "***" : undefined }, null, 2));
  }));

  return command;
}

export function createConfigGetCommand(): Command {
  const command = new Command("get")
    .description("Get current CLI configuration (token masked for security)")
    .option("--show-token", "Show the full token (use with caution)");

  command.action(withExit(async (options: { showToken?: boolean }, cmd) => {
    await maybePromptToStarRepo();
    const configPath = getConfigPathFromCommand(cmd as Command);
    const config = getConfigSnapshot(withConfigPath(configPath));

    const safeConfig = {
      configPath: getConfigPath(configPath),
      url: config.url ?? "NOT_SET",
      outputFormat: config.outputFormat ?? "toon",
      timeout: config.timeout ?? 30000,
      readOnly: config.readOnly ?? false,
      token: options.showToken ? (config.token ?? "NOT_SET") : (config.token ? "***" : "NOT_SET"),
    };

    console.log(JSON.stringify(safeConfig, null, 2));
  }));

  return command;
}

export function createConfigPathCommand(): Command {
  return new Command("path")
    .description("Show the path to the configuration file")
    .action(withExit(async (_options, cmd) => {
      await maybePromptToStarRepo();
      const configPath = getConfigPathFromCommand(cmd as Command);
      console.log(getConfigPath(configPath));
    }));
}

export function createInitCommand(): Command {
  return new Command("init")
    .description("Quick initialization with environment variables")
    .action(withExit(async (_options, cmd) => {
      await maybePromptToStarRepo();
      const configPath = getConfigPathFromCommand(cmd as Command);
      const snapshot = getConfigSnapshot(withConfigPath(configPath));

      if (!snapshot.url && !snapshot.token) {
        console.error("ERROR: No HASSIO_URL or HASSIO_TOKEN environment variables found");
        console.error("Run 'hassio settings wizard' for interactive setup");
        process.exit(1);
      }

      const config: Record<string, unknown> = {};
      if (snapshot.url) config["url"] = snapshot.url.replace(/\/$/, "");
      if (snapshot.token) config["token"] = snapshot.token;
      if (snapshot.outputFormat) config["outputFormat"] = snapshot.outputFormat;
      if (snapshot.timeout) config["timeout"] = snapshot.timeout;
      if (snapshot.readOnly !== undefined) config["readOnly"] = snapshot.readOnly;

      saveConfig(config, configPath);
      console.log(`saved:${getConfigPath(configPath)}`);
    }));
}

export function createValidateCommand(): Command {
  return new Command("validate")
    .description("Validate current configuration and test connection")
    .action(withExit(async (_options, cmd) => {
      try {
        await maybePromptToStarRepo();
        const configPath = getConfigPathFromCommand(cmd as Command);
        const config = getConfig(withConfigPath(configPath));

        const { HomeAssistantClient } = await import("../api/index.js");
        const client = new HomeAssistantClient(config);

        const status = await client.getStatus();
        const haConfig = await client.getConfig();
        const states = await client.getStates();

        console.log(`status: VALID
url: ${config.url}
format: ${config.outputFormat}
timeout: ${config.timeout}ms
api: ${status.message}
version: ${haConfig.version}
location: ${haConfig.location_name}
entities: ${states.length}`);
      } catch (error) {
        console.error("\nERROR: Validation failed");
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    }));
}

export function createResetCommand(): Command {
  return new Command("reset")
    .description("Reset all configuration (clear saved settings)")
    .option("--force", "Skip confirmation prompt")
    .action(withExit(async (options: { force?: boolean }, cmd) => {
      await maybePromptToStarRepo();
      const configPath = getConfigPathFromCommand(cmd as Command);
      const { resetConfig, configExists } = await import("../config/index.js");

      if (!configExists(configPath)) {
        console.log("status: NO_CONFIG");
        return;
      }

      if (!options.force) {
        console.log(`WARNING: This will delete ${getConfigPath(configPath)}`);
        console.log("Run with --force to confirm");
        process.exit(1);
      }

      try {
        resetConfig(configPath);
        console.log("status: RESET");
      } catch (error) {
        console.error("ERROR:", error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    }));
}

export function createListCommand(): Command {
  return new Command("list")
    .description("List all available configuration options")
    .action(withExit(async (_options, cmd) => {
      await maybePromptToStarRepo();
      const configPath = getConfigPathFromCommand(cmd as Command);
      console.log("config_options:");
      console.log("  url: Home Assistant URL");
      console.log("  token: Long-lived access token");
      console.log("  outputFormat: toon|json|json-compact|yaml|table|markdown");
      console.log("  timeout: Request timeout in ms (default: 30000)");
      console.log("  readOnly: true|false (default: false)");
      console.log("\nenv_vars:");
      console.log("  HASSIO_URL: Home Assistant URL");
      console.log("  HASSIO_TOKEN: Long-lived access token");
      console.log("  HASSIO_FORMAT: Default output format");
      console.log("  HASSIO_TIMEOUT: Request timeout in ms");
      console.log("  HASSIO_READONLY: Block all write operations when true");
      console.log("  HASSIO_CONFIG: Config file path override");
      console.log(`\nconfig_file: ${getConfigPath(configPath)}`);
    }));
}
