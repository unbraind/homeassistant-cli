import { Command } from "commander";
import { getConfig, saveConfig, getConfigPath } from "../config/index.js";
import type { OutputFormat } from "../types/index.js";

export function createConfigSetCommand(): Command {
  const command = new Command("config-set")
    .description("Set CLI configuration options")
    .option("-u, --url <url>", "Home Assistant URL")
    .option("-t, --token <token>", "Long-lived access token")
    .option("-f, --format <format>", "Default output format (toon, json, json-compact, yaml, table)")
    .option("--timeout <ms>", "Request timeout in milliseconds");

  command.action(
    async (options: {
      url?: string;
      token?: string;
      format?: OutputFormat;
      timeout?: string;
    }) => {
      const config: Record<string, unknown> = {};

      if (options.url) config.url = options.url;
      if (options.token) config.token = options.token;
      if (options.format) config.outputFormat = options.format;
      if (options.timeout) config.timeout = parseInt(options.timeout, 10);

      if (Object.keys(config).length === 0) {
        console.error("No configuration options provided. Use --help for usage.");
        process.exit(1);
      }

      saveConfig(config);
      console.log(`Configuration saved to ${getConfigPath()}`);
    }
  );

  return command;
}

export function createConfigGetCommand(): Command {
  const command = new Command("config-get")
    .description("Get current CLI configuration (without sensitive data)")
    .action(() => {
      try {
        const config = getConfig();
        const safeConfig = {
          url: config.url,
          outputFormat: config.outputFormat,
          timeout: config.timeout,
          token: config.token ? "***" : undefined,
        };
        console.log(JSON.stringify(safeConfig, null, 2));
      } catch (error) {
        console.error(
          "Configuration not complete:",
          error instanceof Error ? error.message : String(error)
        );
        process.exit(1);
      }
    }
  );

  return command;
}

export function createConfigPathCommand(): Command {
  return new Command("config-path")
    .description("Show the path to the configuration file")
    .action(() => {
      console.log(getConfigPath());
    });
}
