/**
 * Implements typed Home Assistant extended API transport operations.
 */
import type { Config } from "../types/options.js";
import type {
  HaEnergyPreferences,
  HaWeatherForecast,
  HaSystemHealth,
} from "../types/api.js";
import { HomeAssistantClient, HomeAssistantApiError } from "./client.js";

export class ExtendedApiClient extends HomeAssistantClient {
  constructor(config: Config) {
    super(config);
  }

  async getEnergyPreferences(): Promise<HaEnergyPreferences> {
    return this.request<HaEnergyPreferences>("GET", "/energy");
  }

  async getSystemHealth(): Promise<HaSystemHealth> {
    return this.request<HaSystemHealth>("GET", "/system_health");
  }

  async getWeatherForecasts(
    entityId: string,
    forecastType: "daily" | "hourly" | "twice_daily" = "daily"
  ): Promise<HaWeatherForecast[]> {
    try {
      const result = await this.callService(
        "weather",
        "get_forecasts",
        { entity_id: entityId, type: forecastType },
        true
      );
      const response = result as unknown as { service_response?: Record<string, { forecast?: HaWeatherForecast[] }> };
      const forecast = response.service_response?.[entityId]?.forecast;
      return Array.isArray(forecast) ? forecast : [];
    } catch (error) {
      if (error instanceof HomeAssistantApiError) {
        throw new HomeAssistantApiError(
          `Weather forecast failed: ${error.message}`,
          error.statusCode,
          error.body,
          error.envelope.endpoint,
        );
      }
      throw error;
    }
  }
}
