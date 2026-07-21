/**
 * Defines the select command surface, options, help, and output behavior.
 */
import { Command } from "commander";
import { HomeAssistantClient } from "../api/client.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createSelectCommand(): Command {
  const command = new Command("select")
    .description("Control Home Assistant select entities")
    .option("-e, --entity-id <entityId>", "Target select entity")
    .option("--set <option>", "Select a specific option (use with --entity-id)")
    .option("--next <entityId>", "Select the next option")
    .option("--prev <entityId>", "Select the previous option")
    .option("--first <entityId>", "Select the first option")
    .option("--last <entityId>", "Select the last option")
    .option("--count", "Only return count of select entities")
    .option("-s, --state <state>", "Filter listed select entities by current option value");

  command.action(withExit(async (options: {
    entityId?: string;
    set?: string;
    next?: string;
    prev?: string;
    first?: string;
    last?: string;
    count?: boolean;
    state?: string;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    if (options.entityId && options.set) {
      await client.callService("select", "select_option", {
        entity_id: options.entityId,
        option: options.set,
      });
      console.log(formatOutput({ success: true, action: "selected_option", entity_id: options.entityId, option: options.set }, format));
      return;
    }

    if (options.next) {
      await client.callService("select", "select_next", { entity_id: options.next });
      console.log(formatOutput({ success: true, action: "select_next", entity_id: options.next }, format));
      return;
    }

    if (options.prev) {
      await client.callService("select", "select_previous", { entity_id: options.prev });
      console.log(formatOutput({ success: true, action: "select_previous", entity_id: options.prev }, format));
      return;
    }

    if (options.first) {
      await client.callService("select", "select_first", { entity_id: options.first });
      console.log(formatOutput({ success: true, action: "select_first", entity_id: options.first }, format));
      return;
    }

    if (options.last) {
      await client.callService("select", "select_last", { entity_id: options.last });
      console.log(formatOutput({ success: true, action: "select_last", entity_id: options.last }, format));
      return;
    }

    // List select entities
    const states = await client.getStates();
    let selects = states.filter(s => s.entity_id.startsWith("select."));
    if (options.state) selects = selects.filter(s => s.state === options.state);

    const simplified = selects.map(s => ({
      entity_id: s.entity_id,
      state: s.state,
      friendly_name: s.attributes["friendly_name"],
      options: s.attributes["options"],
    }));

    if (options.count) {
      console.log(formatOutput({ selects_count: simplified.length }, format));
      return;
    }

    console.log(formatOutput({ selects: simplified }, format));
  }));

  return command;
}
