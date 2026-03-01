import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { ExtendedApiClient } from "../src/api/extended.js";
import type { Config } from "../src/types/options.js";

const mockConfig: Config = {
  url: "http://test.local:8123",
  token: "test-token",
  outputFormat: "toon",
  timeout: 30000,
      readOnly: false,
};

describe("ExtendedApiClient", () => {
  let client: ExtendedApiClient;
  let mockRequest: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    client = new ExtendedApiClient(mockConfig);
    mockRequest = vi.spyOn(client as unknown as { request: unknown }, "request");
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("getEnergyPreferences", () => {
    it("should call GET /energy endpoint", async () => {
      const mockResponse = {
        energy_default_device_capacity: null,
        device_consumption: [],
        device_consumption_from_grid: [],
        device_production_to_grid: [],
      };
      mockRequest.mockResolvedValue(mockResponse);

      const result = await client.getEnergyPreferences();

      expect(mockRequest).toHaveBeenCalledWith("GET", "/energy");
      expect(result).toEqual(mockResponse);
    });
  });

  describe("getSystemHealth", () => {
    it("should call GET /system_health endpoint", async () => {
      const mockResponse = {
        homeassistant: {
          agent_os: false,
          healthcheck_failed: false,
          install_type: "venv",
          autologin: false,
          virtualenv: true,
          python_version: "3.11.0",
          dev: false,
          docker: false,
          version: "2024.1.0",
          timezone: "UTC",
          run_in_container: false,
          core_sdk: false,
          integration_type: "homeassistant",
        },
      };
      mockRequest.mockResolvedValue(mockResponse);

      const result = await client.getSystemHealth();

      expect(mockRequest).toHaveBeenCalledWith("GET", "/system_health");
      expect(result).toEqual(mockResponse);
    });
  });

  describe("getWeatherForecasts", () => {
    it("should call weather.get_forecasts service with return_response", async () => {
      const mockForecasts = [
        {
          condition: "sunny",
          datetime: "2024-01-01T12:00:00Z",
          temperature: 20,
          humidity: 50,
        },
        {
          condition: "cloudy",
          datetime: "2024-01-02T12:00:00Z",
          temperature: 18,
          humidity: 60,
        },
      ];
      const mockResponse = {
        changed_states: [],
        service_response: {
          "weather.test": {
            forecast: mockForecasts,
          },
        },
      };
      mockRequest.mockResolvedValue(mockResponse);

      const result = await client.getWeatherForecasts("weather.test", "daily");

      expect(mockRequest).toHaveBeenCalledWith(
        "POST",
        "/services/weather/get_forecasts?return_response",
        { entity_id: "weather.test", type: "daily" }
      );
      expect(result).toEqual(mockForecasts);
    });

    it("should return empty array if forecast is not an array", async () => {
      const mockResponse = {
        changed_states: [],
        service_response: {
          "weather.test": {
            forecast: null,
          },
        },
      };
      mockRequest.mockResolvedValue(mockResponse);

      const result = await client.getWeatherForecasts("weather.test", "daily");

      expect(result).toEqual([]);
    });

    it("should return empty array if service_response is missing", async () => {
      const mockResponse = {
        changed_states: [],
      };
      mockRequest.mockResolvedValue(mockResponse);

      const result = await client.getWeatherForecasts("weather.test", "daily");

      expect(result).toEqual([]);
    });

    it("should support hourly forecast type", async () => {
      const mockResponse = {
        changed_states: [],
        service_response: {
          "weather.test": {
            forecast: [],
          },
        },
      };
      mockRequest.mockResolvedValue(mockResponse);

      await client.getWeatherForecasts("weather.test", "hourly");

      expect(mockRequest).toHaveBeenCalledWith(
        "POST",
        "/services/weather/get_forecasts?return_response",
        { entity_id: "weather.test", type: "hourly" }
      );
    });

    it("should support twice_daily forecast type", async () => {
      const mockResponse = {
        changed_states: [],
        service_response: {
          "weather.test": {
            forecast: [],
          },
        },
      };
      mockRequest.mockResolvedValue(mockResponse);

      await client.getWeatherForecasts("weather.test", "twice_daily");

      expect(mockRequest).toHaveBeenCalledWith(
        "POST",
        "/services/weather/get_forecasts?return_response",
        { entity_id: "weather.test", type: "twice_daily" }
      );
    });
  });
});
