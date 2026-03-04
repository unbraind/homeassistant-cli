import { Command } from "commander";
import { HomeAssistantClient } from "../api/client.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createNumberCommand(): Command {
  const command = new Command("number")
    .description("Control Home Assistant number entities")
    .option("-e, --entity-id <entityId>", "Target number entity")
    .option("--set <value>", "Set numeric value (use with --entity-id)")
    .option("--count", "Only return count of number entities")
    .option("-s, --state <state>", "Filter listed number entities by state value");

  command.action(withExit(async (options: {
    entityId?: string;
    set?: string;
    count?: boolean;
    state?: string;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    if (options.entityId && options.set !== undefined) {
      await client.callService("number", "set_value", {
        entity_id: options.entityId,
        value: options.set,
      });
      console.log(formatOutput({ success: true, action: "set_value", entity_id: options.entityId, value: options.set }, format));
      return;
    }

    // List number entities
    const states = await client.getStates();
    let numbers = states.filter(s => s.entity_id.startsWith("number."));
    if (options.state) numbers = numbers.filter(n => n.state === options.state);

    const simplified = numbers.map(n => ({
      entity_id: n.entity_id,
      state: n.state,
      friendly_name: n.attributes["friendly_name"],
      min: n.attributes["min"],
      max: n.attributes["max"],
      step: n.attributes["step"],
      unit_of_measurement: n.attributes["unit_of_measurement"],
      mode: n.attributes["mode"],
    }));

    if (options.count) {
      console.log(formatOutput({ numbers_count: simplified.length }, format));
      return;
    }

    console.log(formatOutput({ numbers: simplified }, format));
  }));

  return command;
}
