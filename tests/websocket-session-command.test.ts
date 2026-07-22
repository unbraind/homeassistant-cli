import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWebsocketCommand } from "../src/commands/websocket.js";

const close = vi.fn(async () => undefined);
const call = vi.fn(async () => ({ ok: true }));
let readOnly = false;

vi.mock("../src/api/websocket.js", () => ({
  HomeAssistantWebSocketClient: vi.fn().mockImplementation(function () {
    return { close, call };
  }),
}));

vi.mock("../src/config/loader.js", () => ({
  getConfig: vi.fn(() => ({
    url: "http://localhost:8123",
    token: "test-token",
    outputFormat: "json",
    timeout: 30000,
    readOnly,
  })),
}));

describe("typed websocket session commands", () => {
  const output: string[] = [];
  const originalLog = console.log;

  beforeEach(() => {
    call.mockReset();
    call.mockResolvedValue({ ok: true });
    close.mockClear();
    output.length = 0;
    readOnly = false;
    console.log = (message: string) => output.push(message);
  });

  afterEach(() => {
    console.log = originalLog;
  });

  it.each([
    ["panels", "get_panels"],
    ["ping", "ping"],
  ])("supports the %s operation", async (command, type) => {
    await createWebsocketCommand().parseAsync([command], { from: "user" });
    expect(call).toHaveBeenCalledWith(type, undefined);
    expect(close).toHaveBeenCalledOnce();
  });

  it("creates signed paths with validated expiry", async () => {
    await createWebsocketCommand().parseAsync([
      "sign-path", "--path", "/api/states", "--expires", "20",
    ], { from: "user" });
    expect(call).toHaveBeenCalledWith("auth/sign_path", { path: "/api/states", expires: 20 });
  });

  it("lets Home Assistant apply the default signed-path expiry", async () => {
    await createWebsocketCommand().parseAsync([
      "sign-path", "--path", "/api/states",
    ], { from: "user" });
    expect(call).toHaveBeenCalledWith("auth/sign_path", { path: "/api/states" });
  });

  it.each([
    ["relative", "Signed path must begin with '/'"],
    ["/api/states", "Invalid limit '0'. Must be a positive integer.", "0"],
  ])("rejects an invalid signed path option", async (path, message, expires) => {
    const args = ["sign-path", "--path", path];
    if (expires) args.push("--expires", expires);
    await expect(createWebsocketCommand().parseAsync(args, { from: "user" }))
      .rejects.toThrow(message);
    expect(call).not.toHaveBeenCalled();
  });

  it("normalizes and filters exposure rows", async () => {
    call.mockResolvedValue({
      exposed_entities: {
        "light.kitchen": { conversation: true, "cloud.alexa": false },
        "sensor.outdoor": { conversation: false },
      },
    });
    await createWebsocketCommand().parseAsync([
      "exposure", "list", "--entity-id", "light.kitchen", "--assistant", "conversation", "--limit", "1",
    ], { from: "user" });
    expect(JSON.parse(output.join("\n"))).toEqual({
      count: 1,
      exposures: [{ entity_id: "light.kitchen", assistant: "conversation", exposed: true }],
    });
  });

  it("supports count-only exposure output", async () => {
    call.mockResolvedValue({ exposed_entities: { "light.kitchen": { conversation: true } } });
    await createWebsocketCommand().parseAsync(["exposure", "list", "--count"], { from: "user" });
    expect(JSON.parse(output.join("\n"))).toEqual({ count: 1 });
  });

  it.each([null, [], { exposed_entities: null }])("handles an empty exposure response", async (result) => {
    call.mockResolvedValue(result);
    await createWebsocketCommand().parseAsync(["exposure", "list"], { from: "user" });
    expect(JSON.parse(output.join("\n"))).toEqual({ count: 0, exposures: [] });
  });

  it.each([
    ["enable", true],
    ["disable", false],
  ])("supports exposure %s mutations", async (command, exposed) => {
    await createWebsocketCommand().parseAsync([
      "exposure", command, "--entity-id", "light.kitchen,switch.fan", "--assistant", "conversation,cloud.alexa",
    ], { from: "user" });
    expect(call).toHaveBeenCalledWith("homeassistant/expose_entity", {
      assistants: ["conversation", "cloud.alexa"],
      entity_ids: ["light.kitchen", "switch.fan"],
      should_expose: exposed,
    });
  });

  it("blocks exposure mutations in read-only mode", async () => {
    readOnly = true;
    await expect(createWebsocketCommand().parseAsync([
      "exposure", "enable", "--entity-id", "light.kitchen", "--assistant", "conversation",
    ], { from: "user" })).rejects.toThrow("Read-only mode blocks entity exposure changes");
    expect(call).not.toHaveBeenCalled();
  });

  it("rejects empty CSV exposure selectors", async () => {
    await expect(createWebsocketCommand().parseAsync([
      "exposure", "enable", "--entity-id", ",", "--assistant", "conversation",
    ], { from: "user" })).rejects.toThrow("At least one entity ID and assistant ID are required");
    expect(call).not.toHaveBeenCalled();
  });

  it("rejects unsupported assistant IDs", async () => {
    await expect(createWebsocketCommand().parseAsync([
      "exposure", "enable", "--entity-id", "light.kitchen", "--assistant", "unknown",
    ], { from: "user" })).rejects.toThrow("Unsupported assistant ID: unknown");
    expect(call).not.toHaveBeenCalled();
  });
});
