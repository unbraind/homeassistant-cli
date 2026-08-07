import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWebsocketCommand } from "../src/commands/websocket.js";

const call = vi.fn(async (): Promise<unknown> => ({}));
const close = vi.fn(async () => undefined);

vi.mock("../src/api/websocket.js", () => ({
  HomeAssistantWebSocketClient: vi.fn().mockImplementation(function () {
    return { call, close };
  }),
}));

vi.mock("../src/config/loader.js", () => ({
  getConfig: vi.fn(() => ({
    url: "http://localhost:8123",
    token: "test-token",
    outputFormat: "json",
    timeout: 30000,
    readOnly: true,
  })),
}));

describe("typed WebSocket execution trace diagnostics", () => {
  let output: string[];

  beforeEach(() => {
    output = [];
    call.mockReset();
    call.mockResolvedValue({});
    close.mockClear();
    vi.spyOn(console, "log").mockImplementation((value: string) => output.push(value));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("lists newest trace summaries first with deterministic bounds", async () => {
    call.mockResolvedValue([
      { domain: "automation", item_id: "lights", run_id: "old", timestamp: { start: "2026-08-01" } },
      null,
      "invalid",
      { domain: "automation", item_id: "alarm", run_id: "same-b", timestamp: { start: "2026-08-02" } },
      { domain: "automation", item_id: "alarm", run_id: "same-a", timestamp: { start: "2026-08-02" } },
      { domain: "automation", item_id: "no_timestamp", run_id: "none", timestamp: "invalid" },
    ]);

    await createWebsocketCommand().parseAsync([
      "traces", "list", "--domain", "automation", "--item-id", "lights_2", "--limit", "2",
    ], { from: "user" });

    expect(call).toHaveBeenCalledWith("trace/list", { domain: "automation", item_id: "lights_2" });
    expect(JSON.parse(output[0] ?? "")).toEqual({
      domain: "automation",
      item_id: "lights_2",
      count: 4,
      returned_count: 2,
      truncated: true,
      traces: [
        { domain: "automation", item_id: "alarm", run_id: "same-a", timestamp: { start: "2026-08-02" } },
        { domain: "automation", item_id: "alarm", run_id: "same-b", timestamp: { start: "2026-08-02" } },
      ],
    });
    expect(close).toHaveBeenCalledOnce();
  });

  it("supports unfiltered counts, all rows, and unexpected trace responses", async () => {
    call.mockResolvedValueOnce([{ domain: "script", item_id: "night", run_id: "run-1" }])
      .mockResolvedValueOnce(null);

    await createWebsocketCommand().parseAsync([
      "traces", "list", "--domain", "script", "--count", "--limit", "invalid",
    ], { from: "user" });
    expect(call).toHaveBeenLastCalledWith("trace/list", { domain: "script" });
    expect(JSON.parse(output[0] ?? "")).toEqual({ domain: "script", item_id: null, count: 1 });

    output = [];
    await createWebsocketCommand().parseAsync([
      "traces", "list", "--domain", "automation", "--all",
    ], { from: "user" });
    expect(JSON.parse(output[0] ?? "")).toEqual({
      domain: "automation",
      item_id: null,
      count: 0,
      returned_count: 0,
      truncated: false,
      traces: [],
    });
  });

  it("gets exact object and scalar traces", async () => {
    call.mockResolvedValueOnce({ domain: "automation", item_id: "lights", run_id: "run-1", trace: {} })
      .mockResolvedValueOnce("legacy");

    await createWebsocketCommand().parseAsync([
      "traces", "get", "--domain", "automation", "--item-id", "lights", "--run-id", "run-1",
    ], { from: "user" });
    expect(call).toHaveBeenLastCalledWith("trace/get", {
      domain: "automation",
      item_id: "lights",
      run_id: "run-1",
    });
    expect(JSON.parse(output[0] ?? "")).toEqual({
      domain: "automation",
      item_id: "lights",
      run_id: "run-1",
      trace: {},
    });

    output = [];
    await createWebsocketCommand().parseAsync([
      "traces", "get", "--domain", "script", "--item-id", "night", "--run-id", "run_2",
    ], { from: "user" });
    expect(JSON.parse(output[0] ?? "")).toEqual({ result: "legacy" });
  });

  it("lists deterministic context rows with optional paired filters", async () => {
    call.mockResolvedValue({
      "context-b": { domain: "script", item_id: "night", run_id: "run-b" },
      "context-a": { domain: "script", item_id: "night", run_id: "run-a" },
      "context-c": "unexpected",
    });

    await createWebsocketCommand().parseAsync([
      "traces", "contexts", "--domain", "script", "--item-id", "night", "--limit", "2",
    ], { from: "user" });
    expect(call).toHaveBeenCalledWith("trace/contexts", { domain: "script", item_id: "night" });
    expect(JSON.parse(output[0] ?? "")).toEqual({
      domain: "script",
      item_id: "night",
      count: 3,
      returned_count: 2,
      truncated: true,
      contexts: [
        { context_id: "context-a", domain: "script", item_id: "night", run_id: "run-a" },
        { context_id: "context-b", domain: "script", item_id: "night", run_id: "run-b" },
      ],
    });
  });

  it("supports unfiltered context counts and unexpected responses", async () => {
    call.mockResolvedValueOnce({ one: { run_id: "run-1" } }).mockResolvedValueOnce([]);

    await createWebsocketCommand().parseAsync([
      "traces", "contexts", "--count", "--limit", "invalid",
    ], { from: "user" });
    expect(call).toHaveBeenLastCalledWith("trace/contexts", undefined);
    expect(JSON.parse(output[0] ?? "")).toEqual({ domain: null, item_id: null, count: 1 });

    output = [];
    await createWebsocketCommand().parseAsync(["traces", "contexts", "--all"], { from: "user" });
    expect(JSON.parse(output[0] ?? "")).toEqual({
      domain: null,
      item_id: null,
      count: 0,
      returned_count: 0,
      truncated: false,
      contexts: [],
    });
  });

  it("rejects invalid identifiers, incomplete context filters, and limits before network I/O", async () => {
    for (const args of [
      ["list", "--domain", "automation", "--item-id", "bad value"],
      ["get", "--domain", "automation", "--item-id", "valid", "--run-id", "bad/value"],
      ["contexts", "--domain", "automation"],
      ["contexts", "--item-id", "lights"],
      ["list", "--domain", "script", "--limit", "0"],
      ["contexts", "--limit", "nope"],
    ]) {
      await expect(createWebsocketCommand().parseAsync(["traces", ...args], { from: "user" }))
        .rejects.toThrow();
    }
    expect(call).not.toHaveBeenCalled();
  });
});
