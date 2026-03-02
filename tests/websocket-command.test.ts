import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createWebsocketCommand } from "../src/commands/websocket.js";

const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

const connect = vi.fn(async () => undefined);
const close = vi.fn(async () => undefined);
const call = vi.fn(async () => ({ ok: true }));
const subscribeEvents = vi.fn(async () => [{ event_type: "state_changed" }]);

vi.mock("../src/api/websocket.js", () => ({
  HomeAssistantWebSocketClient: vi.fn().mockImplementation(() => ({
    connect,
    close,
    call,
    subscribeEvents,
  })),
}));

vi.mock("../src/config/loader.js", () => ({
  getConfig: vi.fn(() => ({
    url: "http://localhost:8123",
    token: "test-token",
    outputFormat: "json",
    timeout: 30000,
    readOnly: false,
  })),
}));

describe("websocket command", () => {
  beforeEach(() => {
    connect.mockClear();
    close.mockClear();
    call.mockClear();
    subscribeEvents.mockClear();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("supports connect test", async () => {
    const cmd = createWebsocketCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["--connect-test"], { from: "user" });

    console.log = originalLog;
    expect(connect).toHaveBeenCalledTimes(1);
    expect(close).toHaveBeenCalledTimes(1);
    expect(JSON.parse(output.join("\n"))).toEqual({ connected: true, auth: "ok" });
  });

  it("supports generic call", async () => {
    const cmd = createWebsocketCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["call", "-T", "get_states", "-d", '{"x":1}'], { from: "user" });

    console.log = originalLog;
    expect(call).toHaveBeenCalledWith("get_states", { x: 1 });
    const parsed = JSON.parse(output.join("\n"));
    expect(parsed.type).toBe("get_states");
  });

  it("supports event subscriptions", async () => {
    const cmd = createWebsocketCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["subscribe", "--event-type", "state_changed", "--wait-ms", "100", "--max-events", "5"], { from: "user" });

    console.log = originalLog;
    expect(subscribeEvents).toHaveBeenCalledWith({ eventType: "state_changed", waitMs: 100, maxEvents: 5 });
    const parsed = JSON.parse(output.join("\n"));
    expect(parsed.event_count).toBe(1);
  });
});
