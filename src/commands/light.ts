import { Command } from "commander";
import { HomeAssistantClient } from "../api/client.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createLightCommand(): Command {
  const command = new Command("light")
    .description("Control Home Assistant light entities")
    .option("-e, --entity-id <entityId>", "Target light entity (e.g. light.living_room)")
    .option("--on <entityId>", "Turn on a light")
    .option("--off <entityId>", "Turn off a light")
    .option("--toggle <entityId>", "Toggle a light")
    .option("--brightness <0-255>", "Brightness level (0-255, use with --on or --entity-id)")
    .option("--brightness-pct <0-100>", "Brightness percentage (0-100)")
    .option("--color-temp <mireds>", "Color temperature in mireds")
    .option("--kelvin <k>", "Color temperature in Kelvin")
    .option("--rgb <r,g,b>", "RGB color (e.g. 255,100,0)")
    .option("--hs <h,s>", "Hue/Saturation color (e.g. 30,100)")
    .option("--color-name <name>", "Named color (e.g. red, blue, warm_white)")
    .option("--effect <name>", "Light effect (e.g. colorloop, random)")
    .option("--transition <seconds>", "Transition duration in seconds")
    .option("--flash <short|long>", "Flash the light (short or long)")
    .option("--count", "Only return count of light entities")
    .option("-s, --state <state>", "Filter by state (on, off, unavailable)");

  command.action(withExit(async (options: {
    entityId?: string;
    on?: string;
    off?: string;
    toggle?: string;
    brightness?: string;
    brightnessPct?: string;
    colorTemp?: string;
    kelvin?: string;
    rgb?: string;
    hs?: string;
    colorName?: string;
    effect?: string;
    transition?: string;
    flash?: string;
    count?: boolean;
    state?: string;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    const buildTurnOnData = (entityId: string): Record<string, unknown> => {
      const data: Record<string, unknown> = { entity_id: entityId };
      if (options.brightness) data["brightness"] = parseInt(options.brightness, 10);
      if (options.brightnessPct) data["brightness_pct"] = parseInt(options.brightnessPct, 10);
      if (options.colorTemp) data["color_temp"] = parseInt(options.colorTemp, 10);
      if (options.kelvin) data["kelvin"] = parseInt(options.kelvin, 10);
      if (options.colorName) data["color_name"] = options.colorName;
      if (options.effect) data["effect"] = options.effect;
      if (options.transition) data["transition"] = parseFloat(options.transition);
      if (options.flash) data["flash"] = options.flash;
      if (options.rgb) {
        const parts = options.rgb.split(",").map(Number);
        data["rgb_color"] = parts;
      }
      if (options.hs) {
        const parts = options.hs.split(",").map(Number);
        data["hs_color"] = parts;
      }
      return data;
    };

    if (options.on) {
      const data = buildTurnOnData(options.on);
      await client.callService("light", "turn_on", data);
      console.log(formatOutput({ success: true, action: "turned_on", entity_id: options.on }, format));
      return;
    }

    if (options.off) {
      const data: Record<string, unknown> = { entity_id: options.off };
      if (options.transition) data["transition"] = parseFloat(options.transition);
      await client.callService("light", "turn_off", data);
      console.log(formatOutput({ success: true, action: "turned_off", entity_id: options.off }, format));
      return;
    }

    if (options.toggle) {
      await client.callService("light", "toggle", { entity_id: options.toggle });
      console.log(formatOutput({ success: true, action: "toggled", entity_id: options.toggle }, format));
      return;
    }

    // --entity-id with modifiers acts as turn_on with options
    if (options.entityId) {
      const data = buildTurnOnData(options.entityId);
      await client.callService("light", "turn_on", data);
      console.log(formatOutput({ success: true, action: "turned_on", entity_id: options.entityId }, format));
      return;
    }

    // List lights
    const states = await client.getStates();
    let lights = states.filter(s => s.entity_id.startsWith("light."));
    if (options.state) lights = lights.filter(l => l.state === options.state);

    const simplified = lights.map(l => ({
      entity_id: l.entity_id,
      state: l.state,
      brightness: l.attributes["brightness"],
      color_temp_kelvin: l.attributes["color_temp_kelvin"],
      rgb_color: l.attributes["rgb_color"],
      effect: l.attributes["effect"],
      friendly_name: l.attributes["friendly_name"],
    }));

    if (options.count) {
      console.log(formatOutput({ lights_count: simplified.length }, format));
      return;
    }

    console.log(formatOutput({ lights: simplified }, format));
  }));

  return command;
}
