import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createWaterHeaterCommand } from "../src/commands/water-heater.js";

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

const waterHeaterStates = [
  {
    entity_id: "water_heater.boiler",
    state: "eco",
    attributes: {
      friendly_name: "Hot Water Boiler",
      current_temperature: 45,
      target_temp_high: 60,
      target_temp_low: 40,
      min_temp: 35,
      max_temp: 70,
      operation_mode: "eco",
      operation_list: ["off", "eco", "heat_pump", "high_demand", "electric"],
      away_mode: false,
    },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "water_heater.solar_tank",
    state: "heat_pump",
    attributes: {
      friendly_name: "Solar Tank",
      current_temperature: 55,
      min_temp: 40,
      max_temp: 65,
      operation_mode: "heat_pump",
      operation_list: ["eco", "heat_pump", "electric"],
      away_mode: false,
    },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "switch.unrelated",
    state: "on",
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

describe("water-heater command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists all water heater entities", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(waterHeaterStates));
    const cmd = createWaterHeaterCommand();
    const result = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );
    expect(result).toContain("water_heater.boiler");
    expect(result).toContain("water_heater.solar_tank");
    expect(result).not.toContain("switch.unrelated");
  });

  it("returns count with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(waterHeaterStates));
    const cmd = createWaterHeaterCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--count"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.water_heaters_count).toBe(2);
  });

  it("filters by state", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(waterHeaterStates));
    const cmd = createWaterHeaterCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--state", "eco"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.water_heaters).toHaveLength(1);
    expect(parsed.water_heaters[0].entity_id).toBe("water_heater.boiler");
  });

  it("turns on a water heater with --on", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createWaterHeaterCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--on", "water_heater.boiler"], { from: "user" })
    );
    expect(result).toContain("turned_on");
    expect(result).toContain("water_heater.boiler");
    const callOpts = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOpts?.body ?? "{}");
    expect(body.entity_id).toBe("water_heater.boiler");
  });

  it("turns off a water heater with --off", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createWaterHeaterCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--off", "water_heater.solar_tank"], { from: "user" })
    );
    expect(result).toContain("turned_off");
    expect(result).toContain("water_heater.solar_tank");
  });

  it("sets temperature with --entity-id and --temperature", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createWaterHeaterCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entity-id", "water_heater.boiler", "--temperature", "55"], { from: "user" })
    );
    expect(result).toContain("set_temperature");
    const callOpts = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOpts?.body ?? "{}");
    expect(body.temperature).toBe(55);
    expect(body.entity_id).toBe("water_heater.boiler");
  });

  it("errors on invalid temperature", async () => {
    const cmd = createWaterHeaterCommand();
    await captureLog(() =>
      cmd.parseAsync(["--entity-id", "water_heater.boiler", "--temperature", "not-a-number"], { from: "user" })
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("sets operation mode with --entity-id and --operation-mode", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createWaterHeaterCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entity-id", "water_heater.boiler", "--operation-mode", "heat_pump"], { from: "user" })
    );
    expect(result).toContain("set_operation_mode");
    const callOpts = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOpts?.body ?? "{}");
    expect(body.operation_mode).toBe("heat_pump");
  });

  it("sets away mode on with --entity-id and --away-mode on", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createWaterHeaterCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entity-id", "water_heater.boiler", "--away-mode", "on"], { from: "user" })
    );
    expect(result).toContain("set_away_mode");
    const callOpts = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOpts?.body ?? "{}");
    expect(body.away_mode).toBe(true);
  });

  it("sets away mode off with --entity-id and --away-mode off", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createWaterHeaterCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entity-id", "water_heater.boiler", "--away-mode", "off"], { from: "user" })
    );
    expect(result).toContain("set_away_mode");
    const callOpts = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOpts?.body ?? "{}");
    expect(body.away_mode).toBe(false);
  });
});
