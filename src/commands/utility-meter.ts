/**
 * Defines the utility meter command surface, options, help, and output behavior.
 */
import { Command } from "commander";
import { HomeAssistantClient } from "../api/client.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createUtilityMeterCommand(): Command {
  const command = new Command("utility-meter")
    .description("Manage Home Assistant utility meter helper entities (energy, water, gas tracking)")
    .option("-e, --entity-id <entityId>", "Target utility meter entity for reset or calibrate")
    .option("--reset <entityId>", "Reset a utility meter to zero")
    .option("--calibrate <entityId>", "Calibrate a utility meter to a specific value (use with --value)")
    .option("--value <number>", "New value for calibration (use with --calibrate)")
    .option("--count", "Only return count of utility meter entities")
    .option("-s, --state <state>", "Filter by state value");

  command.action(withExit(async (options: {
    entityId?: string;
    reset?: string;
    calibrate?: string;
    value?: string;
    count?: boolean;
    state?: string;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    if (options.reset) {
      await client.callService("utility_meter", "reset", { entity_id: options.reset });
      console.log(formatOutput({ success: true, action: "reset", entity_id: options.reset }, format));
      return;
    }

    if (options.calibrate) {
      if (options.value === undefined) {
        console.error("Error: --value is required when using --calibrate");
        process.exit(1);
        return;
      }
      const value = parseFloat(options.value);
      if (isNaN(value)) {
        console.error("Error: --value must be a number");
        process.exit(1);
        return;
      }
      await client.callService("utility_meter", "calibrate", { entity_id: options.calibrate, value });
      console.log(formatOutput({ success: true, action: "calibrated", entity_id: options.calibrate, value }, format));
      return;
    }

    // List utility_meter entities — HA exposes them as sensor.* with last_period + last_reset attrs
    const states = await client.getStates();
    const allMeters = states.filter(s =>
      s.entity_id.startsWith("sensor.") &&
      s.attributes["source"] !== undefined &&
      s.attributes["last_period"] !== undefined
    );

    let filtered = allMeters;
    if (options.state) filtered = filtered.filter(s => s.state === options.state);

    const simplified = filtered.map(s => ({
      entity_id: s.entity_id,
      state: s.state,
      unit_of_measurement: s.attributes["unit_of_measurement"] as string | undefined,
      friendly_name: s.attributes["friendly_name"] as string | undefined,
      meter_type: s.attributes["meter_type"] as string | undefined,
      source: s.attributes["source"] as string | undefined,
      last_period: s.attributes["last_period"] as string | undefined,
    }));

    if (options.count) {
      console.log(formatOutput({ utility_meters_count: simplified.length }, format));
      return;
    }

    console.log(formatOutput({ utility_meters: simplified }, format));
  }));

  return command;
}
