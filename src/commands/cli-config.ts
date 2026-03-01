import { Command } from "commander";
import { getConfig, saveConfig, getConfigPath } from "../config/index.js";
import { withExit } from "../utils/exit.js";
import type { OutputFormat } from "../types/index.js";

export function createConfigSetCommand(): Command {
  const command = new Command("set")
    .description("Set CLI configuration options permanently")
    .option("--ha-url <url>", "Home Assistant URL")
    .option("--ha-token <token>", "Long-lived access token")
    .option("--default-format <format>", "Default output format (toon, json, json-compact, yaml, table)")
    .option("--default-timeout <ms>", "Request timeout in milliseconds");

  command.action(
    withExit(async (options: {
      haUrl?: string;
      haToken?: string;
      defaultFormat?: OutputFormat;
      defaultTimeout?: string;
    }) => {
      const config: Record<string, unknown> = {};

      if (options.haUrl) config["url"] = options.haUrl.replace(/\/$/, "");
      if (options.haToken) config["token"] = options.haToken;
      if (options.defaultFormat) config["outputFormat"] = options.defaultFormat;
      if (options.defaultTimeout) config["timeout"] = parseInt(options.defaultTimeout, 10);

      if (Object.keys(config).length === 0) {
        console.error("ERROR: No configuration options provided");
        process.exit(1);
      }

      saveConfig(config);
      console.log(`saved:${getConfigPath()}`);
      console.log(JSON.stringify(config, null, 2));
    })
  );

  return command;
}

export function createConfigGetCommand(): Command {
  const command = new Command("get")
    .description("Get current CLI configuration (token masked for security)")
    .option("--show-token", "Show the full token (use with caution");
  command.action(withExit(async (options: { showToken?: boolean }) => {
    try {
      const config = getConfig();
      const safeConfig = {
        url: config.url,
        outputFormat: config.outputFormat,
        timeout: config.timeout,
        token: options.showToken ? config.token : (config.token ? "***" : "NOT_SET"),
      };
      console.log(JSON.stringify(safeConfig, null, 2));
    } catch (error) {
      console.error("ERROR:", error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }));

  return command;
}

export function createConfigPathCommand(): Command {
  return new Command("path")
    .description("Show the path to the configuration file")
    .action(withExit(async () => {
      console.log(getConfigPath());
    }));
}

export function createWizardCommand(): Command {
  return new Command("wizard")
    .description("Interactive setup wizard for first-time configuration")
    .option("--skip-test", "Skip connection test after configuration")
    .action(withExit(async (options: { skipTest?: boolean }) => {
      const readline = await import("node:readline");
      
      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const question = (prompt: string): Promise<string> => {
        return new Promise((resolve) => {
          rl.question(prompt, (answer) => resolve(answer.trim()));
        });
      };

      console.log("\nSETUP WIZARD\n");

      try {
        const url = await question("Home Assistant URL: ");
        if (!url) {
          console.error("ERROR: URL is required");
          process.exit(1);
        }

        const normalizedUrl = url.replace(/\/$/, "");

        console.log("\nToken Instructions:");
        console.log("1. Open Home Assistant in browser");
        console.log("2. Go to Profile > Long-Lived Access Tokens");
        console.log("3. Click 'Create Token' and copy\n");

        const token = await question("Long-Lived Access Token: ");
        if (!token) {
          console.error("ERROR: Token is required");
          process.exit(1);
        }

        console.log("\nFormats: toon, json, json-compact, yaml, table");
        const formatInput = await question("Default format [toon]: ");
        const format = (formatInput || "toon") as OutputFormat;

        const timeoutInput = await question("Timeout in ms [30000]: ");
        const timeout = parseInt(timeoutInput || "30000", 10);

        const config = {
          url: normalizedUrl,
          token,
          outputFormat: format,
          timeout,
        };

        saveConfig(config);
        console.log(`\nsaved:${getConfigPath()}`);

        if (!options.skipTest) {
          console.log("\nTesting connection...");
          
          const { HomeAssistantClient } = await import("../api/index.js");
          const client = new HomeAssistantClient(config);
          
          try {
            const status = await client.getStatus();
            const haConfig = await client.getConfig();
            
            console.log(`status:${status.message}`);
            console.log(`version:${haConfig.version}`);
            console.log(`location:${haConfig.location_name}`);
          } catch (error) {
            console.error("\nERROR: Connection test failed");
            console.error(error instanceof Error ? error.message : String(error));
            console.error("\nConfiguration saved but connection failed. Verify URL and token.");
          }
        }

        console.log("\nSetup complete. Run: hassio status");
      } catch (error) {
        console.error("\nERROR:", error instanceof Error ? error.message : String(error));
        process.exit(1);
      } finally {
        rl.close();
      }
    }));
}

export function createInitCommand(): Command {
  return new Command("init")
    .description("Quick initialization with environment variables")
    .action(withExit(async () => {
      const url = process.env["HASSIO_URL"];
      const token = process.env["HASSIO_TOKEN"];
      const format = process.env["HASSIO_FORMAT"] as OutputFormat | undefined;
      const timeoutStr = process.env["HASSIO_TIMEOUT"];

      if (!url && !token) {
        console.error("ERROR: No HASSIO_URL or HASSIO_TOKEN environment variables found");
        console.error("Run 'hassio settings wizard' for interactive setup");
        process.exit(1);
      }

      const config: Record<string, unknown> = {};
      if (url) config["url"] = url.replace(/\/$/, "");
      if (token) config["token"] = token;
      if (format) config["outputFormat"] = format;
      if (timeoutStr) config["timeout"] = parseInt(timeoutStr, 10);

      saveConfig(config);
      console.log(`saved:${getConfigPath()}`);
    }));
}

export function createValidateCommand(): Command {
  return new Command("validate")
    .description("Validate current configuration and test connection")
    .action(withExit(async () => {
      try {
        const config = getConfig();
        
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
    .action(withExit(async (options: { force?: boolean }) => {
      const { resetConfig, configExists, getConfigPath } = await import("../config/index.js");
      
      if (!configExists()) {
        console.log("status: NO_CONFIG");
        return;
      }

      if (!options.force) {
        console.log(`WARNING: This will delete ${getConfigPath()}`);
        console.log("Run with --force to confirm");
        process.exit(1);
      }

      try {
        resetConfig();
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
    .action(withExit(async () => {
      console.log("config_options:");
      console.log("  url: Home Assistant URL");
      console.log("  token: Long-lived access token");
      console.log("  outputFormat: toon|json|json-compact|yaml|table");
      console.log("  timeout: Request timeout in ms (default: 30000)");
      console.log("\nenv_vars:");
      console.log("  HASSIO_URL: Home Assistant URL");
      console.log("  HASSIO_TOKEN: Long-lived access token");
      console.log("  HASSIO_FORMAT: Default output format");
      console.log("  HASSIO_TIMEOUT: Request timeout in ms");
      console.log(`\nconfig_file: ${getConfigPath()}`);
    }));
}
