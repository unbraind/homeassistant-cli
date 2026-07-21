/**
 * Defines the device tracker command surface, options, help, and output behavior.
 */
import { Command } from "commander";
import { HomeAssistantClient } from "../api/client.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createDeviceTrackerCommand(): Command {
  const command = new Command("device-tracker")
    .description("Browse Home Assistant device_tracker entities (phones, tags, presence)")
    .option("-s, --state <state>", "Filter by state: home, not_home, unknown, or zone name")
    .option("--source <type>", "Filter by source type (gps, router, bluetooth, manual)")
    .option("--home", "Only show devices currently home")
    .option("--away", "Only show devices not home or unknown")
    .option("--count", "Only return count of matching device trackers");

  command.action(withExit(async (options: {
    state?: string;
    source?: string;
    home?: boolean;
    away?: boolean;
    count?: boolean;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    const states = await client.getStates();
    let trackers = states.filter(s => s.entity_id.startsWith("device_tracker."));

    if (options.state) {
      trackers = trackers.filter(s => s.state === options.state);
    } else if (options.home) {
      trackers = trackers.filter(s => s.state === "home");
    } else if (options.away) {
      trackers = trackers.filter(s => s.state !== "home");
    }

    if (options.source) {
      trackers = trackers.filter(s => s.attributes["source_type"] === options.source);
    }

    const simplified = trackers.map(s => ({
      entity_id: s.entity_id,
      state: s.state,
      friendly_name: s.attributes["friendly_name"],
      source_type: s.attributes["source_type"],
      latitude: s.attributes["latitude"],
      longitude: s.attributes["longitude"],
      gps_accuracy: s.attributes["gps_accuracy"],
    }));

    if (options.count) {
      console.log(formatOutput({ device_trackers_count: simplified.length }, format));
      return;
    }

    console.log(formatOutput({ device_trackers: simplified }, format));
  }));

  return command;
}
