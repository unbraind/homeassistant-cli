import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRegistriesCommand } from "../src/commands/registries.js";

const mocks = vi.hoisted(() => ({
  close: vi.fn(async () => undefined),
  getAutomaticEntityIds: vi.fn(),
  getCompositeDeviceSplits: vi.fn(),
  getEntityIdSettings: vi.fn(),
  getLinkedDevices: vi.fn(),
  updateEntityIdSettings: vi.fn(),
}));

vi.mock("../src/api/registries.js", () => ({
  WebSocketRegistryClient: vi.fn().mockImplementation(function () {
    return mocks;
  }),
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

describe("registry topology and entity-ID settings commands", () => {
  let output: string[];

  beforeEach(() => {
    output = [];
    vi.clearAllMocks();
    mocks.getAutomaticEntityIds.mockResolvedValue({});
    mocks.getCompositeDeviceSplits.mockResolvedValue({});
    mocks.getEntityIdSettings.mockResolvedValue({ entity_id_parts: null });
    mocks.getLinkedDevices.mockResolvedValue({ linked_devices: [] });
    mocks.updateEntityIdSettings.mockResolvedValue({ entity_id_parts: null });
    vi.spyOn(console, "log").mockImplementation((value: string) => output.push(value));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("normalizes and bounds composite device splits deterministically", async () => {
    mocks.getCompositeDeviceSplits.mockResolvedValue({
      legacy_b: { split_ids: ["device-z"], primary_id: null },
      legacy_a: { split_ids: ["device-b", "device-a"], primary_id: "device-a" },
    });

    await createRegistriesCommand().parseAsync(["composite-splits", "--limit", "1"], { from: "user" });

    expect(JSON.parse(output[0] ?? "")).toEqual({
      count: 2,
      returned_count: 1,
      truncated: true,
      composite_splits: [{
        composite_device_id: "legacy_a",
        primary_device_id: "device-a",
        split_device_ids: ["device-a", "device-b"],
      }],
    });
    expect(mocks.close).toHaveBeenCalledOnce();
  });

  it("supports composite split counts without parsing an irrelevant limit", async () => {
    mocks.getCompositeDeviceSplits.mockResolvedValue({ legacy: { split_ids: [], primary_id: null } });
    await createRegistriesCommand().parseAsync([
      "composite-splits", "--count", "--limit", "invalid",
    ], { from: "user" });
    expect(JSON.parse(output[0] ?? "")).toEqual({ count: 1 });
  });

  it("lists linked devices with source provenance and deterministic bounds", async () => {
    mocks.getLinkedDevices.mockResolvedValue({ linked_devices: ["device-z", "device-a"] });
    await createRegistriesCommand().parseAsync([
      "linked-devices", "device-source", "--all",
    ], { from: "user" });
    expect(mocks.getLinkedDevices).toHaveBeenCalledWith("device-source");
    expect(JSON.parse(output[0] ?? "")).toEqual({
      source_device_id: "device-source",
      count: 2,
      returned_count: 2,
      truncated: false,
      linked_devices: [{ device_id: "device-a" }, { device_id: "device-z" }],
    });
  });

  it("previews de-duplicated automatic entity IDs in requested order", async () => {
    mocks.getAutomaticEntityIds.mockResolvedValue({
      "light.custom": "light.kitchen",
      "sensor.unknown__value": null,
    });
    await createRegistriesCommand().parseAsync([
      "automatic-entity-ids", "light.custom,sensor.unknown__value", "light.custom",
    ], { from: "user" });
    expect(mocks.getAutomaticEntityIds).toHaveBeenCalledWith(["light.custom", "sensor.unknown__value"]);
    expect(JSON.parse(output[0] ?? "")).toEqual({
      count: 2,
      entity_ids: [
        { entity_id: "light.custom", automatic_entity_id: "light.kitchen" },
        { entity_id: "sensor.unknown__value", automatic_entity_id: null },
      ],
    });
  });

  it("rejects malformed or empty entity ID inputs before network I/O", async () => {
    for (const values of [
      ["Bad Value"],
      [","],
      ["_light.kitchen"],
      ["light.kitchen_"],
      ["light__zone.kitchen"],
      ["light._kitchen"],
    ]) {
      await expect(createRegistriesCommand().parseAsync([
        "automatic-entity-ids", ...values,
      ], { from: "user" })).rejects.toThrow();
    }
    expect(mocks.getAutomaticEntityIds).not.toHaveBeenCalled();
  });

  it("gets entity-ID settings with an explicit default-policy marker", async () => {
    await createRegistriesCommand().parseAsync(["entity-id-settings", "get"], { from: "user" });
    expect(JSON.parse(output[0] ?? "")).toEqual({ entity_id_parts: null, uses_default: true });
  });

  it("updates and resets validated entity-ID settings", async () => {
    mocks.updateEntityIdSettings
      .mockResolvedValueOnce({ entity_id_parts: ["floor", "device", "entity"] })
      .mockResolvedValueOnce({ entity_id_parts: null });

    await createRegistriesCommand().parseAsync([
      "entity-id-settings", "update", "--parts", "floor,device,entity",
    ], { from: "user" });
    expect(mocks.updateEntityIdSettings).toHaveBeenNthCalledWith(1, ["floor", "device", "entity"]);
    expect(JSON.parse(output[0] ?? "")).toEqual({
      entity_id_parts: ["floor", "device", "entity"],
      updated: true,
      uses_default: false,
    });

    output = [];
    await createRegistriesCommand().parseAsync([
      "entity-id-settings", "update", "--reset",
    ], { from: "user" });
    expect(mocks.updateEntityIdSettings).toHaveBeenNthCalledWith(2, null);
    expect(JSON.parse(output[0] ?? "")).toEqual({
      entity_id_parts: null,
      updated: true,
      uses_default: true,
    });
  });

  it("rejects ambiguous or invalid naming policies before network I/O", async () => {
    for (const args of [
      [],
      ["--parts", "device,entity", "--reset"],
      ["--parts", "device,entity,bad"],
      ["--parts", "device,entity,device"],
      ["--parts", "floor,entity"],
    ]) {
      await expect(createRegistriesCommand().parseAsync([
        "entity-id-settings", "update", ...args,
      ], { from: "user" })).rejects.toThrow();
    }
    expect(mocks.updateEntityIdSettings).not.toHaveBeenCalled();
  });

  it("closes the registry client when a current-Core command fails", async () => {
    mocks.getEntityIdSettings.mockRejectedValue(new Error("unknown_command"));
    await expect(createRegistriesCommand().parseAsync([
      "entity-id-settings", "get",
    ], { from: "user" })).rejects.toThrow("unknown_command");
    expect(mocks.close).toHaveBeenCalledOnce();
  });
});
