import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createTimersCommand } from "../src/commands/timers.js";

const exitSpyTop = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

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

const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

const timerStates = [
  {
    entity_id: "timer.fan_basement",
    state: "idle",
    attributes: { duration: "0:10:00", friendly_name: "Fan Basement", editable: true },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "timer.sleep_timer",
    state: "active",
    attributes: { duration: "0:30:00", friendly_name: "Sleep Timer", editable: true },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "light.kitchen",
    state: "on",
    attributes: {},
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
];

function captureLog(fn: () => Promise<void>): Promise<string> {
  const output: string[] = [];
  const errors: string[] = [];
  const originalLog = console.log;
  const originalErr = console.error;
  console.log = (msg: string) => output.push(msg);
  console.error = (msg: string) => errors.push(msg);
  return fn().then(() => {
    console.log = originalLog;
    console.error = originalErr;
    return output.join("\n");
  }).catch((err) => {
    console.log = originalLog;
    console.error = originalErr;
    throw err;
  });
}

describe("timers command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpyTop.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists all timers", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(timerStates));

    const cmd = createTimersCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test"], { from: "user" })
    );

    expect(result).toContain("timer.fan_basement");
    expect(result).toContain("timer.sleep_timer");
    expect(result).not.toContain("light.kitchen");
  });

  it("lists only timers (filters non-timer entities)", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(timerStates));

    const cmd = createTimersCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed.timers.every((t: { entity_id: string }) => t.entity_id.startsWith("timer."))).toBe(true);
    expect(parsed.timers).toHaveLength(2);
  });

  it("returns timer count with --count flag", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(timerStates));

    const cmd = createTimersCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--count"], { from: "user" })
    );

    expect(result).toContain("timers_count");
    const parsed = JSON.parse(result);
    expect(parsed.timers_count).toBe(2);
  });

  it("filters by state", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(timerStates));

    const cmd = createTimersCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--state", "active"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed.timers.every((t: { state: string }) => t.state === "active")).toBe(true);
  });

  it("filters by entity-id", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(timerStates));

    const cmd = createTimersCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--entity-id", "timer.fan_basement"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed.timers).toHaveLength(1);
    expect(parsed.timers[0].entity_id).toBe("timer.fan_basement");
  });

  it("starts a timer", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createTimersCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--start", "timer.fan_basement"], { from: "user" })
    );

    expect(result).toContain("started");
    expect(result).toContain("timer.fan_basement");
  });

  it("starts a timer with duration", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createTimersCommand();
    await captureLog(() =>
      cmd.parseAsync(["node", "test", "--start", "timer.fan_basement", "--duration", "00:05:00"], { from: "user" })
    );

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.duration).toBe("00:05:00");
    expect(body.entity_id).toBe("timer.fan_basement");
  });

  it("pauses a timer", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createTimersCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--pause", "timer.sleep_timer"], { from: "user" })
    );

    expect(result).toContain("paused");
  });

  it("cancels a timer", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createTimersCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--cancel", "timer.sleep_timer"], { from: "user" })
    );

    expect(result).toContain("cancelled");
  });

  it("finishes a timer", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createTimersCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--finish", "timer.fan_basement"], { from: "user" })
    );

    expect(result).toContain("finished");
  });

  it("changes timer duration", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createTimersCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--change", "timer.fan_basement", "--duration", "00:15:00"], { from: "user" })
    );

    expect(result).toContain("changed");
    expect(result).toContain("00:15:00");
  });

  it("exits with error when --change missing --duration", async () => {
    // After process.exit(1) is mocked, code may continue - set up fallback mock
    mockRequest.mockResolvedValue(mockResponse({ context: { id: "ctx" } }));
    const errors: string[] = [];
    const originalErr = console.error;
    console.error = (msg: string) => errors.push(msg);
    const cmd = createTimersCommand();
    try {
      await cmd.parseAsync(["node", "test", "--change", "timer.fan_basement"], { from: "user" });
    } catch {
      // may throw after mocked exit
    } finally {
      console.error = originalErr;
    }

    // Either process.exit(1) is called OR an error message is logged
    const exitCalled = exitSpyTop.mock.calls.some(call => call[0] === 1);
    const errLogged = errors.some(e => e.includes("duration"));
    expect(exitCalled || errLogged).toBe(true);
  });

  it("reloads timer configuration", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createTimersCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--reload"], { from: "user" })
    );

    expect(result).toContain("reloaded");
  });
});
