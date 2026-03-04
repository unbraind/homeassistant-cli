import { Command } from "commander";
import { HomeAssistantClient } from "../api/client.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createCounterCommand(): Command {
  const command = new Command("counter")
    .description("Manage Home Assistant counter helper entities")
    .option("-e, --entity-id <entityId>", "Target counter entity for set operations")
    .option("--increment <entityId>", "Increment a counter by 1 (or its configured step)")
    .option("--decrement <entityId>", "Decrement a counter by 1 (or its configured step)")
    .option("--reset <entityId>", "Reset a counter to its initial value")
    .option("--set <value>", "Set a counter to a specific value (use with --entity-id)")
    .option("--count", "Only return count of counter entities")
    .option("-s, --state <state>", "Filter by state value");

  command.action(withExit(async (options: {
    entityId?: string;
    increment?: string;
    decrement?: string;
    reset?: string;
    set?: string;
    count?: boolean;
    state?: string;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    if (options.increment) {
      await client.callService("counter", "increment", { entity_id: options.increment });
      console.log(formatOutput({ success: true, action: "incremented", entity_id: options.increment }, format));
      return;
    }

    if (options.decrement) {
      await client.callService("counter", "decrement", { entity_id: options.decrement });
      console.log(formatOutput({ success: true, action: "decremented", entity_id: options.decrement }, format));
      return;
    }

    if (options.reset) {
      await client.callService("counter", "reset", { entity_id: options.reset });
      console.log(formatOutput({ success: true, action: "reset", entity_id: options.reset }, format));
      return;
    }

    if (options.set !== undefined) {
      const entityId = options.entityId;
      if (!entityId) {
        console.error("Error: --entity-id required when using --set");
        process.exit(1);
        return;
      }
      const value = parseInt(options.set, 10);
      if (isNaN(value)) {
        console.error("Error: --set value must be an integer");
        process.exit(1);
        return;
      }
      await client.callService("counter", "set_value", { entity_id: entityId, value });
      console.log(formatOutput({ success: true, action: "set_value", entity_id: entityId, value }, format));
      return;
    }

    // List counter entities
    const states = await client.getStates();
    let counters = states.filter(s => s.entity_id.startsWith("counter."));
    if (options.state) counters = counters.filter(c => c.state === options.state);

    const simplified = counters.map(c => ({
      entity_id: c.entity_id,
      state: c.state,
      friendly_name: c.attributes["friendly_name"],
      initial: c.attributes["initial"],
      step: c.attributes["step"],
      min: c.attributes["min"],
      max: c.attributes["max"],
      restore: c.attributes["restore"],
    }));

    if (options.count) {
      console.log(formatOutput({ counters_count: simplified.length }, format));
      return;
    }

    console.log(formatOutput({ counters: simplified }, format));
  }));

  return command;
}
