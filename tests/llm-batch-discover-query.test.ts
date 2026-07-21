import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createBatchCommand } from "../src/commands/llm/batch.js";
import { createDiscoverCommand } from "../src/commands/llm/discover.js";
import { createQueryCommand } from "../src/commands/llm/query.js";

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

const sampleStates = [
  { entity_id: "light.kitchen", state: "on", attributes: { friendly_name: "Kitchen Light", brightness: 128 }, last_changed: "2024-01-01T00:00:00Z", last_updated: "2024-01-01T00:00:00Z" },
  { entity_id: "light.living", state: "off", attributes: { friendly_name: "Living Light" }, last_changed: "2024-01-01T00:00:00Z", last_updated: "2024-01-01T00:00:00Z" },
  { entity_id: "switch.fan", state: "on", attributes: { friendly_name: "Fan" }, last_changed: "2024-01-01T00:00:00Z", last_updated: "2024-01-01T00:00:00Z" },
  { entity_id: "sensor.temperature", state: "21.5", attributes: { unit_of_measurement: "°C", friendly_name: "Temperature" }, last_changed: "2024-01-01T00:00:00Z", last_updated: "2024-01-01T00:00:00Z" },
  { entity_id: "sensor.unavail", state: "unavailable", attributes: {}, last_changed: "2024-01-01T00:00:00Z", last_updated: "2024-01-01T00:00:00Z" },
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

// --- BATCH COMMAND ---

describe("batch command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("calls service for each entity in the list", async () => {
    // Two entities → two service calls
    mockRequest
      .mockResolvedValueOnce(mockResponse({ context: { id: "ctx1" } }))
      .mockResolvedValueOnce(mockResponse({ context: { id: "ctx2" } }));

    const cmd = createBatchCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(
        ["--domain", "light", "--service", "turn_on", "--entities", "light.kitchen,light.living"],
        { from: "user" }
      )
    );

    const parsed = JSON.parse(result);
    expect(parsed.total).toBe(2);
    expect(parsed.successful).toBe(2);
    expect(parsed.failed).toBe(0);
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });

  it("handles partial failures gracefully", async () => {
    mockRequest
      .mockResolvedValueOnce(mockResponse({ context: { id: "ctx1" } }))
      .mockResolvedValueOnce(mockResponse("Error", 500));

    const cmd = createBatchCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(
        ["--domain", "light", "--service", "turn_on", "--entities", "light.kitchen,light.broken"],
        { from: "user" }
      )
    );

    const parsed = JSON.parse(result);
    expect(parsed.total).toBe(2);
    expect(parsed.successful).toBe(1);
    expect(parsed.failed).toBe(1);
  });

  it("stringifies non-Error batch failures", async () => {
    mockRequest.mockRejectedValueOnce("offline");
    const result = JSON.parse(await captureLog(() => createBatchCommand().parseAsync([
      "--domain", "light", "--service", "turn_on", "--entities", "light.kitchen",
    ], { from: "user" })));
    expect(result.results[0].error).toBe("offline");
  });

  it("passes extra data to each service call", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createBatchCommand();
    await captureLog(() =>
      cmd.parseAsync(
        ["--domain", "light", "--service", "turn_on", "--entities", "light.kitchen", "--data", '{"brightness":255}'],
        { from: "user" }
      )
    );

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.brightness).toBe(255);
    expect(body.entity_id).toBe("light.kitchen");
  });

  it("returns results array with entity_id and success fields", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createBatchCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(
        ["--domain", "switch", "--service", "turn_off", "--entities", "switch.fan"],
        { from: "user" }
      )
    );

    const parsed = JSON.parse(result);
    expect(parsed.results).toHaveLength(1);
    expect(parsed.results[0].entity_id).toBe("switch.fan");
    expect(parsed.results[0].success).toBe(true);
  });
});

// --- DISCOVER COMMAND ---

describe("discover command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns topology summary by default", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStates));

    const cmd = createDiscoverCommand();
    const result = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed.entities).toBe(5);
    expect(typeof parsed.domains).toBe("number");
    expect(Array.isArray(parsed.top_domains)).toBe(true);
  });

  it("lists domains with counts with --domains flag", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStates));

    const cmd = createDiscoverCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--domains"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(Array.isArray(parsed)).toBe(true);
    expect(parsed.some((d: { domain: string }) => d.domain === "light")).toBe(true);
    expect(parsed.some((d: { domain: string }) => d.domain === "sensor")).toBe(true);
  });

  it("lists unavailable entities with --unavailable flag", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStates));

    const cmd = createDiscoverCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--unavailable"], { from: "user" })
    );

    // Should contain the unavailable sensor entity
    expect(result).toContain("sensor.unavail");
    expect(result).not.toContain("light.kitchen");
  });

  it("limits unavailable entities", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([
      ...sampleStates,
      { entity_id: "sensor.unknown", state: "unknown", attributes: {}, last_changed: "", last_updated: "" },
    ]));
    const result = JSON.parse(await captureLog(() => createDiscoverCommand().parseAsync([
      "--unavailable", "--limit", "1",
    ], { from: "user" })));
    expect(result).toHaveLength(1);
  });

  it("groups an empty entity id under unknown in domain and summary views", async () => {
    const malformed = [{ entity_id: "", state: "unknown", attributes: {}, last_changed: "", last_updated: "" }];
    mockRequest.mockResolvedValueOnce(mockResponse(malformed));
    expect(await captureLog(() => createDiscoverCommand().parseAsync(["--domains"], { from: "user" }))).toContain("unknown");
    mockRequest.mockResolvedValueOnce(mockResponse(malformed));
    expect(await captureLog(() => createDiscoverCommand().parseAsync([], { from: "user" }))).toContain("unknown");
  });

  it("limits output with --limit flag", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStates));

    const cmd = createDiscoverCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--domains", "--limit", "1"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(1);
  });

  it("counts unavailable entities in topology summary", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStates));

    const cmd = createDiscoverCommand();
    const result = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed.unavailable).toBe(1);
  });
});

// --- QUERY COMMAND ---

describe("query command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("filters by domain", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStates));

    const cmd = createQueryCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["domain:light"], { from: "user" })
    );

    // Should contain light entities only
    const parsed = JSON.parse(result) as Array<{ entity_id: string }>;
    expect(parsed.every(e => e.entity_id.startsWith("light."))).toBe(true);
    expect(parsed.some(e => e.entity_id === "light.kitchen")).toBe(true);
    expect(parsed.some(e => e.entity_id === "switch.fan")).toBe(false);
  });

  it("filters by state", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStates));

    const cmd = createQueryCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["state:on"], { from: "user" })
    );

    const parsed = JSON.parse(result) as Array<{ entity_id: string; state: string }>;
    expect(parsed.every(e => e.state === "on")).toBe(true);
    expect(parsed.some(e => e.entity_id === "light.kitchen")).toBe(true);
    expect(parsed.some(e => e.entity_id === "switch.fan")).toBe(true);
    expect(parsed.some(e => e.entity_id === "light.living")).toBe(false);
  });

  it("filters by attribute presence", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStates));

    const cmd = createQueryCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["attributes:unit_of_measurement"], { from: "user" })
    );

    const parsed = JSON.parse(result) as Array<{ entity_id: string }>;
    expect(parsed.some(e => e.entity_id === "sensor.temperature")).toBe(true);
    expect(parsed.every(e => e.entity_id.startsWith("sensor."))).toBe(true);
  });

  it("filters by attribute value", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStates));

    const cmd = createQueryCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["attributes:unit_of_measurement=°C"], { from: "user" })
    );

    const parsed = JSON.parse(result) as Array<{ entity_id: string }>;
    expect(parsed.some(e => e.entity_id === "sensor.temperature")).toBe(true);
    expect(parsed.some(e => e.entity_id === "light.kitchen")).toBe(false);
  });

  it("filters by name pattern", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStates));

    const cmd = createQueryCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["name:kitchen"], { from: "user" })
    );

    const parsed = JSON.parse(result) as Array<{ entity_id: string }>;
    expect(parsed.some(e => e.entity_id === "light.kitchen")).toBe(true);
    expect(parsed.some(e => e.entity_id === "switch.fan")).toBe(false);
  });

  it("combines multiple conditions (AND)", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStates));

    const cmd = createQueryCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["domain:light state:on"], { from: "user" })
    );

    const parsed = JSON.parse(result) as Array<{ entity_id: string; state: string }>;
    expect(parsed.some(e => e.entity_id === "light.kitchen")).toBe(true);
    expect(parsed.some(e => e.entity_id === "light.living")).toBe(false);
    expect(parsed.some(e => e.entity_id === "switch.fan")).toBe(false);
  });

  it("returns summary with --summary flag", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStates));

    const cmd = createQueryCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["domain:light", "--summary"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed.total).toBe(2);
    expect(parsed.by_state).toBeDefined();
    expect(parsed.by_domain).toBeDefined();
  });

  it("groups an empty entity id under unknown in query summaries", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([
      { entity_id: "", state: "unknown", attributes: {}, last_changed: "", last_updated: "" },
    ]));
    const result = JSON.parse(await captureLog(() => createQueryCommand().parseAsync([
      "unknown:condition", "--summary",
    ], { from: "user" })));
    expect(result.by_domain.unknown).toBe(1);
  });

  it("limits output with --limit flag", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStates));

    const cmd = createQueryCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["domain:light", "--limit", "1"], { from: "user" })
    );

    const parsed = JSON.parse(result) as Array<{ entity_id: string }>;
    expect(parsed).toHaveLength(1);
    expect(parsed[0].entity_id).toBe("light.kitchen");
  });

  it("handles unknown conditions by returning all states", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStates));

    const cmd = createQueryCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["unknown:filter"], { from: "user" })
    );

    // Unknown condition returns all states unfiltered
    const parsed = JSON.parse(result) as Array<{ entity_id: string }>;
    expect(parsed).toHaveLength(5);
  });
});
