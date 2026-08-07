import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WebSocketRegistryClient } from "../src/api/registries.js";
import type { Config } from "../src/types/options.js";

// Mock the WebSocket client used internally
const mockCall = vi.fn();
const mockClose = vi.fn(async () => undefined);

vi.mock("../src/api/websocket.js", () => ({
  HomeAssistantWebSocketClient: vi.fn().mockImplementation(function () { return {
    call: mockCall,
    close: mockClose,
  }; }),
}));

const baseConfig: Config = {
  url: "http://localhost:8123",
  token: "test-token",
  outputFormat: "toon",
  timeout: 5000,
  readOnly: false,
};

const sampleEntities = [
  { entity_id: "light.kitchen", name: "Kitchen Light", platform: "hue", area_id: "kitchen" },
  { entity_id: "switch.fan", name: "Fan", platform: "zha", area_id: null },
];

const sampleDisplayEntities = {
  entity_categories: { "0": "config", "1": "diagnostic" },
  entities: [
    { ei: "light.kitchen", pl: "hue", ai: "kitchen", di: "dev1", en: "Kitchen Light" },
    { ei: "switch.fan", pl: "zha" },
  ],
};

const sampleDevices = [
  { id: "dev1", name: "Hue Bridge", manufacturer: "Philips", model: "Bridge v2" },
];

const sampleAreas = [
  { area_id: "kitchen", name: "Kitchen", floor_id: "ground" },
  { area_id: "living", name: "Living Room", floor_id: "ground" },
];

const sampleFloors = [
  { floor_id: "ground", name: "Ground Floor", level: 0 },
];

const sampleLabels = [
  { label_id: "important", name: "Important", color: "red" },
];

const sampleCategories = [
  { category_id: "cat1", name: "Security", scope: "automation" },
];

describe("WebSocketRegistryClient", () => {
  let client: WebSocketRegistryClient;

  beforeEach(() => {
    client = new WebSocketRegistryClient(baseConfig);
    mockCall.mockReset();
    mockClose.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getEntityRegistry", () => {
    it("fetches entity registry via WebSocket", async () => {
      mockCall.mockResolvedValueOnce(sampleEntities);
      const result = await client.getEntityRegistry();
      expect(result).toHaveLength(2);
      expect(result[0]?.entity_id).toBe("light.kitchen");
      expect(mockCall).toHaveBeenCalledWith("config/entity_registry/list");
    });
  });

  describe("getEntityRegistryForDisplay", () => {
    it("fetches the compact entity registry display contract via WebSocket", async () => {
      mockCall.mockResolvedValueOnce(sampleDisplayEntities);
      const result = await client.getEntityRegistryForDisplay();
      expect(result.entities).toHaveLength(2);
      expect(result.entity_categories).toEqual({ "0": "config", "1": "diagnostic" });
      expect(mockCall).toHaveBeenCalledWith("config/entity_registry/list_for_display");
    });
  });

  describe("getDeviceRegistry", () => {
    it("fetches device registry via WebSocket", async () => {
      mockCall.mockResolvedValueOnce(sampleDevices);
      const result = await client.getDeviceRegistry();
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("Hue Bridge");
      expect(mockCall).toHaveBeenCalledWith("config/device_registry/list");
    });
  });

  it("fetches current-Core device topology contracts", async () => {
    mockCall
      .mockResolvedValueOnce({ legacy: { split_ids: ["device-b", "device-a"], primary_id: "device-a" } })
      .mockResolvedValueOnce({ linked_devices: ["device-c"] });

    await expect(client.getCompositeDeviceSplits()).resolves.toEqual({
      legacy: { split_ids: ["device-b", "device-a"], primary_id: "device-a" },
    });
    await expect(client.getLinkedDevices("device-a")).resolves.toEqual({ linked_devices: ["device-c"] });
    expect(mockCall).toHaveBeenNthCalledWith(1, "config/device_registry/list_composite_splits");
    expect(mockCall).toHaveBeenNthCalledWith(2, "config/device_registry/list_linked_devices", {
      device_id: "device-a",
    });
  });

  it("fetches automatic entity IDs and entity-ID settings", async () => {
    mockCall
      .mockResolvedValueOnce({ "light.custom": "light.kitchen" })
      .mockResolvedValueOnce({ entity_id_parts: null })
      .mockResolvedValueOnce({ entity_id_parts: ["device", "entity"] });

    await expect(client.getAutomaticEntityIds(["light.custom"])).resolves.toEqual({
      "light.custom": "light.kitchen",
    });
    await expect(client.getEntityIdSettings()).resolves.toEqual({ entity_id_parts: null });
    await expect(client.updateEntityIdSettings(["device", "entity"])).resolves.toEqual({
      entity_id_parts: ["device", "entity"],
    });
    expect(mockCall).toHaveBeenNthCalledWith(1, "config/entity_registry/get_automatic_entity_ids", {
      entity_ids: ["light.custom"],
    });
    expect(mockCall).toHaveBeenNthCalledWith(2, "config/entity_registry/settings/get");
    expect(mockCall).toHaveBeenNthCalledWith(3, "config/entity_registry/settings/update", {
      entity_id_parts: ["device", "entity"],
    });
  });

  it("blocks entity-ID settings mutations in read-only mode before network I/O", async () => {
    const readOnlyClient = new WebSocketRegistryClient({ ...baseConfig, readOnly: true });
    await expect(readOnlyClient.updateEntityIdSettings(null)).rejects.toThrow("Read-only mode blocked");
    expect(mockCall).not.toHaveBeenCalled();
  });

  describe("getAreaRegistry", () => {
    it("fetches area registry via WebSocket", async () => {
      mockCall.mockResolvedValueOnce(sampleAreas);
      const result = await client.getAreaRegistry();
      expect(result).toHaveLength(2);
      expect(result[0]?.name).toBe("Kitchen");
      expect(mockCall).toHaveBeenCalledWith("config/area_registry/list");
    });
  });

  describe("getFloorRegistry", () => {
    it("fetches floor registry via WebSocket", async () => {
      mockCall.mockResolvedValueOnce(sampleFloors);
      const result = await client.getFloorRegistry();
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("Ground Floor");
      expect(mockCall).toHaveBeenCalledWith("config/floor_registry/list");
    });
  });

  describe("getLabelRegistry", () => {
    it("fetches label registry via WebSocket", async () => {
      mockCall.mockResolvedValueOnce(sampleLabels);
      const result = await client.getLabelRegistry();
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("Important");
      expect(mockCall).toHaveBeenCalledWith("config/label_registry/list");
    });
  });

  describe("getCategoryRegistry", () => {
    it("fetches category registry via WebSocket", async () => {
      mockCall.mockResolvedValueOnce(sampleCategories);
      const result = await client.getCategoryRegistry();
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("Security");
      expect(mockCall).toHaveBeenCalledWith("config/category_registry/list");
    });
  });

  describe("close", () => {
    it("closes the WebSocket connection", async () => {
      await client.close();
      expect(mockClose).toHaveBeenCalled();
    });
  });
});
