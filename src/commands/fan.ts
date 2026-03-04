import { Command } from "commander";
import { HomeAssistantClient } from "../api/client.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createFanCommand(): Command {
  const command = new Command("fan")
    .description("Control Home Assistant fan entities")
    .option("--on <entityId>", "Turn on a fan")
    .option("--off <entityId>", "Turn off a fan")
    .option("--toggle <entityId>", "Toggle a fan")
    .option("-e, --entity-id <entityId>", "Target fan for speed/mode operations")
    .option("--percentage <0-100>", "Set fan speed percentage (use with --entity-id or --on)")
    .option("--preset <mode>", "Set fan preset mode (use with --entity-id or --on)")
    .option("--increase-speed <entityId>", "Increase fan speed")
    .option("--decrease-speed <entityId>", "Decrease fan speed")
    .option("--oscillate <entityId>", "Enable oscillation")
    .option("--no-oscillate", "Disable oscillation (use with --entity-id)")
    .option("--direction <forward|reverse>", "Set fan direction (use with --entity-id)")
    .option("--count", "Only return count of fan entities")
    .option("-s, --state <state>", "Filter by state (on, off)");

  command.action(withExit(async (options: {
    on?: string;
    off?: string;
    toggle?: string;
    entityId?: string;
    percentage?: string;
    preset?: string;
    increaseSpeed?: string;
    decreaseSpeed?: string;
    oscillate?: string;
    noOscillate?: boolean;
    direction?: string;
    count?: boolean;
    state?: string;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    if (options.on) {
      const data: Record<string, unknown> = { entity_id: options.on };
      if (options.percentage) data["percentage"] = parseInt(options.percentage, 10);
      if (options.preset) data["preset_mode"] = options.preset;
      await client.callService("fan", "turn_on", data);
      console.log(formatOutput({ success: true, action: "turned_on", entity_id: options.on }, format));
      return;
    }

    if (options.off) {
      await client.callService("fan", "turn_off", { entity_id: options.off });
      console.log(formatOutput({ success: true, action: "turned_off", entity_id: options.off }, format));
      return;
    }

    if (options.toggle) {
      await client.callService("fan", "toggle", { entity_id: options.toggle });
      console.log(formatOutput({ success: true, action: "toggled", entity_id: options.toggle }, format));
      return;
    }

    if (options.entityId && options.percentage) {
      await client.callService("fan", "set_percentage", {
        entity_id: options.entityId,
        percentage: parseInt(options.percentage, 10),
      });
      console.log(formatOutput({ success: true, action: "set_percentage", entity_id: options.entityId, percentage: parseInt(options.percentage, 10) }, format));
      return;
    }

    if (options.entityId && options.preset) {
      await client.callService("fan", "set_preset_mode", {
        entity_id: options.entityId,
        preset_mode: options.preset,
      });
      console.log(formatOutput({ success: true, action: "set_preset_mode", entity_id: options.entityId, preset_mode: options.preset }, format));
      return;
    }

    if (options.entityId && options.direction) {
      await client.callService("fan", "set_direction", {
        entity_id: options.entityId,
        direction: options.direction,
      });
      console.log(formatOutput({ success: true, action: "set_direction", entity_id: options.entityId, direction: options.direction }, format));
      return;
    }

    if (options.oscillate) {
      await client.callService("fan", "oscillate", { entity_id: options.oscillate, oscillating: true });
      console.log(formatOutput({ success: true, action: "oscillate_on", entity_id: options.oscillate }, format));
      return;
    }

    if (options.noOscillate && options.entityId) {
      await client.callService("fan", "oscillate", { entity_id: options.entityId, oscillating: false });
      console.log(formatOutput({ success: true, action: "oscillate_off", entity_id: options.entityId }, format));
      return;
    }

    if (options.increaseSpeed) {
      await client.callService("fan", "increase_speed", { entity_id: options.increaseSpeed });
      console.log(formatOutput({ success: true, action: "increased_speed", entity_id: options.increaseSpeed }, format));
      return;
    }

    if (options.decreaseSpeed) {
      await client.callService("fan", "decrease_speed", { entity_id: options.decreaseSpeed });
      console.log(formatOutput({ success: true, action: "decreased_speed", entity_id: options.decreaseSpeed }, format));
      return;
    }

    // List fans
    const states = await client.getStates();
    let fans = states.filter(s => s.entity_id.startsWith("fan."));
    if (options.state) fans = fans.filter(f => f.state === options.state);

    const simplified = fans.map(f => ({
      entity_id: f.entity_id,
      state: f.state,
      percentage: f.attributes["percentage"],
      preset_mode: f.attributes["preset_mode"],
      oscillating: f.attributes["oscillating"],
      direction: f.attributes["direction"],
      friendly_name: f.attributes["friendly_name"],
    }));

    if (options.count) {
      console.log(formatOutput({ fans_count: simplified.length }, format));
      return;
    }

    console.log(formatOutput({ fans: simplified }, format));
  }));

  return command;
}
