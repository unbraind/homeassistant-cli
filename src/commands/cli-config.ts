import { Command } from "commander";
import { getConfig, saveConfig, getConfigPath } from "../config/index.js";
import type { OutputFormat } from "../types/index.js";

export function createConfigSetCommand(): Command {
  const command = new Command("set")
    .description("Set CLI configuration options permanently")
    .option("--ha-url <url>", "Home Assistant URL")
    .option("--ha-token <token>", "Long-lived access token")
    .option("--default-format <format>", "Default output format (toon, json, json-compact, yaml, table)")
    .option("--default-timeout <ms>", "Request timeout in milliseconds");

  command.action(
    (options: {
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
        console.error("No configuration options provided. Use --help for usage.");
        process.exit(1);
      }

      saveConfig(config);
      console.log(`✅ Configuration saved to ${getConfigPath()}`);
      console.log("Current configuration:");
      console.log(JSON.stringify(config, null, 2));
    }
  );

  return command;
}

export function createConfigGetCommand(): Command {
  const command = new Command("get")
    .description("Get current CLI configuration (token masked for security)")
    .option("--show-token", "Show the full token (use with caution)")
    .action((options: { showToken?: boolean }) => {
      try {
        const config = getConfig();
        const safeConfig = {
          url: config.url,
          outputFormat: config.outputFormat,
          timeout: config.timeout,
          token: options.showToken ? config.token : (config.token ? "*** (set)" : "NOT SET"),
        };
        console.log(JSON.stringify(safeConfig, null, 2));
        console.log(`\n📁 Config file: ${getConfigPath()}`);
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
  return new Command("path")
    .description("Show the path to the configuration file")
    .action(() => {
      console.log(getConfigPath());
    });
}

export function createWizardCommand(): Command {
  return new Command("wizard")
    .description("Interactive setup wizard for first-time configuration")
    .option("--skip-test", "Skip connection test after configuration")
    .action(async (options: { skipTest?: boolean }) => {
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

      console.log("\n🏠 Home Assistant CLI Setup Wizard\n");
      console.log("This wizard will help you configure the CLI to connect to your Home Assistant instance.\n");

      try {
        const url = await question("Home Assistant URL (e.g., http://192.168.1.100:8123): ");
        if (!url) {
          console.error("❌ URL is required");
          process.exit(1);
        }

        const normalizedUrl = url.replace(/\/$/, "");

        console.log("\nTo get your access token:");
        console.log("1. Open Home Assistant in your browser");
        console.log("2. Go to your Profile (bottom left)");
        console.log("3. Scroll down to 'Long-Lived Access Tokens'");
        console.log("4. Click 'Create Token' and copy the token\n");

        const token = await question("Long-Lived Access Token: ");
        if (!token) {
          console.error("❌ Token is required");
          process.exit(1);
        }

        console.log("\nAvailable output formats:");
        console.log("  - toon (default): Token-efficient, optimized for LLMs");
        console.log("  - json: Pretty-printed JSON");
        console.log("  - json-compact: Minified JSON");
        console.log("  - yaml: YAML format");
        console.log("  - table: Human-readable table\n");

        const formatInput = await question("Default output format [toon]: ");
        const format = (formatInput || "toon") as OutputFormat;

        const timeoutInput = await question("Request timeout in ms [30000]: ");
        const timeout = parseInt(timeoutInput || "30000", 10);

        const config = {
          url: normalizedUrl,
          token,
          outputFormat: format,
          timeout,
        };

        saveConfig(config);

        console.log(`\n✅ Configuration saved to ${getConfigPath()}`);

        if (!options.skipTest) {
          console.log("\n🧪 Testing connection...");
          
          const { HomeAssistantClient } = await import("../api/index.js");
          const client = new HomeAssistantClient(config);
          
          try {
            const status = await client.getStatus();
            console.log(`✅ Connection successful: ${status.message}`);
            
            const haConfig = await client.getConfig();
            console.log(`📍 Location: ${haConfig.location_name}`);
            console.log(`🔧 Version: ${haConfig.version}`);
            console.log(`🌍 Timezone: ${haConfig.time_zone}`);
          } catch (error) {
            console.error("\n❌ Connection test failed:");
            console.error(error instanceof Error ? error.message : String(error));
            console.error("\nYour configuration has been saved, but the connection test failed.");
            console.error("Please verify your URL and token are correct.");
          }
        }

        console.log("\n🎉 Setup complete! Try running: hassio status");
      } catch (error) {
        console.error("\n❌ Error during setup:", error instanceof Error ? error.message : String(error));
        process.exit(1);
      } finally {
        rl.close();
      }
    });
}

export function createInitCommand(): Command {
  return new Command("init")
    .description("Quick initialization with environment variables")
    .action(async () => {
      const url = process.env["HASSIO_URL"];
      const token = process.env["HASSIO_TOKEN"];
      const format = process.env["HASSIO_FORMAT"] as OutputFormat | undefined;
      const timeoutStr = process.env["HASSIO_TIMEOUT"];

      if (!url && !token) {
        console.error("❌ No HASSIO_URL or HASSIO_TOKEN environment variables found.");
        console.error("Run 'hassio wizard' for interactive setup or set environment variables.");
        process.exit(1);
      }

      const config: Record<string, unknown> = {};
      if (url) config["url"] = url.replace(/\/$/, "");
      if (token) config["token"] = token;
      if (format) config["outputFormat"] = format;
      if (timeoutStr) config["timeout"] = parseInt(timeoutStr, 10);

      saveConfig(config);
      console.log(`✅ Configuration initialized from environment variables`);
      console.log(`📁 Saved to: ${getConfigPath()}`);
    });
}

export function createValidateCommand(): Command {
  return new Command("validate")
    .description("Validate current configuration and test connection")
    .action(async () => {
      console.log("🔍 Validating configuration...\n");

      try {
        const config = getConfig();
        
        console.log("Configuration:");
        console.log(`  URL: ${config.url}`);
        console.log(`  Output Format: ${config.outputFormat}`);
        console.log(`  Timeout: ${config.timeout}ms`);
        console.log(`  Token: ${config.token ? "*** (set)" : "NOT SET"}`);
        
        console.log("\n🧪 Testing connection...");
        
        const { HomeAssistantClient } = await import("../api/index.js");
        const client = new HomeAssistantClient(config);
        
        const status = await client.getStatus();
        console.log(`✅ API Status: ${status.message}`);
        
        const haConfig = await client.getConfig();
        console.log(`✅ HA Version: ${haConfig.version}`);
        console.log(`✅ Location: ${haConfig.location_name}`);
        
        const states = await client.getStates();
        console.log(`✅ Entities: ${states.length}`);
        
        console.log("\n✅ All tests passed! Configuration is valid.");
      } catch (error) {
        console.error("\n❌ Validation failed:");
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

export function createResetCommand(): Command {
  return new Command("reset")
    .description("Reset all configuration (clear saved settings)")
    .option("--force", "Skip confirmation prompt")
    .action(async (options: { force?: boolean }) => {
      const { resetConfig, configExists, getConfigPath } = await import("../config/index.js");
      
      if (!configExists()) {
        console.log("No configuration file found. Nothing to reset.");
        return;
      }

      if (!options.force) {
        console.log("⚠️  This will delete all saved configuration including your token.");
        console.log(`📁 Config file: ${getConfigPath()}`);
        console.log("\nRun with --force to confirm.");
        process.exit(1);
      }

      try {
        resetConfig();
        console.log("✅ Configuration reset successfully.");
        console.log("Run 'hassio settings wizard' or 'hassio settings init' to reconfigure.");
      } catch (error) {
        console.error("❌ Failed to reset configuration:");
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });
}

export function createListCommand(): Command {
  return new Command("list")
    .description("List all available configuration options")
    .action(() => {
      console.log("Available configuration options:\n");
      console.log("  url             Home Assistant URL (e.g., http://192.168.1.100:8123)");
      console.log("  token           Long-lived access token from Home Assistant");
      console.log("  outputFormat    Default output format (toon, json, json-compact, yaml, table)");
      console.log("  timeout         Request timeout in milliseconds (default: 30000)");
      console.log("\nEnvironment variables:");
      console.log("  HASSIO_URL      Home Assistant URL");
      console.log("  HASSIO_TOKEN    Long-lived access token");
      console.log("  HASSIO_FORMAT   Default output format");
      console.log("  HASSIO_TIMEOUT  Request timeout in milliseconds");
      console.log(`\nConfig file: ${getConfigPath()}`);
    });
}
