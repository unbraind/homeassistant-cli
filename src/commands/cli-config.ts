import { Command } from "commander";
import {
  getAuthPath,
  getConfig,
  getConfigPath,
  getConfigSnapshot,
  getData,
  getDataPath,
  saveConfig,
  saveData,
} from "../config/index.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { maybePromptToStarRepo } from "../utils/github-star.js";
import { getConfigPathFromCommand, parseBoolean, parseFormat, parseTimeout, withConfigPath } from "./settings-utils.js";
import type { OutputFormat } from "../types/index.js";

interface SettingsSetOptions {
  haUrl?: string;
  haToken?: string;
  defaultFormat?: string;
  defaultTimeout?: string;
  readOnly?: string;
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
      settingsPath: getConfigPath(configPath),
      authPath: getAuthPath(configPath),
      dataPath: getDataPath(configPath),
      url: config.url ?? "NOT_SET",
      outputFormat: config.outputFormat ?? "toon",
      timeout: config.timeout ?? 30000,
      readOnly: config.readOnly ?? false,
      token: options.showToken ? (config.token ?? "NOT_SET") : (config.token ? "***" : "NOT_SET"),
      runtime: getData(configPath),
    };

    console.log(JSON.stringify(safeConfig, null, 2));
  }));

  return command;
}

export function createConfigPathCommand(): Command {
  return new Command("path")
    .description("Show settings/auth/data file paths")
    .action(withExit(async (_options, cmd) => {
      await maybePromptToStarRepo();
      const configPath = getConfigPathFromCommand(cmd as Command);
      console.log(JSON.stringify({
        settings: getConfigPath(configPath),
        auth: getAuthPath(configPath),
        data: getDataPath(configPath),
      }, null, 2));
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
        const globalOptions = (cmd as Command).optsWithGlobals() as {
          url?: string;
          token?: string;
          format?: OutputFormat;
          timeout?: number;
          readOnly?: boolean | string;
        };
        const config = getConfig({ ...globalOptions, ...withConfigPath(configPath) });

        const { HomeAssistantClient } = await import("../api/index.js");
        const client = new HomeAssistantClient(config);

        const status = await client.getStatus();
        const haConfig = await client.getConfig();
        const states = await client.getStates();
        saveData({
          lastValidatedAt: new Date().toISOString(),
          lastVersion: haConfig.version,
          lastLocation: haConfig.location_name,
        }, configPath);

        console.log(formatOutput({
          status: "VALID",
          url: config.url,
          format: config.outputFormat,
          timeout_ms: config.timeout,
          api: status.message,
          version: haConfig.version,
          location: haConfig.location_name,
          entities: states.length,
        }, config.outputFormat));
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
      console.log("\nsettings_commands:");
      console.log("  wizard: interactive/non-interactive setup");
      console.log("  init: initialize from env vars");
      console.log("  validate: validate config + HA connectivity");
      console.log("  doctor: diagnostics report (API, output formats, supervisor)");
      console.log("  get/path/set/reset/list");
      console.log("\nenv_vars:");
      console.log("  HASSIO_URL: Home Assistant URL");
      console.log("  HASSIO_TOKEN: Long-lived access token");
      console.log("  HASSIO_FORMAT: Default output format");
      console.log("  HASSIO_TIMEOUT: Request timeout in ms");
      console.log("  HASSIO_READONLY: Block all write operations when true");
      console.log("  HASSIO_CONFIG: Config file path override");
      console.log(`\nsettings_file: ${getConfigPath(configPath)}`);
      console.log(`auth_file: ${getAuthPath(configPath)}`);
      console.log(`data_file: ${getDataPath(configPath)}`);
    }));
}
