import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createStatusCommand,
  createConfigCommand,
  createComponentsCommand,
  createEventsCommand,
  createStatesCommand,
  createSetStateCommand,
  createDeleteStateCommand,
} from "../src/commands/core.js";

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
  { entity_id: "light.kitchen", state: "on", attributes: {}, last_changed: "2024-01-01T00:00:00Z", last_updated: "2024-01-01T00:00:00Z" },
  { entity_id: "switch.fan", state: "off", attributes: {}, last_changed: "2024-01-01T00:00:00Z", last_updated: "2024-01-01T00:00:00Z" },
];

describe("status command", () => {
  beforeEach(() => { mockRequest.mockReset(); exitSpy.mockClear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it("returns API status", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ message: "API running." }));

    const cmd = createStatusCommand();
    const result = await captureLog(() => cmd.parseAsync([], { from: "user" }));

    expect(result).toContain("message");
  });
});

describe("config command", () => {
  beforeEach(() => { mockRequest.mockReset(); exitSpy.mockClear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it("returns HA configuration", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({
      version: "2024.1.0",
      location_name: "Home",
      components: ["light", "switch"],
    }));

    const cmd = createConfigCommand();
    const result = await captureLog(() => cmd.parseAsync([], { from: "user" }));

    expect(result).toContain("version");
    expect(result).toContain("2024.1.0");
  });
});

describe("components command", () => {
  beforeEach(() => { mockRequest.mockReset(); exitSpy.mockClear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it("returns list of components", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(["light", "switch", "sensor"]));

    const cmd = createComponentsCommand();
    const result = await captureLog(() => cmd.parseAsync([], { from: "user" }));

    expect(result).toContain("light");
    expect(result).toContain("switch");
  });

  it("returns components count with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(["light", "switch", "sensor"]));

    const cmd = createComponentsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--count"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed.components_count).toBe(3);
  });
});

describe("events command", () => {
  beforeEach(() => { mockRequest.mockReset(); exitSpy.mockClear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it("returns list of events", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([
      { event: "state_changed", listener_count: 5 },
      { event: "call_service", listener_count: 3 },
    ]));

    const cmd = createEventsCommand();
    const result = await captureLog(() => cmd.parseAsync([], { from: "user" }));

    expect(result).toContain("state_changed");
  });

  it("returns events count with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([
      { event: "state_changed", listener_count: 5 },
      { event: "call_service", listener_count: 3 },
    ]));

    const cmd = createEventsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--count"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed.events_count).toBe(2);
  });
});

describe("states command", () => {
  beforeEach(() => { mockRequest.mockReset(); exitSpy.mockClear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it("returns all states", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStates));

    const cmd = createStatesCommand();
    // No prefix - command has optional positional argument
    const result = await captureLog(() => cmd.parseAsync([], { from: "user" }));

    expect(result).toContain("light.kitchen");
    expect(result).toContain("switch.fan");
  });

  it("returns states count with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStates));

    const cmd = createStatesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--count"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed.states_count).toBe(2);
  });

  it("limits returned states with --limit", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStates));

    const cmd = createStatesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--limit", "1"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed).toHaveLength(1);
    expect(parsed[0].entity_id).toBe("light.kitchen");
  });

  it("keeps full count with --count and --limit", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStates));

    const cmd = createStatesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--count", "--limit", "1"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed.states_count).toBe(2);
  });

  it("returns single entity state by entity-id", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStates[0]));

    const cmd = createStatesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["light.kitchen"], { from: "user" })
    );

    expect(result).toContain("light.kitchen");
    expect(result).toContain("\"on\"");
  });

  it("returns count 1 for specific entity with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleStates[0]));

    const cmd = createStatesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["light.kitchen", "--count"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed.states_count).toBe(1);
  });
});

describe("set-state command", () => {
  beforeEach(() => { mockRequest.mockReset(); exitSpy.mockClear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it("sets entity state", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({
      entity_id: "light.kitchen",
      state: "on",
      attributes: {},
    }));

    const cmd = createSetStateCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["light.kitchen", "on"], { from: "user" })
    );

    expect(result).toContain("light.kitchen");
  });

  it("sets entity state with attributes", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({
      entity_id: "light.kitchen",
      state: "on",
      attributes: { brightness: 200 },
    }));

    const cmd = createSetStateCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["light.kitchen", "on", "--attributes", '{"brightness":200}'], { from: "user" })
    );

    expect(result).toContain("brightness");
    expect(result).toContain("200");
  });
});

describe("delete-state command", () => {
  beforeEach(() => { mockRequest.mockReset(); exitSpy.mockClear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it("deletes entity state", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse("", 200));

    const cmd = createDeleteStateCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["light.kitchen"], { from: "user" })
    );

    expect(result).toContain("success");
    expect(result).toContain("light.kitchen");
  });
});
