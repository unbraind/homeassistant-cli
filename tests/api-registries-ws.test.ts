import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { WebSocketRegistryClient } from "../src/api/registries.js";
import type { Config } from "../src/types/options.js";

// Mock the WebSocket client used internally
const mockCall = vi.fn();
const mockClose = vi.fn(async () => undefined);

vi.mock("../src/api/websocket.js", () => ({
  HomeAssistantWebSocketClient: vi.fn().mockImplementation(() => ({
    call: mockCall,
    close: mockClose,
  })),
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

  describe("getDeviceRegistry", () => {
    it("fetches device registry via WebSocket", async () => {
      mockCall.mockResolvedValueOnce(sampleDevices);
      const result = await client.getDeviceRegistry();
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("Hue Bridge");
      expect(mockCall).toHaveBeenCalledWith("config/device_registry/list");
    });
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
