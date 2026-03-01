import { Command } from "commander";
import { getConfigPath, getConfigSnapshot, saveConfig } from "../config/index.js";
import { withExit } from "../utils/exit.js";
import type { OutputFormat } from "../types/index.js";

const VALID_FORMATS: OutputFormat[] = ["toon", "json", "json-compact", "yaml", "table"];

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

function getConfigPathFromCommand(cmd: Command): string | undefined {
  const globalOpts = cmd.optsWithGlobals() as GlobalOptions;
  return globalOpts.config;
}

function withConfigPath(configPath?: string): { configPath?: string } {
  return configPath ? { configPath } : {};
}

export function createWizardCommand(): Command {
  return new Command("wizard")
    .description("Interactive setup wizard for first-time configuration")
    .option("--skip-test", "Skip connection test after configuration")
    .action(withExit(async (options: { skipTest?: boolean }, cmd) => {
      const readline = await import("node:readline");
      const configPath = getConfigPathFromCommand(cmd as Command);
      const existing = getConfigSnapshot(withConfigPath(configPath));

      const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
      });

      const question = (prompt: string): Promise<string> => {
        return new Promise((resolve) => {
          rl.question(prompt, (answer) => resolve(answer.trim()));
        });
      };

      const promptRequired = async (prompt: string, fallback?: string): Promise<string> => {
        while (true) {
          const withDefault = fallback ? `${prompt} [${fallback}]: ` : `${prompt}: `;
          const value = await question(withDefault);
          const resolved = value || fallback;
          if (resolved) {
            return resolved;
          }
          console.error("ERROR: Value is required");
        }
      };

      console.log("\nSETUP WIZARD\n");

      try {
        const urlInput = await promptRequired("Home Assistant URL", existing.url);
        if (!/^https?:\/\//.test(urlInput)) {
          throw new Error("URL must start with http:// or https://");
        }
        const normalizedUrl = urlInput.replace(/\/$/, "");

        console.log("\nToken Instructions:");
        console.log("1. Open Home Assistant in browser");
        console.log("2. Go to Profile > Long-Lived Access Tokens");
        console.log("3. Click 'Create Token' and copy\n");

        const token = await promptRequired("Long-Lived Access Token", existing.token);

        console.log("\nFormats: toon, json, json-compact, yaml, table");
        const formatInput = await question(`Default format [${existing.outputFormat ?? "toon"}]: `);
        const format = parseFormat(formatInput || existing.outputFormat || "toon") ?? "toon";

        const timeoutInput = await question(`Timeout in ms [${existing.timeout ?? 30000}]: `);
        const timeout = parseTimeout(timeoutInput || String(existing.timeout ?? 30000)) ?? 30000;

        const config = {
          url: normalizedUrl,
          token,
          outputFormat: format,
          timeout,
        };

        saveConfig(config, configPath);
        console.log(`\nsaved:${getConfigPath(configPath)}`);

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
