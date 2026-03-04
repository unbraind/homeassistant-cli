import { Command } from "commander";
import { HomeAssistantClient } from "../api/client.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createSirenCommand(): Command {
  const command = new Command("siren")
    .description("Control Home Assistant siren entities")
    .option("--on <entityId>", "Turn on a siren")
    .option("--off <entityId>", "Turn off a siren")
    .option("--toggle <entityId>", "Toggle a siren")
    .option("-e, --entity-id <entityId>", "Target siren entity (use with --tone/--volume/--duration)")
    .option("--tone <tone>", "Set the siren tone (use with --on or --entity-id)")
    .option("--volume <0-1>", "Set the siren volume level 0.0-1.0 (use with --on or --entity-id)")
    .option("--duration <seconds>", "Duration in seconds (use with --on or --entity-id)")
    .option("--count", "Only return count of siren entities")
    .option("-s, --state <state>", "Filter by state (on, off, unavailable)");

  command.action(withExit(async (options: {
    on?: string;
    off?: string;
    toggle?: string;
    entityId?: string;
    tone?: string;
    volume?: string;
    duration?: string;
    count?: boolean;
    state?: string;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    if (options.on) {
      const payload: Record<string, unknown> = { entity_id: options.on };
      if (options.tone) payload["tone"] = options.tone;
      if (options.volume !== undefined) payload["volume_level"] = parseFloat(options.volume);
      if (options.duration !== undefined) payload["duration"] = parseInt(options.duration, 10);
      await client.callService("siren", "turn_on", payload);
      console.log(formatOutput({ success: true, action: "turned_on", entity_id: options.on }, format));
      return;
    }

    if (options.off) {
      await client.callService("siren", "turn_off", { entity_id: options.off });
      console.log(formatOutput({ success: true, action: "turned_off", entity_id: options.off }, format));
      return;
    }

    if (options.toggle) {
      await client.callService("siren", "toggle", { entity_id: options.toggle });
      console.log(formatOutput({ success: true, action: "toggled", entity_id: options.toggle }, format));
      return;
    }

    // List siren entities
    const states = await client.getStates();
    let sirens = states.filter(s => s.entity_id.startsWith("siren."));
    if (options.state) sirens = sirens.filter(s => s.state === options.state);

    const simplified = sirens.map(s => ({
      entity_id: s.entity_id,
      state: s.state,
      friendly_name: s.attributes["friendly_name"],
      available_tones: s.attributes["available_tones"],
      supported_features: s.attributes["supported_features"],
    }));

    if (options.count) {
      console.log(formatOutput({ sirens_count: simplified.length }, format));
      return;
    }

    console.log(formatOutput({ sirens: simplified }, format));
  }));

  return command;
}
