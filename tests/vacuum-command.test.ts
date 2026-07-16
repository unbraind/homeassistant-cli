import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createVacuumCommand } from "../src/commands/vacuum.js";

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

const vacuumStates = [
  {
    entity_id: "vacuum.roomba",
    state: "docked",
    attributes: {
      friendly_name: "Roomba",
      battery_level: 95,
      battery_icon: "mdi:battery",
      fan_speed: "medium",
      fan_speed_list: ["min", "medium", "high", "max"],
    },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "vacuum.dyson",
    state: "cleaning",
    attributes: {
      friendly_name: "Dyson Robot",
      battery_level: 60,
      battery_icon: "mdi:battery-60",
      fan_speed: "high",
      fan_speed_list: ["low", "medium", "high", "turbo"],
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

describe("vacuum command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists all vacuum entities", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(vacuumStates));
    const cmd = createVacuumCommand();
    const result = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );
    expect(result).toContain("vacuum.roomba");
    expect(result).toContain("vacuum.dyson");
    expect(result).not.toContain("switch.unrelated");
  });

  it("returns count with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(vacuumStates));
    const cmd = createVacuumCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--count"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.vacuums_count).toBe(2);
  });

  it("filters by state", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(vacuumStates));
    const cmd = createVacuumCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--state", "docked"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.vacuums).toHaveLength(1);
    expect(parsed.vacuums[0].entity_id).toBe("vacuum.roomba");
  });

  it("starts a vacuum with --start", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createVacuumCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--start", "vacuum.roomba"], { from: "user" })
    );
    expect(result).toContain("started");
    expect(result).toContain("vacuum.roomba");
    const callOpts = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOpts?.body ?? "{}");
    expect(body.entity_id).toBe("vacuum.roomba");
  });

  it("pauses a vacuum with --pause", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createVacuumCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--pause", "vacuum.dyson"], { from: "user" })
    );
    expect(result).toContain("paused");
    expect(result).toContain("vacuum.dyson");
  });

  it("stops a vacuum with --stop", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createVacuumCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--stop", "vacuum.roomba"], { from: "user" })
    );
    expect(result).toContain("stopped");
  });

  it("sends vacuum to base with --return-to-base", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createVacuumCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--return-to-base", "vacuum.roomba"], { from: "user" })
    );
    expect(result).toContain("returning_to_base");
    expect(result).toContain("vacuum.roomba");
  });

  it("starts spot cleaning with --clean-spot", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createVacuumCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--clean-spot", "vacuum.roomba"], { from: "user" })
    );
    expect(result).toContain("clean_spot");
  });

  it("locates a vacuum with --locate", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createVacuumCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--locate", "vacuum.roomba"], { from: "user" })
    );
    expect(result).toContain("located");
  });

  it("sets fan speed with --entity-id and --fan-speed", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createVacuumCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entity-id", "vacuum.roomba", "--fan-speed", "high"], { from: "user" })
    );
    expect(result).toContain("set_fan_speed");
    const callOpts = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOpts?.body ?? "{}");
    expect(body.fan_speed).toBe("high");
    expect(body.entity_id).toBe("vacuum.roomba");
  });

  it("sends a custom command with --entity-id and --command", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createVacuumCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entity-id", "vacuum.roomba", "--command", "zone_clean", "--params", '{"zone":1}'], { from: "user" })
    );
    expect(result).toContain("send_command");
    const callOpts = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOpts?.body ?? "{}");
    expect(body.command).toBe("zone_clean");
    expect(body.params).toEqual({ zone: 1 });
  });

  it("errors on invalid --params JSON", async () => {
    const cmd = createVacuumCommand();
    await captureLog(() =>
      cmd.parseAsync(["--entity-id", "vacuum.roomba", "--command", "test", "--params", "not-json"], { from: "user" })
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
