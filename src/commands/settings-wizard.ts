import { Command } from "commander";
import { getAuthPath, getConfigPath, getConfigSnapshot, getDataPath, saveConfig, saveData } from "../config/index.js";
import { withExit } from "../utils/exit.js";
import { maybePromptToStarRepo } from "../utils/github-star.js";
import type { OutputFormat } from "../types/index.js";

const VALID_FORMATS: OutputFormat[] = ["toon", "json", "json-compact", "yaml", "table", "markdown"];

interface GlobalOptions {
  config?: string;
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
  if (["1", "true", "yes", "on", "y"].includes(normalized)) {
    return true;
  }
  if (["0", "false", "no", "off", "n"].includes(normalized)) {
    return false;
  }
  throw new Error(`Invalid boolean '${value}'. Use yes/no or true/false.`);
}

function getConfigPathFromCommand(cmd: Command): string | undefined {
  const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
  return globalOpts.config;
}

function withConfigPath(configPath?: string): { configPath?: string } {
  return configPath ? { configPath } : {};
}

interface WizardOptions {
  skipTest?: boolean;
  nonInteractive?: boolean;
  haUrl?: string;
  haToken?: string;
  defaultFormat?: string;
  defaultTimeout?: string;
  readOnly?: string;
}

async function testConnection(config: {
  url: string;
  token: string;
  outputFormat: OutputFormat;
  timeout: number;
  readOnly: boolean;
}, configPath?: string): Promise<void> {
  console.log("\nTesting connection...");
  const { HomeAssistantClient } = await import("../api/index.js");
  const client = new HomeAssistantClient(config);
  try {
    const status = await client.getStatus();
    const haConfig = await client.getConfig();
    saveData({
      lastValidatedAt: new Date().toISOString(),
      lastVersion: haConfig.version,
      lastLocation: haConfig.location_name,
    }, configPath);
    console.log(`status:${status.message}`);
    console.log(`version:${haConfig.version}`);
    console.log(`location:${haConfig.location_name}`);
    console.log(`read_only:${config.readOnly}`);
  } catch (error) {
    console.error("\nERROR: Connection test failed");
    console.error(error instanceof Error ? error.message : String(error));
    console.error("\nConfiguration saved but connection failed. Verify URL and token.");
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
    .option("--read-only <boolean>", "Read-only safety mode for non-interactive mode")
    .option("--skip-test", "Skip connection test after configuration")
    .action(withExit(async (options: WizardOptions, cmd) => {
      await maybePromptToStarRepo();
      const configPath = getConfigPathFromCommand(cmd as Command);
      const existing = getConfigSnapshot(withConfigPath(configPath));

      console.log("\nSETUP WIZARD\n");

      try {
        const nonInteractive = options.nonInteractive === true;
        let urlInput = options.haUrl || existing.url;
        let token = options.haToken || existing.token;
        let format = parseFormat(options.defaultFormat || existing.outputFormat || "toon") ?? "toon";
        let timeout = parseTimeout(options.defaultTimeout || String(existing.timeout ?? 30000)) ?? 30000;
        let readOnly = parseBoolean(options.readOnly || (existing.readOnly ? "yes" : "no")) ?? false;

        if (!nonInteractive) {
          const readline = await import("node:readline");
          const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
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
          format = parseFormat(await question(`Default format [${existing.outputFormat ?? "toon"}]: `) || existing.outputFormat || "toon") ?? "toon";
          timeout = parseTimeout(await question(`Timeout in ms [${existing.timeout ?? 30000}]: `) || String(existing.timeout ?? 30000)) ?? 30000;
          readOnly = parseBoolean(await question(
            `Enable read-only safety mode (blocks write commands) [${existing.readOnly ? "yes" : "no"}]: `
          ) || (existing.readOnly ? "yes" : "no")) ?? false;
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
        console.log(`\nsaved_settings:${getConfigPath(configPath)}`);
        console.log(`saved_auth:${getAuthPath(configPath)}`);
        console.log(`saved_data:${getDataPath(configPath)}`);

        if (!options.skipTest) {
          await testConnection(config, configPath);
        }

        console.log("\nSetup complete. Run: hassio status");
      } catch (error) {
        console.error("\nERROR:", error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    }));
}
