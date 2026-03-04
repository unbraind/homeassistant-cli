import { Command } from "commander";
import { HomeAssistantClient } from "../api/client.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createSwitchCommand(): Command {
  const command = new Command("switch")
    .description("Control Home Assistant switch entities")
    .option("--on <entityId>", "Turn on a switch")
    .option("--off <entityId>", "Turn off a switch")
    .option("--toggle <entityId>", "Toggle a switch")
    .option("--count", "Only return count of switch entities")
    .option("-s, --state <state>", "Filter listed switches by state (on, off, unavailable)");

  command.action(withExit(async (options: {
    on?: string;
    off?: string;
    toggle?: string;
    count?: boolean;
    state?: string;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    if (options.on) {
      await client.callService("switch", "turn_on", { entity_id: options.on });
      console.log(formatOutput({ success: true, action: "turned_on", entity_id: options.on }, format));
      return;
    }

    if (options.off) {
      await client.callService("switch", "turn_off", { entity_id: options.off });
      console.log(formatOutput({ success: true, action: "turned_off", entity_id: options.off }, format));
      return;
    }

    if (options.toggle) {
      await client.callService("switch", "toggle", { entity_id: options.toggle });
      console.log(formatOutput({ success: true, action: "toggled", entity_id: options.toggle }, format));
      return;
    }

    // List switches
    const states = await client.getStates();
    let switches = states.filter(s => s.entity_id.startsWith("switch."));
    if (options.state) switches = switches.filter(s => s.state === options.state);

    const simplified = switches.map(s => ({
      entity_id: s.entity_id,
      state: s.state,
      friendly_name: s.attributes["friendly_name"],
      device_class: s.attributes["device_class"],
    }));

    if (options.count) {
      console.log(formatOutput({ switches_count: simplified.length }, format));
      return;
    }

    console.log(formatOutput({ switches: simplified }, format));
  }));

  return command;
}
