import { Command } from "commander";
import { HomeAssistantClient } from "../api/client.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createButtonCommand(): Command {
  const command = new Command("button")
    .description("Press Home Assistant button entities")
    .option("--press <entityId>", "Press a button entity")
    .option("--count", "Only return count of button entities")
    .option("-s, --state <state>", "Filter listed buttons by state");

  command.action(withExit(async (options: {
    press?: string;
    count?: boolean;
    state?: string;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    if (options.press) {
      await client.callService("button", "press", { entity_id: options.press });
      console.log(formatOutput({ success: true, action: "pressed", entity_id: options.press }, format));
      return;
    }

    // List button entities
    const states = await client.getStates();
    let buttons = states.filter(s => s.entity_id.startsWith("button."));
    if (options.state) buttons = buttons.filter(b => b.state === options.state);

    const simplified = buttons.map(b => ({
      entity_id: b.entity_id,
      state: b.state,
      friendly_name: b.attributes["friendly_name"],
      device_class: b.attributes["device_class"],
    }));

    if (options.count) {
      console.log(formatOutput({ buttons_count: simplified.length }, format));
      return;
    }

    console.log(formatOutput({ buttons: simplified }, format));
  }));

  return command;
}
