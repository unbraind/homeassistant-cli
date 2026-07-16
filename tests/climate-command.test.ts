import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createClimateCommand } from "../src/commands/climate.js";

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

const climateStates = [
  {
    entity_id: "climate.living_room",
    state: "heat",
    attributes: {
      current_temperature: 20.5,
      temperature: 22.0,
      hvac_modes: ["heat", "cool", "auto", "off"],
      preset_mode: "home",
      fan_mode: "auto",
      friendly_name: "Living Room Thermostat",
    },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "climate.bedroom",
    state: "off",
    attributes: {
      current_temperature: 18.0,
      temperature: null,
      hvac_modes: ["heat", "cool", "off"],
      preset_mode: "away",
      fan_mode: null,
      friendly_name: "Bedroom Thermostat",
    },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "sensor.temperature",
    state: "21.5",
    attributes: {},
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
];

function captureLog(fn: () => Promise<void>): Promise<string> {
  const output: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => output.push(msg);
  return fn().then(() => {
    console.log = originalLog;
    return output.join("\n");
  }).catch((err) => {
    console.log = originalLog;
    throw err;
  });
}

describe("climate command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists all climate entities", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(climateStates));

    const cmd = createClimateCommand();
    const result = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );

    expect(result).toContain("climate.living_room");
    expect(result).toContain("climate.bedroom");
    expect(result).not.toContain("sensor.temperature");
  });

  it("returns climate count with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(climateStates));

    const cmd = createClimateCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--count"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed.climate_count).toBe(2);
  });

  it("filters climate entities by state", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(climateStates));

    const cmd = createClimateCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--state", "heat"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed.climate).toHaveLength(1);
    expect(parsed.climate[0].entity_id).toBe("climate.living_room");
  });

  it("turns on a climate device", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createClimateCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--on", "climate.living_room"], { from: "user" })
    );

    expect(result).toContain("turned_on");
    expect(result).toContain("climate.living_room");
  });

  it("turns off a climate device", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createClimateCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--off", "climate.bedroom"], { from: "user" })
    );

    expect(result).toContain("turned_off");
  });

  it("toggles a climate device", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createClimateCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--toggle", "climate.living_room"], { from: "user" })
    );

    expect(result).toContain("toggled");
  });

  it("sets temperature", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createClimateCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entity-id", "climate.living_room", "--set-temp", "23.5"], { from: "user" })
    );

    expect(result).toContain("set_temperature");
    expect(result).toContain("23.5");

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.temperature).toBe(23.5);
    expect(body.entity_id).toBe("climate.living_room");
  });

  it("sets HVAC mode", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createClimateCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entity-id", "climate.living_room", "--set-mode", "cool"], { from: "user" })
    );

    expect(result).toContain("set_hvac_mode");
    expect(result).toContain("cool");

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.hvac_mode).toBe("cool");
  });

  it("sets preset mode", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createClimateCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entity-id", "climate.bedroom", "--set-preset", "eco"], { from: "user" })
    );

    expect(result).toContain("set_preset_mode");
    expect(result).toContain("eco");
  });

  it("sets humidity", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createClimateCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entity-id", "climate.living_room", "--set-humidity", "50"], { from: "user" })
    );

    expect(result).toContain("set_humidity");

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.humidity).toBe(50);
  });

  it("sets fan mode", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createClimateCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entity-id", "climate.living_room", "--set-fan", "high"], { from: "user" })
    );

    expect(result).toContain("set_fan_mode");
    expect(result).toContain("high");
  });

  it("sets swing mode", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createClimateCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entity-id", "climate.bedroom", "--set-swing", "vertical"], { from: "user" })
    );

    expect(result).toContain("set_swing_mode");
    expect(result).toContain("vertical");
  });
});
