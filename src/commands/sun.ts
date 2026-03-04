import { Command } from "commander";
import { HomeAssistantClient } from "../api/client.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createSunCommand(): Command {
  const command = new Command("sun")
    .description("Get sun/solar position and schedule (sunrise, sunset, elevation, azimuth)");

  command.action(withExit(async (_options: Record<string, unknown>, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    const states = await client.getStates();
    const sun = states.find(s => s.entity_id === "sun.sun");

    if (!sun) {
      console.log(formatOutput({ error: "sun.sun entity not found" }, format));
      return;
    }

    const attrs = sun.attributes as Record<string, unknown>;
    console.log(formatOutput({
      state: sun.state,
      elevation: attrs["elevation"],
      azimuth: attrs["azimuth"],
      rising: attrs["rising"],
      next_dawn: attrs["next_dawn"],
      next_rising: attrs["next_rising"],
      next_noon: attrs["next_noon"],
      next_setting: attrs["next_setting"],
      next_dusk: attrs["next_dusk"],
      next_midnight: attrs["next_midnight"],
    }, format));
  }));

  return command;
}
