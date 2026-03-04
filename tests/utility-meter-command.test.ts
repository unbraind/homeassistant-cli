import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createUtilityMeterCommand } from "../src/commands/utility-meter.js";

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

vi.mock("undici", () => ({ request: vi.fn() }));

import { request } from "undici";
const mockRequest = request as ReturnType<typeof vi.fn>;

const mockResponse = (data: unknown, status = 200) => ({
  statusCode: status,
  body: { text: () => Promise.resolve(JSON.stringify(data)) },
});

const meterStates = [
  {
    entity_id: "sensor.energy_daily",
    state: "3.14",
    attributes: {
      friendly_name: "Daily Energy",
      unit_of_measurement: "kWh",
      source: "sensor.energy_total",
      last_period: "2.50",
      last_reset: "2024-01-01T00:00:00Z",
      meter_type: "daily",
    },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "sensor.water_monthly",
    state: "120.5",
    attributes: {
      friendly_name: "Monthly Water",
      unit_of_measurement: "L",
      source: "sensor.water_total",
      last_period: "100.0",
      last_reset: "2024-01-01T00:00:00Z",
    },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "sensor.temperature",
    state: "21",
    attributes: { friendly_name: "Temperature", unit_of_measurement: "°C" },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
];

function captureLog(fn: () => Promise<void>): Promise<string> {
  const output: string[] = [];
  const orig = console.log;
  console.log = (msg: string) => output.push(msg);
  return fn()
    .then(() => { console.log = orig; return output.join("\n"); })
    .catch((err) => { console.log = orig; throw err; });
}

describe("utility-meter command", () => {
  beforeEach(() => { mockRequest.mockReset(); exitSpy.mockClear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it("lists utility meter entities", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(meterStates));
    const cmd = createUtilityMeterCommand();
    const result = await captureLog(() => cmd.parseAsync(["node", "test"], { from: "user" }));
    const parsed = JSON.parse(result);
    expect(parsed.utility_meters).toHaveLength(2);
    expect(parsed.utility_meters[0].entity_id).toBe("sensor.energy_daily");
    expect(parsed.utility_meters[1].entity_id).toBe("sensor.water_monthly");
  });

  it("returns count with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(meterStates));
    const cmd = createUtilityMeterCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--count"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.utility_meters_count).toBe(2);
  });

  it("filters by state", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(meterStates));
    const cmd = createUtilityMeterCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--state", "3.14"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.utility_meters).toHaveLength(1);
    expect(parsed.utility_meters[0].entity_id).toBe("sensor.energy_daily");
  });

  it("resets a utility meter", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createUtilityMeterCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--reset", "sensor.energy_daily"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("reset");
    expect(parsed.entity_id).toBe("sensor.energy_daily");
  });

  it("calibrates a utility meter", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createUtilityMeterCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--calibrate", "sensor.energy_daily", "--value", "5.5"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("calibrated");
    expect(parsed.entity_id).toBe("sensor.energy_daily");
    expect(parsed.value).toBe(5.5);
  });

  it("rejects calibrate without --value", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const cmd = createUtilityMeterCommand();
    await cmd.parseAsync(["node", "test", "--calibrate", "sensor.energy_daily"], { from: "user" });
    expect(exitSpy).toHaveBeenCalledWith(1);
    errSpy.mockRestore();
  });

  it("rejects calibrate with non-numeric value", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const cmd = createUtilityMeterCommand();
    await cmd.parseAsync(["node", "test", "--calibrate", "sensor.energy_daily", "--value", "notanumber"], { from: "user" });
    expect(exitSpy).toHaveBeenCalledWith(1);
    errSpy.mockRestore();
  });
});
