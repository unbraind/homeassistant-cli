import { Command } from "commander";
import { ExtendedApiClient, HomeAssistantApiError } from "../api/index.js";
import { formatOutput } from "../formatters/index.js";
import { withExit } from "../utils/exit.js";
import { resolveCommandOptions } from "../utils/command-helpers.js";

export function createEnergyCommand(): Command {
  const command = new Command("energy")
    .description("Get Home Assistant energy dashboard preferences")
    .action(withExit(async (_options, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const { config, format } = resolveCommandOptions(globalOpts);
      const client = new ExtendedApiClient(config);

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
    }));

  return command;
}

export function createWeatherCommand(): Command {
  const command = new Command("weather")
    .description("Get weather forecasts from weather entities")
    .argument("[entity-id]", "Weather entity ID")
    .option("--type <type>", "Forecast type (daily, hourly, twice_daily)", "daily")
    .option("--list", "List all weather entities")
    .option("--count", "Only return count");

  command.action(withExit(async (entityId: string | undefined, options: {
    type?: "daily" | "hourly" | "twice_daily";
    list?: boolean;
    count?: boolean;
  }, cmd) => {
    const globalOpts = cmd.optsWithGlobals();
    const { config, format } = resolveCommandOptions(globalOpts);
    const client = new ExtendedApiClient(config);

    if (options.list || !entityId) {
      const { HomeAssistantClient } = await import("../api/index.js");
      const baseClient = new HomeAssistantClient(config);
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
  }));

  return command;
}

export function createHealthCommand(): Command {
  const command = new Command("health")
    .description("Get Home Assistant system health information")
    .action(withExit(async (_options, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const { config, format } = resolveCommandOptions(globalOpts);
      const client = new ExtendedApiClient(config);

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
    }));

  return command;
}

export function createInfoCommand(): Command {
  const command = new Command("info")
    .description("Get comprehensive system information summary")
    .action(withExit(async (_options, cmd) => {
      const globalOpts = cmd.optsWithGlobals();
      const { config, format } = resolveCommandOptions(globalOpts);

      const { HomeAssistantClient } = await import("../api/index.js");
      const baseClient = new HomeAssistantClient(config);

      const [status, haConfig, states] = await Promise.all([
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
        version: haConfig.version,
        location_name: haConfig.location_name,
        time_zone: haConfig.time_zone,
        country: haConfig.country,
        language: haConfig.language,
        state: haConfig.state,
        installation_type: haConfig.installation_type,
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
    }));

  return command;
}
