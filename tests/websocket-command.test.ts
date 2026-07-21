import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createWebsocketCommand } from "../src/commands/websocket.js";

const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

const connect = vi.fn(async () => undefined);
const close = vi.fn(async () => undefined);
const call = vi.fn(async () => ({ ok: true }));
const subscribeEvents = vi.fn(async () => [{ event_type: "state_changed" }]);

vi.mock("../src/api/websocket.js", () => ({
  HomeAssistantWebSocketClient: vi.fn().mockImplementation(function () { return {
    connect,
    close,
    call,
    subscribeEvents,
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

  it("supports a generic call without a payload", async () => {
    await createWebsocketCommand().parseAsync(["call", "-T", "get_states"], { from: "user" });
    expect(call).toHaveBeenCalledWith("get_states", undefined);
  });

  it("shows help when no root websocket operation is supplied", async () => {
    await createWebsocketCommand().parseAsync([], { from: "user" });
    expect(exitSpy).toHaveBeenCalled();
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

  it("uses safe subscription defaults for invalid numeric options", async () => {
    await createWebsocketCommand().parseAsync([
      "subscribe", "--wait-ms", "invalid", "--max-events", "0",
    ], { from: "user" });
    expect(subscribeEvents).toHaveBeenCalledWith({ waitMs: 5000, maxEvents: 10 });
  });

  it("supports websocket status metadata", async () => {
    call.mockImplementation(async (type: string) => {
      if (type === "get_config") {
        return { version: "2026.1.3", location_name: "Home" };
      }
      if (type === "auth/current_user") {
        return { id: "u1", name: "Steve", is_admin: true };
      }
      return { ok: true };
    });

    const cmd = createWebsocketCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["status"], { from: "user" });

    console.log = originalLog;
    expect(connect).toHaveBeenCalledTimes(1);
    expect(call).toHaveBeenCalledWith("get_config");
    expect(call).toHaveBeenCalledWith("auth/current_user");
    expect(close).toHaveBeenCalledTimes(1);

    const parsed = JSON.parse(output.join("\n"));
    expect(parsed.connected).toBe(true);
    expect(parsed.auth).toBe("ok");
    expect(parsed.websocket.config.version).toBe("2026.1.3");
    expect(parsed.websocket.current_user.name).toBe("Steve");
  });

  it("supports target extract helper", async () => {
    call.mockResolvedValueOnce({
      referenced_entities: ["light.kitchen"],
      referenced_devices: ["abc123"],
      referenced_areas: ["kitchen"],
      missing_floors: [],
      missing_labels: [],
    });

    const cmd = createWebsocketCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["target", "extract", "--entity-id", "light.kitchen"], { from: "user" });

    console.log = originalLog;
    expect(call).toHaveBeenCalledWith("extract_from_target", {
      target: { entity_id: ["light.kitchen"] },
      expand_group: false,
    });

    const parsed = JSON.parse(output.join("\n"));
    expect(parsed.target.entity_id).toEqual(["light.kitchen"]);
    expect(parsed.result.referenced_entities).toEqual(["light.kitchen"]);
  });

  it("requires a selector for every target helper", async () => {
    const cmd = createWebsocketCommand();

    await expect(cmd.parseAsync(["target", "extract"], { from: "user" }))
      .rejects.toThrow("At least one target selector is required");
    expect(call).not.toHaveBeenCalled();
  });

  it.each([
    ["triggers", "get_triggers_for_target"],
    ["conditions", "get_conditions_for_target"],
  ])("supports target %s discovery", async (subcommand, type) => {
    call.mockResolvedValueOnce(["light.turned_on"]);
    const cmd = createWebsocketCommand();

    await cmd.parseAsync(["target", subcommand, "--entity-id", "light.kitchen"], { from: "user" });

    expect(call).toHaveBeenCalledWith(type, {
      target: { entity_id: ["light.kitchen"] },
      expand_group: true,
    });
  });

  it("disables group expansion for target discovery when requested", async () => {
    call.mockResolvedValueOnce([]);
    await createWebsocketCommand().parseAsync([
      "target", "services", "--entity-id", "group.all_lights", "--no-expand-group",
    ], { from: "user" });
    expect(call).toHaveBeenCalledWith("get_services_for_target", {
      target: { entity_id: ["group.all_lights"] }, expand_group: false,
    });
  });

  it("enables group expansion for target extraction when requested", async () => {
    call.mockResolvedValueOnce({});
    await createWebsocketCommand().parseAsync([
      "target", "extract", "--entity-id", "group.all_lights", "--expand-group",
    ], { from: "user" });
    expect(call).toHaveBeenCalledWith("extract_from_target", {
      target: { entity_id: ["group.all_lights"] }, expand_group: true,
    });
  });

  it("supports target services helper with mixed selectors", async () => {
    call.mockResolvedValueOnce(["light.turn_on", "light.turn_off"]);

    const cmd = createWebsocketCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(
      ["target", "services", "--area-id", "kitchen,living_room", "--label-id", "lighting"],
      { from: "user" }
    );

    console.log = originalLog;
    expect(call).toHaveBeenCalledWith("get_services_for_target", {
      target: { area_id: ["kitchen", "living_room"], label_id: ["lighting"] },
      expand_group: true,
    });

    const parsed = JSON.parse(output.join("\n"));
    expect(parsed.target.area_id).toEqual(["kitchen", "living_room"]);
    expect(parsed.result).toEqual(["light.turn_on", "light.turn_off"]);
  });

  it("supports target related helper", async () => {
    call
      .mockResolvedValueOnce({
        referenced_entities: ["light.kitchen"],
        referenced_devices: ["dev1"],
        referenced_areas: ["kitchen"],
      })
      .mockResolvedValueOnce({
        "light.kitchen": { device_id: "dev1", area_id: "kitchen", labels: ["lighting"] },
      })
      .mockResolvedValueOnce([{ id: "dev1", area_id: "kitchen" }, { id: "other" }])
      .mockResolvedValueOnce([
        { area_id: "kitchen", floor_id: "ground" },
        { area_id: "other" },
      ])
      .mockResolvedValueOnce([{ floor_id: "ground" }, { floor_id: "other" }])
      .mockResolvedValueOnce([{ label_id: "lighting" }, { label_id: "other" }]);

    const cmd = createWebsocketCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["target", "related", "--entity-id", "light.kitchen"], { from: "user" });

    console.log = originalLog;
    expect(call).toHaveBeenNthCalledWith(1, "extract_from_target", {
      target: { entity_id: ["light.kitchen"] },
      expand_group: false,
    });
    expect(call).toHaveBeenNthCalledWith(2, "config/entity_registry/get_entries", { entity_ids: ["light.kitchen"] });
    expect(call).toHaveBeenNthCalledWith(3, "config/device_registry/list");
    expect(call).toHaveBeenNthCalledWith(4, "config/area_registry/list");
    expect(call).toHaveBeenNthCalledWith(5, "config/floor_registry/list");
    expect(call).toHaveBeenNthCalledWith(6, "config/label_registry/list");

    const parsed = JSON.parse(output.join("\n"));
    expect(parsed.related.entities[0].entity_id).toBe("light.kitchen");
    expect(parsed.related.devices[0].id).toBe("dev1");
    expect(parsed.related.devices).toHaveLength(1);
    expect(parsed.related.areas).toHaveLength(1);
    expect(parsed.related.floors).toHaveLength(1);
    expect(parsed.related.labels).toHaveLength(1);
  });

  it("supports legacy extracted keys and explicit floor/label selectors", async () => {
    call
      .mockResolvedValueOnce({
        entity_ids: ["light.kitchen"],
        device_ids: ["dev1"],
        area_ids: ["kitchen"],
        floor_ids: ["ground"],
        label_ids: ["lighting"],
      })
      .mockResolvedValueOnce([{ entity_id: "light.kitchen" }, null])
      .mockResolvedValueOnce([{ device_id: "dev1" }, null])
      .mockResolvedValueOnce([{ id: "kitchen" }, null])
      .mockResolvedValueOnce([{ id: "ground" }, null])
      .mockResolvedValueOnce([{ id: "lighting" }, null]);
    const cmd = createWebsocketCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync([
      "target", "related",
      "--entity-id", "light.kitchen",
      "--device-id", "dev1",
      "--area-id", "kitchen",
      "--floor-id", "ground",
      "--label-id", "lighting",
    ], { from: "user" });

    console.log = originalLog;
    const parsed = JSON.parse(output.join("\n"));
    expect(parsed.related.entities).toHaveLength(1);
    expect(parsed.related.devices).toHaveLength(1);
    expect(parsed.related.areas).toHaveLength(1);
    expect(parsed.related.floors).toHaveLength(1);
    expect(parsed.related.labels).toHaveLength(1);
  });

  it("normalizes malformed registry payloads to empty related collections", async () => {
    call
      .mockResolvedValueOnce({ referenced_entities: ["light.missing", 4] })
      .mockResolvedValueOnce({ "light.missing": null });
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (message: string) => output.push(message);
    await createWebsocketCommand().parseAsync([
      "target", "related", "--entity-id", "light.missing",
    ], { from: "user" });
    console.log = originalLog;
    expect((JSON.parse(output.join("\n")) as { related: Record<string, unknown[]> }).related).toEqual({
      entities: [], devices: [], areas: [], floors: [], labels: [],
    });
  });

  it("normalizes a primitive entity-registry response", async () => {
    call
      .mockResolvedValueOnce({ referenced_entities: ["light.missing"] })
      .mockResolvedValueOnce("invalid registry response");
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (message: string) => output.push(message);
    await createWebsocketCommand().parseAsync([
      "target", "related", "--entity-id", "light.missing",
    ], { from: "user" });
    console.log = originalLog;
    expect((JSON.parse(output.join("\n")) as { related: { entities: unknown[] } }).related.entities).toEqual([]);
  });

  it("accepts whitespace and ignores empty CSV selector elements", async () => {
    call.mockResolvedValueOnce({});
    await createWebsocketCommand().parseAsync([
      "target", "extract", "--device-id", " dev1, ,dev2 ",
    ], { from: "user" });
    expect(call).toHaveBeenCalledWith("extract_from_target", {
      target: { device_id: ["dev1", "dev2"] }, expand_group: false,
    });
  });

  it("resolves related registries without an entity lookup for non-entity targets", async () => {
    call
      .mockResolvedValueOnce({})
      .mockResolvedValueOnce([{ id: "dev1" }]);
    await createWebsocketCommand().parseAsync([
      "target", "related", "--device-id", "dev1",
    ], { from: "user" });
    expect(call).not.toHaveBeenCalledWith("config/entity_registry/get_entries", expect.anything());
    expect(call).toHaveBeenCalledWith("config/device_registry/list");
  });
});
