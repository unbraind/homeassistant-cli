import { Command } from "commander";
import { getConfig } from "../config/index.js";
import { ExtendedApiClient, HomeAssistantApiError } from "../api/index.js";
import { formatOutput } from "../formatters/index.js";
import type { OutputFormat } from "../types/index.js";

function getClient(options: { url?: string; token?: string; format?: OutputFormat; timeout?: number }) {
  const config = getConfig(options);
  return new ExtendedApiClient(config);
}

function getFormat(options: { format?: OutputFormat }): OutputFormat {
  const config = getConfig(options);
  return config.outputFormat;
}

export function createEnergyCommand(): Command {
  const command = new Command("energy")
    .description("Get Home Assistant energy dashboard preferences")
    .action(async (_options, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const client = getClient(globalOpts);
      const format = getFormat(globalOpts);

      try {
        const energy = await client.getEnergyPreferences();
        console.log(formatOutput(energy, format));
      } catch (error) {
        if (error instanceof HomeAssistantApiError && error.statusCode === 404) {
          console.log(formatOutput({
            message: "Energy dashboard not configured. Enable the energy integration in Home Assistant."
          }, format));
        } else {
          throw error;
        }
      }
    });

  return command;
}

export function createWeatherCommand(): Command {
  const command = new Command("weather")
    .description("Get weather forecasts from weather entities")
    .argument("[entity-id]", "Weather entity ID")
    .option("--type <type>", "Forecast type (daily, hourly, twice_daily)", "daily")
    .option("--list", "List all weather entities")
    .option("--count", "Only return count");

  command.action(async (entityId: string | undefined, options: {
    type?: "daily" | "hourly" | "twice_daily";
    list?: boolean;
    count?: boolean;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const client = getClient(globalOpts);
    const format = getFormat(globalOpts);

    if (options.list || !entityId) {
      const { HomeAssistantClient } = await import("../api/index.js");
      const baseClient = new HomeAssistantClient(getConfig(globalOpts));
      const states = await baseClient.getStates();
      const weatherEntities = states
        .filter(s => s.entity_id.startsWith("weather."))
        .map(s => ({
          entity_id: s.entity_id,
          state: s.state,
          friendly_name: s.attributes["friendly_name"] || s.entity_id,
          temperature: s.attributes["temperature"],
          humidity: s.attributes["humidity"],
        }));

      if (options.count) {
        console.log(formatOutput({ weather_count: weatherEntities.length }, format));
      } else {
        console.log(formatOutput({ weather_entities: weatherEntities }, format));
      }
      return;
    }

    try {
      const forecasts = await client.getWeatherForecasts(entityId, options.type || "daily");
      console.log(formatOutput({ entity_id: entityId, forecasts }, format));
    } catch (error) {
      if (error instanceof HomeAssistantApiError && error.statusCode === 404) {
        console.log(formatOutput({
          message: "Weather entity not found or weather integration not enabled."
        }, format));
      } else {
        throw error;
      }
    }
  });

  return command;
}

export function createHealthCommand(): Command {
  const command = new Command("health")
    .description("Get Home Assistant system health information")
    .action(async (_options, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const client = getClient(globalOpts);
      const format = getFormat(globalOpts);

      try {
        const health = await client.getSystemHealth();
        console.log(formatOutput(health, format));
      } catch (error) {
        if (error instanceof HomeAssistantApiError && error.statusCode === 404) {
          console.log(formatOutput({
            message: "System health endpoint not available. Ensure system_health integration is enabled."
          }, format));
        } else {
          throw error;
        }
      }
    });

  return command;
}

export function createInfoCommand(): Command {
  const command = new Command("info")
    .description("Get comprehensive system information summary")
    .action(async (_options, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const format = getFormat(globalOpts);

      const { HomeAssistantClient } = await import("../api/index.js");
      const baseClient = new HomeAssistantClient(getConfig(globalOpts));

      const [status, config, states] = await Promise.all([
        baseClient.getStatus(),
        baseClient.getConfig(),
        baseClient.getStates(),
      ]);

      const domains = states.reduce((acc: Record<string, number>, s) => {
        const domain = s.entity_id.split(".")[0] || "unknown";
        acc[domain] = (acc[domain] || 0) + 1;
        return acc;
      }, {});

      const unavailable = states.filter(s => s.state === "unavailable").length;

      const info = {
        status: status.message,
        version: config.version,
        location_name: config.location_name,
        time_zone: config.time_zone,
        country: config.country,
        language: config.language,
        state: config.state,
        installation_type: config.installation_type,
        entities: {
          total: states.length,
          domains: Object.keys(domains).length,
          unavailable,
        },
        top_domains: Object.entries(domains)
          .sort(([, a], [, b]) => (b as number) - (a as number))
          .slice(0, 5)
          .map(([name, count]) => ({ name, count })),
      };

      console.log(formatOutput(info, format));
    });

  return command;
}
