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
      entity_ids: ["light.kitchen"],
      device_ids: ["abc123"],
      area_ids: ["kitchen"],
      floor_ids: [],
      label_ids: [],
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
    expect(parsed.result.entity_ids).toEqual(["light.kitchen"]);
  });

  it("supports target services helper with mixed selectors", async () => {
    call.mockResolvedValueOnce({ light: { turn_on: {}, turn_off: {} } });

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
    });

    const parsed = JSON.parse(output.join("\n"));
    expect(parsed.target.area_id).toEqual(["kitchen", "living_room"]);
    expect(parsed.result.light.turn_on).toEqual({});
  });

  it("supports target related helper", async () => {
    call
      .mockResolvedValueOnce({
        entity_ids: ["light.kitchen"],
        device_ids: ["dev1"],
        area_ids: ["kitchen"],
        floor_ids: ["ground"],
        label_ids: ["lighting"],
      })
      .mockResolvedValueOnce([{ entity_id: "light.kitchen" }])
      .mockResolvedValueOnce([{ id: "dev1" }])
      .mockResolvedValueOnce([{ area_id: "kitchen" }])
      .mockResolvedValueOnce([{ floor_id: "ground" }])
      .mockResolvedValueOnce([{ label_id: "lighting" }]);

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
    expect(call).toHaveBeenNthCalledWith(3, "config/device_registry/list", { device_ids: ["dev1"] });
    expect(call).toHaveBeenNthCalledWith(4, "config/area_registry/list", { area_ids: ["kitchen"] });
    expect(call).toHaveBeenNthCalledWith(5, "config/floor_registry/list", { floor_ids: ["ground"] });
    expect(call).toHaveBeenNthCalledWith(6, "config/label_registry/list", { label_ids: ["lighting"] });

    const parsed = JSON.parse(output.join("\n"));
    expect(parsed.related.entities[0].entity_id).toBe("light.kitchen");
    expect(parsed.related.devices[0].id).toBe("dev1");
  });
});
