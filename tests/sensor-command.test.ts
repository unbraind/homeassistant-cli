import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSensorCommand, createBinarySensorCommand } from "../src/commands/sensor.js";

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

const allStates = [
  {
    entity_id: "sensor.temperature_bedroom",
    state: "21.5",
    attributes: {
      friendly_name: "Bedroom Temperature",
      unit_of_measurement: "°C",
      device_class: "temperature",
      state_class: "measurement",
    },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "sensor.humidity_living_room",
    state: "55",
    attributes: {
      friendly_name: "Living Room Humidity",
      unit_of_measurement: "%",
      device_class: "humidity",
      state_class: "measurement",
    },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "sensor.power_meter",
    state: "unavailable",
    attributes: {
      friendly_name: "Power Meter",
      unit_of_measurement: "W",
      device_class: "power",
      state_class: "measurement",
    },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "binary_sensor.motion_bedroom",
    state: "on",
    attributes: { friendly_name: "Bedroom Motion", device_class: "motion" },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "binary_sensor.door_front",
    state: "off",
    attributes: { friendly_name: "Front Door", device_class: "door" },
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

describe("sensor command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists all sensor entities", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(allStates));
    const cmd = createSensorCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test"], { from: "user" })
    );
    expect(result).toContain("sensor.temperature_bedroom");
    expect(result).toContain("sensor.humidity_living_room");
    expect(result).not.toContain("binary_sensor.motion_bedroom");
    expect(result).not.toContain("switch.unrelated");
  });

  it("returns count with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(allStates));
    const cmd = createSensorCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--count"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.sensors_count).toBe(3);
  });

  it("filters by device class", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(allStates));
    const cmd = createSensorCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--class", "temperature"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.sensors).toHaveLength(1);
    expect(parsed.sensors[0].entity_id).toBe("sensor.temperature_bedroom");
  });

  it("filters by unit of measurement", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(allStates));
    const cmd = createSensorCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--unit", "%"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.sensors).toHaveLength(1);
    expect(parsed.sensors[0].entity_id).toBe("sensor.humidity_living_room");
  });

  it("filters by state", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(allStates));
    const cmd = createSensorCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--state", "unavailable"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.sensors).toHaveLength(1);
    expect(parsed.sensors[0].entity_id).toBe("sensor.power_meter");
  });

  it("filters sensors above a value", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(allStates));
    const cmd = createSensorCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--above", "30"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.sensors).toHaveLength(1);
    expect(parsed.sensors[0].entity_id).toBe("sensor.humidity_living_room");
  });

  it("filters sensors below a value", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(allStates));
    const cmd = createSensorCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--below", "30"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.sensors).toHaveLength(1);
    expect(parsed.sensors[0].entity_id).toBe("sensor.temperature_bedroom");
  });
});

describe("binary-sensor command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists all binary sensor entities", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(allStates));
    const cmd = createBinarySensorCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test"], { from: "user" })
    );
    expect(result).toContain("binary_sensor.motion_bedroom");
    expect(result).toContain("binary_sensor.door_front");
    expect(result).not.toContain("sensor.temperature_bedroom");
    expect(result).not.toContain("switch.unrelated");
  });

  it("returns count with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(allStates));
    const cmd = createBinarySensorCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--count"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.binary_sensors_count).toBe(2);
  });

  it("filters by device class", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(allStates));
    const cmd = createBinarySensorCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--class", "motion"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.binary_sensors).toHaveLength(1);
    expect(parsed.binary_sensors[0].entity_id).toBe("binary_sensor.motion_bedroom");
  });

  it("filters by state on", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(allStates));
    const cmd = createBinarySensorCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--state", "on"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.binary_sensors).toHaveLength(1);
    expect(parsed.binary_sensors[0].entity_id).toBe("binary_sensor.motion_bedroom");
  });

  it("filters by state off", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(allStates));
    const cmd = createBinarySensorCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--state", "off"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.binary_sensors).toHaveLength(1);
    expect(parsed.binary_sensors[0].entity_id).toBe("binary_sensor.door_front");
  });
});
