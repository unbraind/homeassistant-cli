/**
 * Defines the water heater command surface, options, help, and output behavior.
 */
import { Command } from "commander";
import { HomeAssistantClient } from "../api/client.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createWaterHeaterCommand(): Command {
  const command = new Command("water-heater")
    .description("Control Home Assistant water heater entities")
    .option("--on <entityId>", "Turn on a water heater")
    .option("--off <entityId>", "Turn off a water heater")
    .option("-e, --entity-id <entityId>", "Target water heater entity")
    .option("--temperature <value>", "Set target temperature (use with --entity-id)")
    .option("--operation-mode <mode>", "Set operation mode (use with --entity-id)")
    .option("--away-mode <on|off>", "Set away mode on or off (use with --entity-id)")
    .option("--count", "Only return count of water heater entities")
    .option("-s, --state <state>", "Filter by state (on, off, eco, heat_pump, high_demand, electric, gas, performance)");

  command.action(withExit(async (options: {
    on?: string;
    off?: string;
    entityId?: string;
    temperature?: string;
    operationMode?: string;
    awayMode?: string;
    count?: boolean;
    state?: string;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    if (options.on) {
      await client.callService("water_heater", "turn_on", { entity_id: options.on });
      console.log(formatOutput({ success: true, action: "turned_on", entity_id: options.on }, format));
      return;
    }

    if (options.off) {
      await client.callService("water_heater", "turn_off", { entity_id: options.off });
      console.log(formatOutput({ success: true, action: "turned_off", entity_id: options.off }, format));
      return;
    }

    if (options.entityId && options.temperature !== undefined) {
      const temp = parseFloat(options.temperature);
      if (isNaN(temp)) {
        console.error("Error: --temperature must be a number");
        process.exit(1);
        return;
      }
      await client.callService("water_heater", "set_temperature", {
        entity_id: options.entityId,
        temperature: temp,
      });
      console.log(formatOutput({ success: true, action: "set_temperature", entity_id: options.entityId, temperature: temp }, format));
      return;
    }

    if (options.entityId && options.operationMode !== undefined) {
      await client.callService("water_heater", "set_operation_mode", {
        entity_id: options.entityId,
        operation_mode: options.operationMode,
      });
      console.log(formatOutput({ success: true, action: "set_operation_mode", entity_id: options.entityId, operation_mode: options.operationMode }, format));
      return;
    }

    if (options.entityId && options.awayMode !== undefined) {
      const awayOn = options.awayMode.toLowerCase() === "on";
      await client.callService("water_heater", "set_away_mode", {
        entity_id: options.entityId,
        away_mode: awayOn,
      });
      console.log(formatOutput({ success: true, action: "set_away_mode", entity_id: options.entityId, away_mode: awayOn }, format));
      return;
    }

    // List water heater entities
    const states = await client.getStates();
    let heaters = states.filter(s => s.entity_id.startsWith("water_heater."));
    if (options.state) heaters = heaters.filter(h => h.state === options.state);

    const simplified = heaters.map(h => ({
      entity_id: h.entity_id,
      state: h.state,
      current_temperature: h.attributes["current_temperature"],
      target_temp_high: h.attributes["target_temp_high"],
      target_temp_low: h.attributes["target_temp_low"],
      min_temp: h.attributes["min_temp"],
      max_temp: h.attributes["max_temp"],
      operation_mode: h.attributes["operation_mode"],
      operation_list: h.attributes["operation_list"],
      away_mode: h.attributes["away_mode"],
      friendly_name: h.attributes["friendly_name"],
    }));

    if (options.count) {
      console.log(formatOutput({ water_heaters_count: simplified.length }, format));
      return;
    }

    console.log(formatOutput({ water_heaters: simplified }, format));
  }));

  return command;
}
