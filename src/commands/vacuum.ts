import { Command } from "commander";
import { HomeAssistantClient } from "../api/client.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createVacuumCommand(): Command {
  const command = new Command("vacuum")
    .description("Control Home Assistant vacuum entities (robot vacuums)")
    .option("--start <entityId>", "Start the vacuum")
    .option("--pause <entityId>", "Pause the vacuum")
    .option("--stop <entityId>", "Stop the vacuum")
    .option("--return-to-base <entityId>", "Send vacuum to docking station")
    .option("--clean-spot <entityId>", "Start spot cleaning")
    .option("--locate <entityId>", "Locate the vacuum (play sound)")
    .option("-e, --entity-id <entityId>", "Target vacuum entity")
    .option("--fan-speed <speed>", "Set fan speed (use with --entity-id)")
    .option("--command <command>", "Send a custom command (use with --entity-id)")
    .option("--params <json>", "JSON parameters for --command")
    .option("--count", "Only return count of vacuum entities")
    .option("-s, --state <state>", "Filter by state (cleaning, docked, idle, paused, returning, error)");

  command.action(withExit(async (options: {
    start?: string;
    pause?: string;
    stop?: string;
    returnToBase?: string;
    cleanSpot?: string;
    locate?: string;
    entityId?: string;
    fanSpeed?: string;
    command?: string;
    params?: string;
    count?: boolean;
    state?: string;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    if (options.start) {
      await client.callService("vacuum", "start", { entity_id: options.start });
      console.log(formatOutput({ success: true, action: "started", entity_id: options.start }, format));
      return;
    }

    if (options.pause) {
      await client.callService("vacuum", "pause", { entity_id: options.pause });
      console.log(formatOutput({ success: true, action: "paused", entity_id: options.pause }, format));
      return;
    }

    if (options.stop) {
      await client.callService("vacuum", "stop", { entity_id: options.stop });
      console.log(formatOutput({ success: true, action: "stopped", entity_id: options.stop }, format));
      return;
    }

    if (options.returnToBase) {
      await client.callService("vacuum", "return_to_base", { entity_id: options.returnToBase });
      console.log(formatOutput({ success: true, action: "returning_to_base", entity_id: options.returnToBase }, format));
      return;
    }

    if (options.cleanSpot) {
      await client.callService("vacuum", "clean_spot", { entity_id: options.cleanSpot });
      console.log(formatOutput({ success: true, action: "clean_spot", entity_id: options.cleanSpot }, format));
      return;
    }

    if (options.locate) {
      await client.callService("vacuum", "locate", { entity_id: options.locate });
      console.log(formatOutput({ success: true, action: "located", entity_id: options.locate }, format));
      return;
    }

    if (options.entityId && options.fanSpeed !== undefined) {
      await client.callService("vacuum", "set_fan_speed", {
        entity_id: options.entityId,
        fan_speed: options.fanSpeed,
      });
      console.log(formatOutput({ success: true, action: "set_fan_speed", entity_id: options.entityId, fan_speed: options.fanSpeed }, format));
      return;
    }

    if (options.entityId && options.command !== undefined) {
      const payload: Record<string, unknown> = { entity_id: options.entityId, command: options.command };
      if (options.params) {
        try {
          payload["params"] = JSON.parse(options.params);
        } catch {
          console.error("Error: --params must be valid JSON");
          process.exit(1);
          return;
        }
      }
      await client.callService("vacuum", "send_command", payload);
      console.log(formatOutput({ success: true, action: "send_command", entity_id: options.entityId, command: options.command }, format));
      return;
    }

    // List vacuum entities
    const states = await client.getStates();
    let vacuums = states.filter(s => s.entity_id.startsWith("vacuum."));
    if (options.state) vacuums = vacuums.filter(v => v.state === options.state);

    const simplified = vacuums.map(v => ({
      entity_id: v.entity_id,
      state: v.state,
      battery_level: v.attributes["battery_level"],
      battery_icon: v.attributes["battery_icon"],
      fan_speed: v.attributes["fan_speed"],
      fan_speed_list: v.attributes["fan_speed_list"],
      device_class: v.attributes["device_class"],
      friendly_name: v.attributes["friendly_name"],
    }));

    if (options.count) {
      console.log(formatOutput({ vacuums_count: simplified.length }, format));
      return;
    }

    console.log(formatOutput({ vacuums: simplified }, format));
  }));

  return command;
}
