import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSearchCommand, createFindCommand } from "../src/commands/search.js";

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

const searchResults = [
  {
    entity_id: "light.kitchen",
    name: "Kitchen Light",
    domain: "light",
    area: "kitchen",
    labels: [],
    device: null,
    platform: "hue",
    state: "on",
  },
  {
    entity_id: "light.bedroom",
    name: "Bedroom Light",
    domain: "light",
    area: "bedroom",
    labels: [],
    device: null,
    platform: "hue",
    state: "off",
  },
  {
    entity_id: "sensor.kitchen_temp",
    name: "Kitchen Temperature",
    domain: "sensor",
    area: "kitchen",
    labels: [],
    device: null,
    platform: "mqtt",
    state: "22",
  },
];

const statesList = [
  {
    entity_id: "light.kitchen",
    state: "on",
    attributes: { friendly_name: "Kitchen Light" },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "light.bedroom",
    state: "off",
    attributes: { friendly_name: "Bedroom Light" },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "sensor.temp",
    state: "22",
    attributes: { friendly_name: "Temperature" },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
];

describe("search command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("searches entities via API", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(searchResults));

    const cmd = createSearchCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["kitchen"], { from: "user" })
    );

    expect(result).toContain("light.kitchen");
    expect(result).toContain("sensor.kitchen_temp");
  });

  it("searches with --domain filter", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(searchResults));

    const cmd = createSearchCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["kitchen", "-d", "light"], { from: "user" })
    );

    expect(result).toContain("light.kitchen");
    expect(result).not.toContain("sensor.kitchen_temp");
  });

  it("searches with --area filter", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(searchResults));

    const cmd = createSearchCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["light", "-a", "bedroom"], { from: "user" })
    );

    expect(result).toContain("light.bedroom");
    expect(result).not.toContain("light.kitchen");
  });

  it("searches with --state filter", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(searchResults));

    const cmd = createSearchCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["light", "-s", "on"], { from: "user" })
    );

    expect(result).toContain("light.kitchen");
    expect(result).not.toContain("light.bedroom");
  });

  it("searches with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(searchResults));

    const cmd = createSearchCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["kitchen", "--count"], { from: "user" })
    );

    expect(result).toContain("count");
    expect(result).toContain("3");
  });

  it("performs quick search", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(statesList));

    const cmd = createSearchCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["kitchen", "--quick"], { from: "user" })
    );

    expect(result).toContain("light.kitchen");
    expect(result).not.toContain("sensor.temp");
  });

  it("quick search with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(statesList));

    const cmd = createSearchCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["kitchen", "--quick", "--count"], { from: "user" })
    );

    expect(result).toContain("count");
    expect(result).toContain("1");
  });

  it.each([
    ["1", 1],
    ["-1", 2],
  ])("applies quick-search limit %s safely", async (limit, expectedCount) => {
    mockRequest.mockResolvedValueOnce(mockResponse(statesList));
    const result = JSON.parse(await captureLog(() => createSearchCommand().parseAsync([
      "light", "--quick", "--limit", limit, "--count",
    ], { from: "user" })));
    expect(result.count).toBe(expectedCount);
  });

  it("searches with --limit", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(searchResults));

    const cmd = createSearchCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["light", "-l", "1"], { from: "user" })
    );

    expect(result).toContain("light.kitchen");
    expect(result).not.toContain("sensor.kitchen_temp");
  });
});

describe("find command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("finds entities by pattern", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(statesList));

    const cmd = createFindCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["kitchen"], { from: "user" })
    );

    expect(result).toContain("light.kitchen");
    expect(result).not.toContain("sensor.temp");
  });

  it("finds with --domain filter", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(statesList));

    const cmd = createFindCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["light", "-d", "light"], { from: "user" })
    );

    expect(result).toContain("light.kitchen");
    expect(result).toContain("light.bedroom");
    expect(result).not.toContain("sensor.temp");
  });

  it("finds with --state filter", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(statesList));

    const cmd = createFindCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["light", "-s", "on"], { from: "user" })
    );

    expect(result).toContain("light.kitchen");
    expect(result).not.toContain("light.bedroom");
  });

  it("finds with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(statesList));

    const cmd = createFindCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["light", "--count"], { from: "user" })
    );

    expect(result).toContain("count");
  });
});
