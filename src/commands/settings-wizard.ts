/**
 * Defines the settings wizard command surface, options, help, and output behavior.
 */
import { Command } from "commander";
import { createInterface } from "node:readline";
import { HomeAssistantClient } from "../api/index.js";
import { getAuthPath, getConfigPath, getConfigSnapshot, getDataPath, saveConfig, saveData } from "../config/index.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { maybePromptToStarRepo } from "../utils/github-star.js";
import type { OutputFormat } from "../types/index.js";
import { getConfigPathFromCommand, parseBoolean, parseFormat, parseTimeout, withConfigPath } from "./settings-utils.js";

interface WizardOptions {
  skipTest?: boolean;
  nonInteractive?: boolean;
  haUrl?: string;
  haToken?: string;
  defaultFormat?: string;
  defaultTimeout?: string;
  configReadOnly?: string;
}

type ConnectionResult =
  | { status: "connected"; api_status: string; version: string }
  | { status: "failed"; detail: string }
  | { status: "skipped" };

async function testConnection(config: {
  url: string;
  token: string;
  outputFormat: OutputFormat;
  timeout: number;
  readOnly: boolean;
}, configPath?: string): Promise<ConnectionResult> {
  const client = new HomeAssistantClient(config);
  try {
    const status = await client.getStatus();
    const haConfig = await client.getConfig();
    saveData({
      lastValidatedAt: new Date().toISOString(),
      lastVersion: haConfig.version,
      lastLocation: haConfig.location_name,
    }, configPath);
    return { status: "connected", api_status: status.message, version: haConfig.version };
  } catch (error) {
    return { status: "failed", detail: error instanceof Error ? error.message : String(error) };
  }
}

export function createWizardCommand(): Command {
  return new Command("wizard")
    .description("Interactive setup wizard for first-time configuration")
    .option("--non-interactive", "Run without prompts (use options or existing config)")
    .option("--ha-url <url>", "Home Assistant URL for non-interactive mode")
    .option("--ha-token <token>", "Long-lived access token for non-interactive mode")
    .option("--default-format <format>", "Output format for non-interactive mode")
    .option("--default-timeout <ms>", "Timeout for non-interactive mode")
    .option("--config-read-only <boolean>", "Saved read-only safety mode for non-interactive setup")
    .option("--skip-test", "Skip connection test after configuration")
    .action(withExit(async (options: WizardOptions, cmd) => {
      const nonInteractive = options.nonInteractive === true;
      const globalFormat = ((cmd as Command).optsWithGlobals() as { format?: OutputFormat }).format;
      let receiptFormat: OutputFormat = globalFormat ?? "toon";
      const configPath = getConfigPathFromCommand(cmd as Command);
      const existing = getConfigSnapshot(withConfigPath(configPath));

      if (!nonInteractive) {
        await maybePromptToStarRepo();
        console.log("\nSETUP WIZARD\n");
      }

      try {
        let urlInput = options.haUrl || existing.url;
        let token = options.haToken || existing.token;
        let format = parseFormat(options.defaultFormat || existing.outputFormat || "toon") as OutputFormat;
        let timeout = parseTimeout(options.defaultTimeout || String(existing.timeout ?? 30000)) as number;
        let readOnly = parseBoolean(options.configReadOnly || (existing.readOnly ? "yes" : "no")) as boolean;
        receiptFormat = globalFormat ?? format;

        if (!nonInteractive) {
          const rl = createInterface({ input: process.stdin, output: process.stdout });
          const question = (prompt: string): Promise<string> => new Promise((resolve) => {
            rl.question(prompt, (answer) => resolve(answer.trim()));
          });
          const promptRequired = async (prompt: string, fallback?: string): Promise<string> => {
            while (true) {
              const value = await question(fallback ? `${prompt} [${fallback}]: ` : `${prompt}: `);
              const resolved = value || fallback;
              if (resolved) return resolved;
              console.error("ERROR: Value is required");
            }
          };
          const promptSecretRequired = async (prompt: string, fallback?: string): Promise<string> => {
            while (true) {
              const value = await question(
                fallback ? `${prompt} [saved token available; press Enter to keep]: ` : `${prompt}: `
              );
              if (value) return value;
              if (fallback) return fallback;
              console.error("ERROR: Value is required");
            }
          };
          urlInput = await promptRequired("Home Assistant URL", existing.url);
          console.log("\nToken Instructions:");
          console.log("1. Open Home Assistant in browser");
          console.log("2. Go to Profile > Long-Lived Access Tokens");
          console.log("3. Click 'Create Token' and copy\n");
          token = await promptSecretRequired("Long-Lived Access Token", existing.token);
          console.log("\nFormats: toon, json, json-compact, yaml, table, markdown");
          format = parseFormat(await question(`Default format [${existing.outputFormat ?? "toon"}]: `) || existing.outputFormat || "toon") as OutputFormat;
          timeout = parseTimeout(await question(`Timeout in ms [${existing.timeout ?? 30000}]: `) || String(existing.timeout ?? 30000)) as number;
          readOnly = parseBoolean(await question(
            `Enable read-only safety mode (blocks write commands) [${existing.readOnly ? "yes" : "no"}]: `
          ) || (existing.readOnly ? "yes" : "no")) as boolean;
          rl.close();
        }

        if (!urlInput || !token) {
          throw new Error("URL and token are required. Use prompts or --non-interactive with --ha-url/--ha-token.");
        }
        if (!/^https?:\/\//.test(urlInput)) {
          throw new Error("URL must start with http:// or https://");
        }
        const normalizedUrl = urlInput.replace(/\/$/, "");

        const config = {
          url: normalizedUrl,
          token,
          outputFormat: format,
          timeout,
          readOnly,
        };

        saveConfig(config, configPath);
        const connection = options.skipTest
          ? { status: "skipped" } as const
          : await testConnection(config, configPath);
        const receipt = {
          setup: "complete",
          saved: {
            settings: getConfigPath(configPath),
            auth: getAuthPath(configPath),
            data: getDataPath(configPath),
          },
          defaults: { format, timeout_ms: timeout, read_only: readOnly },
          connection: connection.status === "failed"
            ? { status: "failed", message: "Configuration saved but connection failed. Verify URL and token." }
            : connection,
          next_command: "hassio status",
        };

        if (nonInteractive) {
          console.log(formatOutput(receipt, receiptFormat));
          return;
        }
        console.log(`\nsaved_settings:${receipt.saved.settings}`);
        console.log(`saved_auth:${receipt.saved.auth}`);
        console.log(`saved_data:${receipt.saved.data}`);
        if (connection.status === "connected") {
          console.log("\nTesting connection...");
          console.log(`status:${connection.api_status}`);
          console.log(`version:${connection.version}`);
          console.log(`read_only:${readOnly}`);
        } else if (connection.status === "failed") {
          console.error("\nERROR: Connection test failed");
          console.error(connection.detail);
          console.error("\nConfiguration saved but connection failed. Verify URL and token.");
        }
        console.log("\nSetup complete. Run: hassio status");
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        if (nonInteractive) {
          console.log(formatOutput({ setup: "failed", error: { code: "configuration_error", message } }, receiptFormat));
        } else {
          console.error("\nERROR:", message);
        }
        process.exit(1);
      }
    }));
}

export function createSetupCommand(): Command {
  return createWizardCommand()
    .name("setup")
    .description("Setup wizard alias for first-time configuration");
}
