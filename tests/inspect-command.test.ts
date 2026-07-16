import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createInspectCommand, createSummaryCommand } from "../src/commands/inspect.js";

const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

const getState = vi.fn(async () => ({
  entity_id: "light.kitchen",
  state: "on",
  attributes: { brightness: 200 },
  last_changed: "2026-03-02T10:00:00Z",
  last_updated: "2026-03-02T10:00:00Z",
}));
const getHistory = vi.fn(async () => [[
  { state: "off", last_changed: "2026-03-02T09:00:00Z" },
  { state: "on", last_changed: "2026-03-02T10:00:00Z" },
]]);
const getStates = vi.fn(async () => ([
  { entity_id: "light.kitchen", state: "on", attributes: {}, last_changed: "a", last_updated: "a" },
  { entity_id: "light.hall", state: "unavailable", attributes: {}, last_changed: "b", last_updated: "b" },
  { entity_id: "sensor.temp", state: "21", attributes: {}, last_changed: "c", last_updated: "c" },
]));

vi.mock("../src/api/index.js", () => ({
  HomeAssistantClient: vi.fn().mockImplementation(function () { return {
    getState,
    getHistory,
    getStates,
  }; }),
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

describe("inspect and summary commands", () => {
  beforeEach(() => {
    exitSpy.mockClear();
    getState.mockClear();
    getHistory.mockClear();
    getStates.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns entity details from inspect", async () => {
    const cmd = createInspectCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["light.kitchen"], { from: "user" });

    console.log = originalLog;
    expect(getState).toHaveBeenCalledWith("light.kitchen");
    const parsed = JSON.parse(output.join("\n")) as Record<string, unknown>;
    expect(parsed["entity_id"]).toBe("light.kitchen");
    expect(parsed["state"]).toBe("on");
  });

  it("includes history details when requested", async () => {
    const cmd = createInspectCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["light.kitchen", "--history", "--limit", "1"], { from: "user" });

    console.log = originalLog;
    expect(getHistory).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(output.join("\n")) as Record<string, unknown>;
    expect(Array.isArray(parsed["recent_history"])).toBe(true);
    expect((parsed["recent_history"] as unknown[]).length).toBe(1);
  });

  it("surfaces history error without failing inspect", async () => {
    getHistory.mockRejectedValueOnce(new Error("history unavailable"));
    const cmd = createInspectCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["light.kitchen", "--history"], { from: "user" });

    console.log = originalLog;
    const parsed = JSON.parse(output.join("\n")) as Record<string, unknown>;
    expect(parsed["history_error"]).toBe("history unavailable");
  });

  it("returns state and domain summary", async () => {
    const cmd = createSummaryCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync([], { from: "user" });

    console.log = originalLog;
    expect(getStates).toHaveBeenCalledTimes(1);
    const parsed = JSON.parse(output.join("\n")) as Record<string, unknown>;
    expect(parsed["total_entities"]).toBe(3);
    expect(parsed["domains"]).toBe(2);
    expect(parsed["unavailable_count"]).toBe(1);
    expect(parsed["by_state_top"]).toBeTruthy();
  });

  it("returns full state distribution when requested", async () => {
    const cmd = createSummaryCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["--full-states"], { from: "user" });

    console.log = originalLog;
    const parsed = JSON.parse(output.join("\n")) as Record<string, unknown>;
    expect(parsed["by_state"]).toBeTruthy();
    expect(parsed["by_state_other_count"]).toBeUndefined();
  });
});
