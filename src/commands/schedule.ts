/**
 * Defines the schedule command surface, options, help, and output behavior.
 */
import { Command } from "commander";
import { HomeAssistantClient } from "../api/client.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createScheduleCommand(): Command {
  const command = new Command("schedule")
    .description("Manage Home Assistant schedule helper entities")
    .option("-e, --entity-id <entityId>", "Get schedule details for a specific schedule entity")
    .option("--reload", "Reload schedule configuration from YAML")
    .option("--count", "Only return count of schedule entities")
    .option("-s, --state <state>", "Filter by state (on, off)");

  command.action(withExit(async (options: {
    entityId?: string;
    reload?: boolean;
    count?: boolean;
    state?: string;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    if (options.reload) {
      await client.callService("schedule", "reload", {});
      console.log(formatOutput({ success: true, action: "reloaded" }, format));
      return;
    }

    if (options.entityId) {
      const result = await client.callService("schedule", "get_schedule", { entity_id: options.entityId }, true);
      console.log(formatOutput({ entity_id: options.entityId, schedule: result }, format));
      return;
    }

    // List schedule entities
    const states = await client.getStates();
    let schedules = states.filter(s => s.entity_id.startsWith("schedule."));
    if (options.state) schedules = schedules.filter(s => s.state === options.state);

    const simplified = schedules.map(s => ({
      entity_id: s.entity_id,
      state: s.state,
      friendly_name: s.attributes["friendly_name"] as string | undefined,
      icon: s.attributes["icon"] as string | undefined,
    }));

    if (options.count) {
      console.log(formatOutput({ schedules_count: simplified.length }, format));
      return;
    }

    console.log(formatOutput({ schedules: simplified }, format));
  }));

  return command;
}
