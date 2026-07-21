/**
 * Defines the event entity command surface, options, help, and output behavior.
 */
import { Command } from "commander";
import { HomeAssistantClient } from "../api/client.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createEventEntityCommand(): Command {
  const command = new Command("event")
    .description("Browse Home Assistant event entities (read-only; see 'events' for HA event bus)")
    .option("-e, --entity-id <entityId>", "Get a specific event entity")
    .option("--class <deviceClass>", "Filter by device class (e.g. button, motion, doorbell)")
    .option("--count", "Only return count of event entities")
    .option("-s, --state <state>", "Filter by state (ISO timestamp of last event)");

  command.action(withExit(async (options: {
    entityId?: string;
    class?: string;
    count?: boolean;
    state?: string;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    const states = await client.getStates();
    let events = states.filter(s => s.entity_id.startsWith("event."));

    if (options.entityId) {
      events = events.filter(e => e.entity_id === options.entityId);
    }

    if (options.class) {
      events = events.filter(e => e.attributes["device_class"] === options.class);
    }

    if (options.state) {
      events = events.filter(e => e.state === options.state);
    }

    const simplified = events.map(e => ({
      entity_id: e.entity_id,
      state: e.state,
      friendly_name: e.attributes["friendly_name"],
      device_class: e.attributes["device_class"],
      event_type: e.attributes["event_type"],
      event_types: e.attributes["event_types"],
    }));

    if (options.count) {
      console.log(formatOutput({ event_entities_count: simplified.length }, format));
      return;
    }

    console.log(formatOutput({ event_entities: simplified }, format));
  }));

  return command;
}
