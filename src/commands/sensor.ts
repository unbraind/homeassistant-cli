import { Command } from "commander";
import { HomeAssistantClient } from "../api/client.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createSensorCommand(): Command {
  const command = new Command("sensor")
    .description("Browse Home Assistant sensor entities (read-only)")
    .option("--class <deviceClass>", "Filter by device class (e.g. temperature, humidity, power, energy)")
    .option("--unit <unit>", "Filter by unit of measurement (e.g. °C, W, kWh, %)")
    .option("-s, --state <state>", "Filter by exact state value (e.g. unavailable)")
    .option("--above <value>", "Filter sensors with numeric state above this value")
    .option("--below <value>", "Filter sensors with numeric state below this value")
    .option("--count", "Only return count of matching sensor entities");

  command.action(withExit(async (options: {
    class?: string;
    unit?: string;
    state?: string;
    above?: string;
    below?: string;
    count?: boolean;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    const states = await client.getStates();
    let sensors = states.filter(s => s.entity_id.startsWith("sensor."));

    if (options.class) {
      sensors = sensors.filter(s => s.attributes["device_class"] === options.class);
    }

    if (options.unit) {
      sensors = sensors.filter(s => s.attributes["unit_of_measurement"] === options.unit);
    }

    if (options.state) {
      sensors = sensors.filter(s => s.state === options.state);
    }

    if (options.above !== undefined) {
      const threshold = parseFloat(options.above);
      sensors = sensors.filter(s => {
        const val = parseFloat(s.state);
        return !isNaN(val) && val > threshold;
      });
    }

    if (options.below !== undefined) {
      const threshold = parseFloat(options.below);
      sensors = sensors.filter(s => {
        const val = parseFloat(s.state);
        return !isNaN(val) && val < threshold;
      });
    }

    const simplified = sensors.map(s => ({
      entity_id: s.entity_id,
      state: s.state,
      friendly_name: s.attributes["friendly_name"],
      unit_of_measurement: s.attributes["unit_of_measurement"],
      device_class: s.attributes["device_class"],
      state_class: s.attributes["state_class"],
    }));

    if (options.count) {
      console.log(formatOutput({ sensors_count: simplified.length }, format));
      return;
    }

    console.log(formatOutput({ sensors: simplified }, format));
  }));

  return command;
}

export function createBinarySensorCommand(): Command {
  const command = new Command("binary-sensor")
    .description("Browse Home Assistant binary_sensor entities (read-only)")
    .option("--class <deviceClass>", "Filter by device class (e.g. motion, door, window, presence, connectivity)")
    .option("-s, --state <state>", "Filter by state: on or off")
    .option("--count", "Only return count of matching binary sensor entities");

  command.action(withExit(async (options: {
    class?: string;
    state?: string;
    count?: boolean;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new HomeAssistantClient(config);

    const states = await client.getStates();
    let sensors = states.filter(s => s.entity_id.startsWith("binary_sensor."));

    if (options.class) {
      sensors = sensors.filter(s => s.attributes["device_class"] === options.class);
    }

    if (options.state) {
      sensors = sensors.filter(s => s.state === options.state);
    }

    const simplified = sensors.map(s => ({
      entity_id: s.entity_id,
      state: s.state,
      friendly_name: s.attributes["friendly_name"],
      device_class: s.attributes["device_class"],
    }));

    if (options.count) {
      console.log(formatOutput({ binary_sensors_count: simplified.length }, format));
      return;
    }

    console.log(formatOutput({ binary_sensors: simplified }, format));
  }));

  return command;
}
