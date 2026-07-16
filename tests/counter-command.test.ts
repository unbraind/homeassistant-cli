import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createCounterCommand } from "../src/commands/counter.js";

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

const counterStates = [
  {
    entity_id: "counter.daily_steps",
    state: "42",
    attributes: {
      friendly_name: "Daily Steps",
      initial: 0,
      step: 1,
      min: 0,
      max: 999,
      restore: true,
    },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "counter.button_press",
    state: "7",
    attributes: {
      friendly_name: "Button Press Count",
      initial: 0,
      step: 1,
      min: 0,
      max: 100,
      restore: false,
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

describe("counter command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists all counter entities", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(counterStates));
    const cmd = createCounterCommand();
    const result = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );
    expect(result).toContain("counter.daily_steps");
    expect(result).toContain("counter.button_press");
    expect(result).not.toContain("switch.unrelated");
  });

  it("returns count with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(counterStates));
    const cmd = createCounterCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--count"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.counters_count).toBe(2);
  });

  it("increments a counter with --increment", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createCounterCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--increment", "counter.daily_steps"], { from: "user" })
    );
    expect(result).toContain("incremented");
    expect(result).toContain("counter.daily_steps");
    const callOpts = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOpts?.body ?? "{}");
    expect(body.entity_id).toBe("counter.daily_steps");
  });

  it("decrements a counter with --decrement", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createCounterCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--decrement", "counter.daily_steps"], { from: "user" })
    );
    expect(result).toContain("decremented");
    expect(result).toContain("counter.daily_steps");
  });

  it("resets a counter with --reset", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createCounterCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--reset", "counter.daily_steps"], { from: "user" })
    );
    expect(result).toContain("reset");
    expect(result).toContain("counter.daily_steps");
  });

  it("sets a counter value with --set and --entity-id", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createCounterCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entity-id", "counter.daily_steps", "--set", "10"], { from: "user" })
    );
    expect(result).toContain("set_value");
    expect(result).toContain("counter.daily_steps");
    const callOpts = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOpts?.body ?? "{}");
    expect(body.value).toBe(10);
  });

  it("exits with error when --set used without --entity-id", async () => {
    const cmd = createCounterCommand();
    await captureLog(() =>
      cmd.parseAsync(["--set", "10"], { from: "user" })
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("exits with error when --set value is not an integer", async () => {
    const cmd = createCounterCommand();
    await captureLog(() =>
      cmd.parseAsync(["--entity-id", "counter.steps", "--set", "notanumber"], { from: "user" })
    );
    expect(exitSpy).toHaveBeenCalledWith(1);
  });

  it("filters by state", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(counterStates));
    const cmd = createCounterCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--state", "42"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.counters).toHaveLength(1);
    expect(parsed.counters[0].entity_id).toBe("counter.daily_steps");
  });
});
