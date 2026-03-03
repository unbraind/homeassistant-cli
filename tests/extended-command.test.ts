import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createEnergyCommand, createWeatherCommand, createHealthCommand, createInfoCommand } from "../src/commands/extended.js";

const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

vi.mock("../src/config/loader.js", () => ({
  getConfig: vi.fn(() => ({
    url: "http://localhost:8123",
    token: "test-token",
    outputFormat: "json",
    timeout: 30000,
    readOnly: false,
  })),
}));

vi.mock("undici", () => ({
  request: vi.fn(),
}));

import { request } from "undici";

const mockRequest = request as ReturnType<typeof vi.fn>;

const mockResponse = (data: unknown, status = 200) => ({
  statusCode: status,
  body: {
    text: () => Promise.resolve(JSON.stringify(data)),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  },
});

function captureLog(fn: () => Promise<void>): Promise<string> {
  const output: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => output.push(msg);
  return fn().then(() => {
    console.log = originalLog;
    return output.join("\n");
  });
}

describe("energy command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns energy preferences", async () => {
    mockRequest.mockResolvedValueOnce(
      mockResponse({ energy_sources: [{ type: "grid" }], device_consumption: [] })
    );

    const cmd = createEnergyCommand();
    const result = await captureLog(() => cmd.parseAsync(["node", "test"], { from: "user" }));

    expect(result).toContain("energy_sources");
    expect(result).toContain("grid");
  });

  it("handles 404 when energy is not configured", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ message: "Not Found" }, 404));

    const cmd = createEnergyCommand();
    const result = await captureLog(() => cmd.parseAsync(["node", "test"], { from: "user" }));

    expect(result).toContain("Energy dashboard not configured");
  });
});

describe("weather command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists weather entities when no entity-id given", async () => {
    mockRequest.mockResolvedValueOnce(
      mockResponse([
        {
          entity_id: "weather.home",
          state: "sunny",
          attributes: { friendly_name: "Home", temperature: 22, humidity: 45 },
          last_changed: "2024-01-01T00:00:00Z",
          last_updated: "2024-01-01T00:00:00Z",
        },
        {
          entity_id: "light.kitchen",
          state: "on",
          attributes: {},
          last_changed: "2024-01-01T00:00:00Z",
          last_updated: "2024-01-01T00:00:00Z",
        },
      ])
    );

    const cmd = createWeatherCommand();
    const result = await captureLog(() => cmd.parseAsync(["--list"], { from: "user" }));

    expect(result).toContain("weather.home");
    expect(result).toContain("sunny");
    expect(result).not.toContain("light.kitchen");
  });

  it("lists weather entities with --count", async () => {
    mockRequest.mockResolvedValueOnce(
      mockResponse([
        {
          entity_id: "weather.home",
          state: "sunny",
          attributes: { friendly_name: "Home", temperature: 22, humidity: 45 },
          last_changed: "2024-01-01T00:00:00Z",
          last_updated: "2024-01-01T00:00:00Z",
        },
      ])
    );

    const cmd = createWeatherCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--list", "--count"], { from: "user" })
    );

    expect(result).toContain("weather_count");
    expect(result).toContain("1");
  });

  it("gets forecast for specific entity", async () => {
    mockRequest.mockResolvedValueOnce(
      mockResponse({
        context: { id: "ctx" },
        service_response: {
          "weather.home": {
            forecast: [
              { datetime: "2024-01-02", temperature: 18, condition: "cloudy" },
            ],
          },
        },
      })
    );

    const cmd = createWeatherCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["weather.home"], { from: "user" })
    );

    expect(result).toContain("weather.home");
    expect(result).toContain("forecasts");
  });

  it("throws on weather forecast error", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ message: "Not Found" }, 404));

    const cmd = createWeatherCommand();
    await expect(
      cmd.parseAsync(["weather.nonexistent"], { from: "user" })
    ).rejects.toThrow("Weather forecast failed");
  });
});

describe("health command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns system health", async () => {
    mockRequest.mockResolvedValueOnce(
      mockResponse({ homeassistant: { version: "2024.1.0", arch: "x86_64" } })
    );

    const cmd = createHealthCommand();
    const result = await captureLog(() => cmd.parseAsync(["node", "test"], { from: "user" }));

    expect(result).toContain("2024.1.0");
  });

  it("handles 404 when system_health not enabled", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ message: "Not Found" }, 404));

    const cmd = createHealthCommand();
    const result = await captureLog(() => cmd.parseAsync(["node", "test"], { from: "user" }));

    expect(result).toContain("System health endpoint not available");
  });
});

describe("info command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns comprehensive system info", async () => {
    mockRequest
      .mockResolvedValueOnce(mockResponse({ message: "API running." }))
      .mockResolvedValueOnce(
        mockResponse({
          version: "2024.1.0",
          location_name: "Home",
          time_zone: "UTC",
          country: "US",
          language: "en",
          state: "RUNNING",
          installation_type: "Home Assistant OS",
        })
      )
      .mockResolvedValueOnce(
        mockResponse([
          { entity_id: "light.kitchen", state: "on", attributes: {}, last_changed: "", last_updated: "" },
          { entity_id: "light.bedroom", state: "off", attributes: {}, last_changed: "", last_updated: "" },
          { entity_id: "sensor.temp", state: "unavailable", attributes: {}, last_changed: "", last_updated: "" },
        ])
      );

    const cmd = createInfoCommand();
    const result = await captureLog(() => cmd.parseAsync(["node", "test"], { from: "user" }));

    expect(result).toContain("2024.1.0");
    expect(result).toContain("Home");
    expect(result).toContain("RUNNING");
    expect(result).toContain("top_domains");
  });
});
