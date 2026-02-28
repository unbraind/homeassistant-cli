import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { RegistryApiClient } from "../src/api/registries.js";

const mockResponse = (data: unknown, status = 200) => ({
  statusCode: status,
  body: {
    text: () => Promise.resolve(JSON.stringify(data)),
  },
});

vi.mock("undici", () => ({
  request: vi.fn(),
}));

import { request } from "undici";

const mockRequest = request as ReturnType<typeof vi.fn>;

describe("RegistryApiClient", () => {
  let client: RegistryApiClient;

  beforeEach(() => {
    client = new RegistryApiClient({
      url: "http://localhost:8123",
      token: "test-token",
      outputFormat: "toon",
      timeout: 30000,
    });
    mockRequest.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getEntityRegistry", () => {
    it("should return entity registry entries", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([
          {
            entity_id: "light.living_room",
            name: "Living Room Light",
            platform: "hue",
            unique_id: "abc123",
            area_id: "area1",
            device_id: "device1",
            disabled_by: null,
            entity_category: null,
            hidden_by: null,
            icon: null,
            id: "entity1",
            has_entity_name: true,
            labels: [],
            categories: {},
            config_entry_id: null,
            options: {},
            original_name: "Living Room Light",
            translation_key: null,
          },
        ])
      );
      const result = await client.getEntityRegistry();
      expect(result).toHaveLength(1);
      expect(result[0]?.entity_id).toBe("light.living_room");
    });
  });

  describe("getDeviceRegistry", () => {
    it("should return device registry entries", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([
          {
            id: "device1",
            name: "Smart Bulb",
            name_by_user: null,
            manufacturer: "Philips",
            model: "Hue Bulb",
            sw_version: "1.0",
            hw_version: null,
            area_id: "area1",
            config_entries: ["entry1"],
            configuration_url: null,
            connections: [],
            created_at: 1234567890,
            disabled_by: null,
            entry_type: null,
            identifiers: [["hue", "abc123"]],
            labels: [],
            modified_at: 1234567890,
            primary_config_entry: "entry1",
            serial_number: null,
            via_device_id: null,
          },
        ])
      );
      const result = await client.getDeviceRegistry();
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("Smart Bulb");
    });
  });

  describe("getAreaRegistry", () => {
    it("should return area registry entries", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([
          {
            area_id: "area1",
            name: "Living Room",
            picture: null,
            icon: null,
            floor_id: null,
            labels: [],
            aliases: [],
            humidity_entity_id: null,
            temperature_entity_id: null,
            created_at: 1234567890,
            modified_at: 1234567890,
          },
        ])
      );
      const result = await client.getAreaRegistry();
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("Living Room");
    });
  });

  describe("getFloorRegistry", () => {
    it("should return floor registry entries", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([
          {
            floor_id: "floor1",
            name: "Ground Floor",
            icon: null,
            level: 0,
            aliases: [],
            created_at: 1234567890,
            modified_at: 1234567890,
          },
        ])
      );
      const result = await client.getFloorRegistry();
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("Ground Floor");
    });
  });

  describe("getLabelRegistry", () => {
    it("should return label registry entries", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([
          {
            label_id: "label1",
            name: "Important",
            icon: null,
            color: "red",
            description: null,
            created_at: 1234567890,
            modified_at: 1234567890,
          },
        ])
      );
      const result = await client.getLabelRegistry();
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("Important");
    });
  });

  describe("getCategoryRegistry", () => {
    it("should return category registry entries", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([
          {
            category_id: "cat1",
            name: "Lighting",
            icon: "mdi:lightbulb",
          },
        ])
      );
      const result = await client.getCategoryRegistry();
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("Lighting");
    });
  });
});
