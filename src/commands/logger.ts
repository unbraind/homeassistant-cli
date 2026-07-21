/**
 * Defines the logger command surface, options, help, and output behavior.
 */
import { Command } from "commander";
import { HomeAssistantClient } from "../api/client.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

const VALID_LEVELS = ["debug", "info", "warning", "error", "fatal", "critical"];

export function createLoggerCommand(): Command {
  const command = new Command("logger")
    .description("Manage Home Assistant log levels for components")
    .option("--set-default <level>", `Set the default log level (${VALID_LEVELS.join(", ")})`)
    .option("--set <component=level>", "Set log level for a specific component (e.g. homeassistant.components.http=debug)", (val, acc: string[]) => { acc.push(val); return acc; }, [] as string[]);

  command.action(withExit(async (options: {
    setDefault?: string;
    set?: string[];
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    if (options.setDefault) {
      const level = options.setDefault.toLowerCase();
      if (!VALID_LEVELS.includes(level)) {
        console.error(`Error: invalid log level '${level}'. Valid levels: ${VALID_LEVELS.join(", ")}`);
        process.exit(1);
        return;
      }
      await client.callService("logger", "set_default_level", { level });
      console.log(formatOutput({ success: true, action: "set_default_level", level }, format));
      return;
    }

    if (options.set && options.set.length > 0) {
      const logs: Record<string, string> = {};
      for (const entry of options.set) {
        const sep = entry.lastIndexOf("=");
        if (sep === -1) {
          console.error(`Error: invalid format '${entry}'. Expected component=level (e.g. homeassistant.components.http=debug)`);
          process.exit(1);
          return;
        }
        const component = entry.slice(0, sep);
        const level = entry.slice(sep + 1).toLowerCase();
        if (!VALID_LEVELS.includes(level)) {
          console.error(`Error: invalid log level '${level}' for '${component}'. Valid levels: ${VALID_LEVELS.join(", ")}`);
          process.exit(1);
          return;
        }
        logs[component] = level;
      }
      await client.callService("logger", "set_level", logs);
      console.log(formatOutput({ success: true, action: "set_level", logs }, format));
      return;
    }

    console.error("Error: specify --set-default <level> or --set <component=level>");
    process.exit(1);
  }));

  return command;
}
