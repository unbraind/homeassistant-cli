import { Command } from "commander";
import { HomeAssistantClient } from "../api/client.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createTimersCommand(): Command {
  const command = new Command("timers")
    .description("List and control Home Assistant timer helpers")
    .option("-e, --entity-id <entityId>", "Filter to a specific timer entity")
    .option("--start <entityId>", "Start a timer")
    .option("--pause <entityId>", "Pause a running timer")
    .option("--cancel <entityId>", "Cancel a timer")
    .option("--finish <entityId>", "Finish a timer immediately")
    .option("--change <entityId>", "Change timer duration (requires --duration)")
    .option("-d, --duration <duration>", "Duration (e.g. 00:10:00, 600, or -60 for change)")
    .option("--reload", "Reload all timer configuration")
    .option("--count", "Only return count of timers")
    .option("--state <state>", "Filter by state (idle, active, paused)");

  command.action(withExit(async (options: {
    entityId?: string;
    start?: string;
    pause?: string;
    cancel?: string;
    finish?: string;
    change?: string;
    duration?: string;
    reload?: boolean;
    count?: boolean;
    state?: string;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    if (options.reload) {
      await client.callService("timer", "reload", {});
      console.log(formatOutput({ success: true, message: "Timer configuration reloaded" }, format));
      return;
    }

    if (options.start) {
      const data: Record<string, string> = { entity_id: options.start };
      if (options.duration) data["duration"] = options.duration;
      await client.callService("timer", "start", data);
      console.log(formatOutput({ success: true, action: "started", entity_id: options.start }, format));
      return;
    }

    if (options.pause) {
      await client.callService("timer", "pause", { entity_id: options.pause });
      console.log(formatOutput({ success: true, action: "paused", entity_id: options.pause }, format));
      return;
    }

    if (options.cancel) {
      await client.callService("timer", "cancel", { entity_id: options.cancel });
      console.log(formatOutput({ success: true, action: "cancelled", entity_id: options.cancel }, format));
      return;
    }

    if (options.finish) {
      await client.callService("timer", "finish", { entity_id: options.finish });
      console.log(formatOutput({ success: true, action: "finished", entity_id: options.finish }, format));
      return;
    }

    if (options.change) {
      if (!options.duration) {
        console.error("--duration is required for --change");
        process.exit(1);
      }
      await client.callService("timer", "change", { entity_id: options.change, duration: options.duration });
      console.log(formatOutput({ success: true, action: "changed", entity_id: options.change, duration: options.duration }, format));
      return;
    }

    // List timers
    let states = await client.getStates();
    let timers = states.filter(s => s.entity_id.startsWith("timer."));
    if (options.entityId) timers = timers.filter(t => t.entity_id === options.entityId);
    if (options.state) timers = timers.filter(t => t.state === options.state);

    const simplified = timers.map(t => ({
      entity_id: t.entity_id,
      state: t.state,
      duration: t.attributes["duration"],
      friendly_name: t.attributes["friendly_name"],
      editable: t.attributes["editable"],
    }));

    if (options.count) {
      console.log(formatOutput({ timers_count: simplified.length }, format));
      return;
    }

    console.log(formatOutput({ timers: simplified }, format));
  }));

  return command;
}
