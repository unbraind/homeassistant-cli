import { Command } from "commander";
import { HomeAssistantClient } from "../api/index.js";
import { SupervisorApiClient } from "../api/supervisor.js";
import { getAuthPath, getConfig, getData, getDataPath, getConfigPath } from "../config/index.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { maybePromptToStarRepo } from "../utils/github-star.js";
import { getConfigPathFromCommand, withConfigPath } from "./settings-utils.js";
import { parse as parseYaml } from "yaml";

function classifySupervisorError(error: unknown): { code: string; message: string; hint: string } {
  const message = error instanceof Error ? error.message : String(error);
  if (/401/.test(message)) {
    return {
      code: "unauthorized",
      message,
      hint: "Supervisor API requires Home Assistant OS/Supervised and a user token with supervisor access.",
    };
  }
  if (/404/.test(message)) {
    return {
      code: "not_supported",
      message,
      hint: "Supervisor API is unavailable on this installation (common on Home Assistant Container/Core).",
    };
  }
  return {
    code: "unknown_error",
    message,
    hint: "Verify supervisor availability and token permissions.",
  };
}

function validateSampleFormatOutput(): {
  all_valid: boolean;
  by_format: Record<string, { valid: boolean; size: number; error?: string }>;
} {
  const sample = {
    ok: true,
    kind: "diagnostic",
    count: 2,
    items: ["a", "b"],
    nested: { stable: true },
  };
  const formats = ["toon", "json", "json-compact", "yaml", "table", "markdown"] as const;
  const byFormat: Record<string, { valid: boolean; size: number; error?: string }> = {};

  for (const format of formats) {
    const out = formatOutput(sample, format);
    const baseResult = { valid: out.length > 0, size: out.length };
    try {
      if (format === "json" || format === "json-compact") {
        JSON.parse(out);
      } else if (format === "yaml") {
        parseYaml(out);
      }
      byFormat[format] = baseResult;
    } catch (error) {
      byFormat[format] = {
        ...baseResult,
        valid: false,
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  return {
    all_valid: Object.values(byFormat).every((entry) => entry.valid),
    by_format: byFormat,
  };
}

export function createDoctorCommand(): Command {
  return new Command("doctor")
    .description("Run setup, API, and output-format diagnostics for agents/automation")
    .option("--skip-supervisor", "Skip supervisor capability probe")
    .option("--skip-format-validation", "Skip sample output-format validation")
    .action(withExit(async (options: {
      skipSupervisor?: boolean;
      skipFormatValidation?: boolean;
    }, cmd) => {
      await maybePromptToStarRepo();
      const configPath = getConfigPathFromCommand(cmd as Command);
      const config = getConfig(withConfigPath(configPath));
      const client = new HomeAssistantClient(config);

      const status = await client.getStatus();
      const haConfig = await client.getConfig();
      const states = await client.getStates();
      const runtime = getData(configPath);

      const formatValidation = options.skipFormatValidation
        ? { skipped: true }
        : validateSampleFormatOutput();

      let supervisor: Record<string, unknown> = { skipped: true };
      if (!options.skipSupervisor) {
        const supervisorClient = new SupervisorApiClient(config);
        try {
          const addons = await supervisorClient.getAddons();
          const data = addons.data as { addons?: unknown[] } | undefined;
          supervisor = {
            available: true,
            result: addons.result,
            addon_count: Array.isArray(data?.addons) ? data.addons.length : undefined,
          };
        } catch (error) {
          supervisor = {
            available: false,
            ...classifySupervisorError(error),
          };
        }
      }

      const report = {
        healthy: status.message.toLowerCase().includes("running"),
        checked_at: new Date().toISOString(),
        config_path: getConfigPath(configPath),
        auth_path: getAuthPath(configPath),
        data_path: getDataPath(configPath),
        api: {
          message: status.message,
          version: haConfig.version,
          location: haConfig.location_name,
          entity_count: states.length,
        },
        runtime,
        output_validation: formatValidation,
        supervisor,
      };

      console.log(formatOutput(report, config.outputFormat));
    }));
}
