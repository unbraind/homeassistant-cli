import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createValveCommand } from "../src/commands/valve.js";

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

const valveStates = [
  {
    entity_id: "valve.garden_irrigation",
    state: "closed",
    attributes: {
      friendly_name: "Garden Irrigation",
      current_valve_position: 0,
      device_class: "water",
    },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "valve.pool_inlet",
    state: "open",
    attributes: {
      friendly_name: "Pool Inlet Valve",
      current_valve_position: 100,
      device_class: "water",
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

describe("valve command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists all valve entities", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(valveStates));
    const cmd = createValveCommand();
    const result = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );
    expect(result).toContain("valve.garden_irrigation");
    expect(result).toContain("valve.pool_inlet");
    expect(result).not.toContain("switch.unrelated");
  });

  it("returns count with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(valveStates));
    const cmd = createValveCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--count"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.valves_count).toBe(2);
  });

  it("filters by state", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(valveStates));
    const cmd = createValveCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--state", "open"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.valves).toHaveLength(1);
    expect(parsed.valves[0].entity_id).toBe("valve.pool_inlet");
  });

  it("opens a valve with --open", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createValveCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--open", "valve.garden_irrigation"], { from: "user" })
    );
    expect(result).toContain("opened");
    expect(result).toContain("valve.garden_irrigation");
    const callOpts = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOpts?.body ?? "{}");
    expect(body.entity_id).toBe("valve.garden_irrigation");
  });

  it("closes a valve with --close", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createValveCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--close", "valve.pool_inlet"], { from: "user" })
    );
    expect(result).toContain("closed");
    expect(result).toContain("valve.pool_inlet");
  });

  it("stops a valve with --stop", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createValveCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--stop", "valve.garden_irrigation"], { from: "user" })
    );
    expect(result).toContain("stopped");
  });

  it("toggles a valve with --toggle", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createValveCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--toggle", "valve.pool_inlet"], { from: "user" })
    );
    expect(result).toContain("toggled");
  });

  it("sets valve position with --entity-id and --position", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createValveCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entity-id", "valve.garden_irrigation", "--position", "50"], { from: "user" })
    );
    expect(result).toContain("set_position");
    const callOpts = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOpts?.body ?? "{}");
    expect(body.position).toBe(50);
    expect(body.entity_id).toBe("valve.garden_irrigation");
  });
});
