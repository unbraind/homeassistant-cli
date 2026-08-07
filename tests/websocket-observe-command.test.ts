import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWebsocketCommand } from "../src/commands/websocket.js";

const close = vi.fn(async () => undefined);
const subscribeEntities = vi.fn(async () => [
  {
    a: {
      "light.kitchen": { s: "off", a: { brightness: 0 }, c: "ctx1", lc: 1 },
      "sensor.temp": { s: "20", a: {}, c: { id: "ctx2" }, lc: 2, lu: 3 },
    },
  },
  { c: {
    "light.kitchen": { "+": { s: "on", a: { brightness: 100 } }, "-": { a: ["effect"] } },
    "sensor.temp": {},
  } },
  { a: { "switch.new": { s: "on", c: "ctx3", lc: 4 } } },
  { r: ["sensor.temp"] },
  null,
  "ignored",
]);
const subscribeAutomationPlatforms = vi.fn(async ({ kind }: { kind: string }) => kind === "trigger"
  ? [{ state: { fields: { entity_id: {} } } }, { event: { fields: { event_type: {} } } }]
  : [{ state: { fields: { entity_id: {} } } }]);
const subscribeBootstrapIntegrations = vi.fn(async () => [
  { zwave_js: 12.8, mqtt: 12.5 },
  null,
  { done: 0, invalid_negative: -1, invalid_text: "no" },
  [],
]);

vi.mock("../src/api/websocket.js", () => ({
  HomeAssistantWebSocketClient: vi.fn().mockImplementation(function () {
    return { close, subscribeEntities, subscribeAutomationPlatforms, subscribeBootstrapIntegrations };
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

describe("websocket optimized observation commands", () => {
  const output: string[] = [];
  const originalLog = console.log;

  beforeEach(() => {
    output.length = 0;
    console.log = (message: string) => output.push(message);
    close.mockClear();
    subscribeEntities.mockClear();
    subscribeAutomationPlatforms.mockClear();
    subscribeBootstrapIntegrations.mockClear();
  });

  afterEach(() => {
    console.log = originalLog;
  });

  it("normalizes filtered entity snapshots and every delta kind", async () => {
    await createWebsocketCommand().parseAsync([
      "observe-entities",
      "--entity-id", "light.kitchen,sensor.temp",
      "--domain", "light,sensor",
      "--exclude-entity-id", "light.hidden",
      "--exclude-domain", "camera",
      "--wait-ms", "20",
      "--max-events", "4",
    ], { from: "user" });

    expect(subscribeEntities).toHaveBeenCalledWith({
      entityIds: ["light.kitchen", "sensor.temp"],
      includeDomains: ["light", "sensor"],
      excludeEntityIds: ["light.hidden"],
      excludeDomains: ["camera"],
      waitMs: 20,
      maxEvents: 5,
    });
    const result = JSON.parse(output.join("\n"));
    expect(result.initial).toEqual([
      expect.objectContaining({ entity_id: "light.kitchen", last_updated: 1 }),
      expect.objectContaining({ entity_id: "sensor.temp", last_updated: 3 }),
    ]);
    expect(result.changes).toEqual([
      expect.objectContaining({ kind: "changed", entity_id: "light.kitchen" }),
      { kind: "changed", entity_id: "sensor.temp", set: {}, remove: {} },
      expect.objectContaining({ kind: "added", entity_id: "switch.new" }),
      { kind: "removed", entity_id: "sensor.temp" },
    ]);
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("can omit the initial snapshot and uses command defaults", async () => {
    subscribeEntities.mockResolvedValueOnce([{ a: {} }]);
    await createWebsocketCommand().parseAsync(["observe-entities", "--no-initial"], { from: "user" });

    expect(subscribeEntities).toHaveBeenCalledWith({
      entityIds: [],
      includeDomains: [],
      excludeEntityIds: [],
      excludeDomains: [],
      waitMs: 5000,
      maxEvents: 11,
    });
    expect(JSON.parse(output.join("\n"))).toEqual({
      subscription: "entities",
      initial_count: 0,
      change_count: 0,
      changes: [],
    });
  });

  it("merges trigger and condition platform catalog events", async () => {
    await createWebsocketCommand().parseAsync([
      "automation-platforms", "--wait-ms", "25", "--max-events", "2",
    ], { from: "user" });

    expect(subscribeAutomationPlatforms).toHaveBeenNthCalledWith(1, {
      kind: "trigger", waitMs: 25, maxEvents: 2,
    });
    expect(subscribeAutomationPlatforms).toHaveBeenNthCalledWith(2, {
      kind: "condition", waitMs: 25, maxEvents: 2,
    });
    expect(JSON.parse(output.join("\n"))).toEqual({
      subscription: "automation_platforms",
      triggers: { state: { fields: { entity_id: {} } }, event: { fields: { event_type: {} } } },
      conditions: { state: { fields: { entity_id: {} } } },
    });
  });

  it.each(["trigger", "condition"])("supports a single %s platform catalog", async (kind) => {
    await createWebsocketCommand().parseAsync([
      "automation-platforms", "--kind", kind,
    ], { from: "user" });
    expect(subscribeAutomationPlatforms).toHaveBeenCalledTimes(1);
    expect(subscribeAutomationPlatforms).toHaveBeenCalledWith({ kind, waitMs: 100, maxEvents: 1 });
  });

  it("rejects an unknown platform kind before connecting", async () => {
    await expect(createWebsocketCommand().parseAsync([
      "automation-platforms", "--kind", "service",
    ], { from: "user" })).rejects.toThrow("Platform kind must be trigger, condition, or all");
    expect(subscribeAutomationPlatforms).not.toHaveBeenCalled();
  });

  it("normalizes and bounds bootstrap integration timing snapshots", async () => {
    await createWebsocketCommand().parseAsync([
      "bootstrap-integrations", "--wait-ms", "25", "--max-events", "4", "--limit", "2",
    ], { from: "user" });

    expect(subscribeBootstrapIntegrations).toHaveBeenCalledWith({ waitMs: 25, maxEvents: 4 });
    expect(JSON.parse(output.join("\n"))).toEqual({
      subscription: "bootstrap_integrations",
      event_count: 4,
      count: 3,
      returned_count: 2,
      truncated: true,
      pending_integrations: [
        { snapshot: 1, domain: "mqtt", elapsed_seconds: 12.5 },
        { snapshot: 1, domain: "zwave_js", elapsed_seconds: 12.8 },
      ],
    });
    expect(close).toHaveBeenCalledOnce();
  });

  it("supports count-only bootstrap output with default collection bounds", async () => {
    await createWebsocketCommand().parseAsync([
      "bootstrap-integrations", "--count", "--limit", "invalid",
    ], { from: "user" });
    expect(subscribeBootstrapIntegrations).toHaveBeenCalledWith({ waitMs: 5000, maxEvents: 10 });
    expect(JSON.parse(output.join("\n"))).toEqual({
      subscription: "bootstrap_integrations",
      event_count: 4,
      count: 3,
    });
  });

  it.each(["--wait-ms", "--max-events"])("rejects invalid bootstrap bound %s before connecting", async (flag) => {
    await expect(createWebsocketCommand().parseAsync([
      "bootstrap-integrations", flag, "0",
    ], { from: "user" })).rejects.toThrow("Must be a positive integer");
    expect(subscribeBootstrapIntegrations).not.toHaveBeenCalled();
  });
});
