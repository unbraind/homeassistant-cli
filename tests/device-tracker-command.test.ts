import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createDeviceTrackerCommand } from "../src/commands/device-tracker.js";

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
    entity_id: "device_tracker.pixel_7_pro",
    state: "home",
    attributes: {
      source_type: "gps",
      latitude: 48.123,
      longitude: 15.142,
      gps_accuracy: 100,
      friendly_name: "Pixel 7 Pro",
    },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "device_tracker.maria_samsung",
    state: "home",
    attributes: {
      source_type: "gps",
      latitude: 48.122,
      longitude: 15.141,
      gps_accuracy: 188,
      friendly_name: "Maria-Samsung",
    },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "device_tracker.oneplus_a5010",
    state: "unknown",
    attributes: {
      source_type: "gps",
      friendly_name: "OnePlus A5010",
    },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "device_tracker.router_guest",
    state: "not_home",
    attributes: {
      source_type: "router",
      friendly_name: "Guest Device",
    },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "sensor.unrelated",
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

describe("device-tracker command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists all device_tracker entities", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(allStates));
    const cmd = createDeviceTrackerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.device_trackers).toHaveLength(4);
    expect(parsed.device_trackers[0].entity_id).toBe("device_tracker.pixel_7_pro");
    expect(result).not.toContain("sensor.unrelated");
  });

  it("returns count with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(allStates));
    const cmd = createDeviceTrackerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--count"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.device_trackers_count).toBe(4);
  });

  it("filters by state --state home", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(allStates));
    const cmd = createDeviceTrackerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--state", "home"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.device_trackers).toHaveLength(2);
    expect(parsed.device_trackers.every((d: { state: string }) => d.state === "home")).toBe(true);
  });

  it("filters by state --state not_home", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(allStates));
    const cmd = createDeviceTrackerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--state", "not_home"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.device_trackers).toHaveLength(1);
    expect(parsed.device_trackers[0].entity_id).toBe("device_tracker.router_guest");
  });

  it("--home shortcut filters to home devices", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(allStates));
    const cmd = createDeviceTrackerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--home"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.device_trackers).toHaveLength(2);
    expect(parsed.device_trackers.every((d: { state: string }) => d.state === "home")).toBe(true);
  });

  it("--away shortcut filters to non-home devices", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(allStates));
    const cmd = createDeviceTrackerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--away"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.device_trackers).toHaveLength(2);
    expect(parsed.device_trackers.every((d: { state: string }) => d.state !== "home")).toBe(true);
  });

  it("filters by source type --source gps", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(allStates));
    const cmd = createDeviceTrackerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--source", "gps"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.device_trackers).toHaveLength(3);
    expect(parsed.device_trackers.every((d: { source_type: string }) => d.source_type === "gps")).toBe(true);
  });

  it("filters by source type --source router", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(allStates));
    const cmd = createDeviceTrackerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--source", "router"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.device_trackers).toHaveLength(1);
    expect(parsed.device_trackers[0].entity_id).toBe("device_tracker.router_guest");
  });

  it("combined filter: --home --source gps", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(allStates));
    const cmd = createDeviceTrackerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--home", "--source", "gps"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.device_trackers).toHaveLength(2);
    expect(parsed.device_trackers.every((d: { state: string; source_type: string }) =>
      d.state === "home" && d.source_type === "gps")).toBe(true);
  });

  it("includes GPS coordinates in output", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(allStates));
    const cmd = createDeviceTrackerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--state", "home"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    const pixel = parsed.device_trackers.find((d: { entity_id: string }) =>
      d.entity_id === "device_tracker.pixel_7_pro");
    expect(pixel.latitude).toBe(48.123);
    expect(pixel.longitude).toBe(15.142);
    expect(pixel.gps_accuracy).toBe(100);
  });
});
