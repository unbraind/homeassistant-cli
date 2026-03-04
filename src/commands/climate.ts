import { Command } from "commander";
import { HomeAssistantClient } from "../api/client.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createClimateCommand(): Command {
  const command = new Command("climate")
    .description("Control Home Assistant climate entities (thermostats, AC units)")
    .option("--on <entityId>", "Turn on a climate device")
    .option("--off <entityId>", "Turn off a climate device")
    .option("--toggle <entityId>", "Toggle a climate device")
    .option("-e, --entity-id <entityId>", "Target climate entity for set operations")
    .option("--set-temp <temp>", "Set target temperature (°C/°F per HA config, use with --entity-id)")
    .option("--set-mode <mode>", "Set HVAC mode (heat, cool, auto, dry, fan_only, heat_cool, off)")
    .option("--set-preset <preset>", "Set preset mode (e.g. eco, away, boost, comfort, home, sleep, activity)")
    .option("--set-humidity <0-100>", "Set target humidity percentage")
    .option("--set-fan <mode>", "Set fan mode (e.g. auto, low, medium, high)")
    .option("--set-swing <mode>", "Set swing mode (e.g. off, both, vertical, horizontal)")
    .option("--count", "Only return count of climate entities")
    .option("-s, --state <state>", "Filter by state/HVAC mode");

  command.action(withExit(async (options: {
    on?: string;
    off?: string;
    toggle?: string;
    entityId?: string;
    setTemp?: string;
    setMode?: string;
    setPreset?: string;
    setHumidity?: string;
    setFan?: string;
    setSwing?: string;
    count?: boolean;
    state?: string;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    if (options.on) {
      await client.callService("climate", "turn_on", { entity_id: options.on });
      console.log(formatOutput({ success: true, action: "turned_on", entity_id: options.on }, format));
      return;
    }

    if (options.off) {
      await client.callService("climate", "turn_off", { entity_id: options.off });
      console.log(formatOutput({ success: true, action: "turned_off", entity_id: options.off }, format));
      return;
    }

    if (options.toggle) {
      await client.callService("climate", "toggle", { entity_id: options.toggle });
      console.log(formatOutput({ success: true, action: "toggled", entity_id: options.toggle }, format));
      return;
    }

    if (options.entityId && options.setTemp) {
      await client.callService("climate", "set_temperature", {
        entity_id: options.entityId,
        temperature: parseFloat(options.setTemp),
      });
      console.log(formatOutput({ success: true, action: "set_temperature", entity_id: options.entityId, temperature: parseFloat(options.setTemp) }, format));
      return;
    }

    if (options.entityId && options.setMode) {
      await client.callService("climate", "set_hvac_mode", {
        entity_id: options.entityId,
        hvac_mode: options.setMode,
      });
      console.log(formatOutput({ success: true, action: "set_hvac_mode", entity_id: options.entityId, hvac_mode: options.setMode }, format));
      return;
    }

    if (options.entityId && options.setPreset) {
      await client.callService("climate", "set_preset_mode", {
        entity_id: options.entityId,
        preset_mode: options.setPreset,
      });
      console.log(formatOutput({ success: true, action: "set_preset_mode", entity_id: options.entityId, preset_mode: options.setPreset }, format));
      return;
    }

    if (options.entityId && options.setHumidity) {
      await client.callService("climate", "set_humidity", {
        entity_id: options.entityId,
        humidity: parseInt(options.setHumidity, 10),
      });
      console.log(formatOutput({ success: true, action: "set_humidity", entity_id: options.entityId, humidity: parseInt(options.setHumidity, 10) }, format));
      return;
    }

    if (options.entityId && options.setFan) {
      await client.callService("climate", "set_fan_mode", {
        entity_id: options.entityId,
        fan_mode: options.setFan,
      });
      console.log(formatOutput({ success: true, action: "set_fan_mode", entity_id: options.entityId, fan_mode: options.setFan }, format));
      return;
    }

    if (options.entityId && options.setSwing) {
      await client.callService("climate", "set_swing_mode", {
        entity_id: options.entityId,
        swing_mode: options.setSwing,
      });
      console.log(formatOutput({ success: true, action: "set_swing_mode", entity_id: options.entityId, swing_mode: options.setSwing }, format));
      return;
    }

    // List climate entities
    const states = await client.getStates();
    let climates = states.filter(s => s.entity_id.startsWith("climate."));
    if (options.state) climates = climates.filter(c => c.state === options.state);

    const simplified = climates.map(c => ({
      entity_id: c.entity_id,
      state: c.state,
      current_temperature: c.attributes["current_temperature"],
      target_temperature: c.attributes["temperature"],
      hvac_modes: c.attributes["hvac_modes"],
      preset_mode: c.attributes["preset_mode"],
      fan_mode: c.attributes["fan_mode"],
      friendly_name: c.attributes["friendly_name"],
    }));

    if (options.count) {
      console.log(formatOutput({ climate_count: simplified.length }, format));
      return;
    }

    console.log(formatOutput({ climate: simplified }, format));
  }));

  return command;
}
