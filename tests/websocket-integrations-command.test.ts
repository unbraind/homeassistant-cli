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

describe("typed WebSocket integration intelligence", () => {
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

  it("lists sorted manifests with server-side filters and bounded metadata", async () => {
    call.mockResolvedValue([
      { domain: "mqtt", name: "MQTT" },
      null,
      { domain: "light", name: "Light" },
    ]);

    await createWebsocketCommand().parseAsync([
      "integrations", "list", "--domain", "mqtt, light,mqtt", "--limit", "1",
    ], { from: "user" });

    expect(call).toHaveBeenCalledWith("manifest/list", { integrations: ["mqtt", "light"] });
    expect(JSON.parse(output[0] ?? "")).toEqual({
      count: 2,
      returned_count: 1,
      truncated: true,
      integrations: [{ domain: "light", name: "Light" }],
    });
    expect(close).toHaveBeenCalledOnce();
  });

  it("lists every manifest without a filter or implicit limit", async () => {
    call.mockResolvedValue([{ domain: "sun" }, { domain: "homeassistant" }]);

    await createWebsocketCommand().parseAsync(["integrations", "list", "--all"], { from: "user" });

    expect(call).toHaveBeenCalledWith("manifest/list", undefined);
    expect(JSON.parse(output[0] ?? "")).toEqual({
      count: 2,
      returned_count: 2,
      truncated: false,
      integrations: [{ domain: "homeassistant" }, { domain: "sun" }],
    });
  });

  it("supports count-only list responses and unexpected server shapes", async () => {
    call.mockResolvedValue("unexpected");
    await createWebsocketCommand().parseAsync(["integrations", "list", "--count"], { from: "user" });
    expect(JSON.parse(output[0] ?? "")).toEqual({ count: 0 });
  });

  it("rejects invalid domains before opening the WebSocket", async () => {
    await expect(createWebsocketCommand().parseAsync([
      "integrations", "list", "--domain", "Bad-Domain",
    ], { from: "user" })).rejects.toThrow("Invalid integration domain 'Bad-Domain'");
    expect(call).not.toHaveBeenCalled();
  });

  it("gets one integration manifest", async () => {
    call.mockResolvedValue({ domain: "mqtt", name: "MQTT" });
    await createWebsocketCommand().parseAsync(["integrations", "get", "mqtt"], { from: "user" });
    expect(call).toHaveBeenCalledWith("manifest/get", { integration: "mqtt" });
    expect(JSON.parse(output[0] ?? "").integration.domain).toBe("mqtt");
  });

  it("requires exactly one domain for singular integration commands", async () => {
    await expect(createWebsocketCommand().parseAsync([
      "integrations", "get", "mqtt,light",
    ], { from: "user" })).rejects.toThrow("Provide exactly one integration domain");
    await expect(createWebsocketCommand().parseAsync([
      "integrations", "wait", "",
    ], { from: "user" })).rejects.toThrow("Provide exactly one integration domain");
    expect(call).not.toHaveBeenCalled();
  });

  it("filters and sorts setup timing rows", async () => {
    call.mockResolvedValue([
      { domain: "sun", seconds: 0.3 },
      false,
      { domain: "mqtt", seconds: 1.2 },
    ]);
    await createWebsocketCommand().parseAsync([
      "integrations", "setup", "--domain", "sun,mqtt", "--all",
    ], { from: "user" });
    expect(call).toHaveBeenCalledWith("integration/setup_info", undefined);
    expect(JSON.parse(output[0] ?? "").integrations).toEqual([
      { domain: "mqtt", seconds: 1.2 },
      { domain: "sun", seconds: 0.3 },
    ]);
  });

  it("handles an unexpected setup response", async () => {
    call.mockResolvedValue(null);
    await createWebsocketCommand().parseAsync(["integrations", "setup", "--count"], { from: "user" });
    expect(JSON.parse(output[0] ?? "")).toEqual({ count: 0 });
  });

  it("normalizes integration descriptions from object maps", async () => {
    call.mockResolvedValue({
      core: {
        integration: {
          mqtt: { name: "MQTT", quality_scale: "platinum" },
          demo: "Demo description",
        },
        helper: { mqtt: { name: "MQTT helper" } },
        translated_name: ["mqtt", 42],
      },
      custom: {
        integration: { mqtt: { name: "Custom MQTT" } },
        helper: {},
      },
    });
    await createWebsocketCommand().parseAsync([
      "integrations", "descriptions", "--domain", "demo,mqtt", "--all",
    ], { from: "user" });
    expect(call).toHaveBeenCalledWith("integration/descriptions", undefined);
    expect(JSON.parse(output[0] ?? "").integrations).toEqual([
      { source: "core", category: "integration", translated_name: false, domain: "demo", value: "Demo description" },
      { source: "core", category: "helper", translated_name: true, domain: "mqtt", name: "MQTT helper" },
      { source: "core", category: "integration", translated_name: true, domain: "mqtt", name: "MQTT", quality_scale: "platinum" },
      { source: "custom", category: "integration", translated_name: true, domain: "mqtt", name: "Custom MQTT" },
    ]);
  });

  it("handles non-object integration descriptions", async () => {
    call.mockResolvedValue([]);
    await createWebsocketCommand().parseAsync([
      "integrations", "descriptions", "--count",
    ], { from: "user" });
    expect(JSON.parse(output[0] ?? "")).toEqual({ count: 0 });
  });

  it("reports integration readiness for object and scalar responses", async () => {
    call.mockResolvedValueOnce({ integration_loaded: true }).mockResolvedValueOnce(true);

    await createWebsocketCommand().parseAsync(["integrations", "wait", "homeassistant"], { from: "user" });
    expect(JSON.parse(output[0] ?? "")).toEqual({ domain: "homeassistant", integration_loaded: true });

    output = [];
    await createWebsocketCommand().parseAsync(["integrations", "wait", "sun"], { from: "user" });
    expect(JSON.parse(output[0] ?? "")).toEqual({ domain: "sun", result: true });
  });

  it("maps and filters entity source provenance", async () => {
    call.mockResolvedValue({
      "sun.sun": { domain: "sun" },
      "sensor.other": { domain: "demo" },
      "sensor.scalar": "demo",
    });
    await createWebsocketCommand().parseAsync([
      "entity-sources", "--domain", "sun,demo", "--entity-id", "sun.sun,sensor.other", "--all",
    ], { from: "user" });
    expect(call).toHaveBeenCalledWith("entity/source", undefined);
    expect(JSON.parse(output[0] ?? "").entities).toEqual([
      { entity_id: "sensor.other", domain: "demo" },
      { entity_id: "sun.sun", domain: "sun" },
    ]);
  });

  it("handles unexpected entity source output and validates limits", async () => {
    call.mockResolvedValue([]);
    await createWebsocketCommand().parseAsync(["entity-sources", "--count"], { from: "user" });
    expect(JSON.parse(output[0] ?? "")).toEqual({ count: 0 });

    await expect(createWebsocketCommand().parseAsync([
      "entity-sources", "--limit", "0",
    ], { from: "user" })).rejects.toThrow("Invalid limit '0'");
  });

  it("uses Home Assistant canonical slug generation", async () => {
    call.mockResolvedValue({ slug: "kitchen_light" });
    await createWebsocketCommand().parseAsync(["slugify", "Kitchen Light"], { from: "user" });
    expect(call).toHaveBeenCalledWith("slugify", { text: "Kitchen Light" });
    expect(JSON.parse(output[0] ?? "")).toEqual({
      input: "Kitchen Light",
      result: { slug: "kitchen_light" },
    });
  });

  it("rejects blank slug input and still closes after call failures", async () => {
    await expect(createWebsocketCommand().parseAsync(["slugify", "   "], { from: "user" }))
      .rejects.toThrow("Slug text must not be empty");
    expect(call).not.toHaveBeenCalled();

    call.mockRejectedValue(new Error("socket failed"));
    await expect(createWebsocketCommand().parseAsync(["integrations", "get", "mqtt"], { from: "user" }))
      .rejects.toThrow("socket failed");
    expect(close).toHaveBeenCalledOnce();
  });
});
