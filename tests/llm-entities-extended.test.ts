import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createEntitiesCommand } from "../src/commands/llm/entities.js";

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
  }).catch((err) => {
    console.log = originalLog;
    throw err;
  });
}

const sampleStates = [
  {
    entity_id: "light.kitchen",
    state: "on",
    attributes: { friendly_name: "Kitchen Light", brightness: 200 },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "light.living",
    state: "off",
    attributes: { friendly_name: "Living Light" },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "switch.fan",
    state: "on",
    attributes: { friendly_name: "Fan" },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "sensor.temperature",
    state: "21.5",
    attributes: { unit_of_measurement: "°C", friendly_name: "Temperature" },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "sensor.humidity",
    state: "65",
    attributes: { unit_of_measurement: "%", friendly_name: "Humidity" },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
];

describe("entities command extended", () => {
  beforeEach(() => { mockRequest.mockReset(); exitSpy.mockClear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it("lists all entities without filter", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStates));

    const cmd = createEntitiesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test"], { from: "user" })
    );

    expect(result).toContain("light.kitchen");
    expect(result).toContain("switch.fan");
  });

  it("filters by domain", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStates));

    const cmd = createEntitiesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--domain", "sensor"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed.every((e: { entity_id: string }) => e.entity_id.startsWith("sensor."))).toBe(true);
    expect(parsed).toHaveLength(2);
  });

  it("filters by state", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStates));

    const cmd = createEntitiesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--state", "on"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed.every((e: { state: string }) => e.state === "on")).toBe(true);
  });

  it("filters by pattern", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStates));

    const cmd = createEntitiesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--pattern", "kitchen"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed.some((e: { entity_id: string }) => e.entity_id === "light.kitchen")).toBe(true);
    expect(parsed.some((e: { entity_id: string }) => e.entity_id === "switch.fan")).toBe(false);
  });

  it("returns count with --count flag", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStates));

    const cmd = createEntitiesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--count"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed.count).toBe(5);
  });

  it("groups by domain with --domains flag", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStates));

    const cmd = createEntitiesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--domains"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.some((d: { domain: string }) => d.domain === "sensor")).toBe(true);
    expect(parsed.some((d: { domain: string }) => d.domain === "light")).toBe(true);
  });

  it("limits results with --limit flag", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStates));

    const cmd = createEntitiesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--limit", "2"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(2);
  });

  it("limits domain results with --domains --limit", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStates));

    const cmd = createEntitiesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--domains", "--limit", "1"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(1);
  });

  it("filters attributes with --attributes flag", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStates));

    const cmd = createEntitiesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--domain", "light", "--attributes", "brightness"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    // Should only include brightness attribute for light entities
    expect(parsed.some((e: { entity_id: string; attributes: Record<string, unknown> }) =>
      e.entity_id === "light.kitchen" && e.attributes.brightness === 200
    )).toBe(true);
    // Non-light entities should be filtered out
    expect(parsed.some((e: { entity_id: string }) => e.entity_id === "switch.fan")).toBe(false);
  });
});
