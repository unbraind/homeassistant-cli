import { describe, it, expect, vi, beforeEach } from "vitest";
import { RegistryCrudClient } from "../src/api/registries-crud.js";
import type { Config } from "../src/types/options.js";

vi.mock("undici", () => ({
  request: vi.fn(),
}));

import { request } from "undici";
const mockRequest = request as ReturnType<typeof vi.fn>;

const mockResponse = (data: unknown, status = 200) => ({
  statusCode: status,
  body: {
    text: () => Promise.resolve(data != null ? JSON.stringify(data) : ""),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  },
});

const config: Config = {
  url: "http://localhost:8123",
  token: "test-token",
  outputFormat: "toon",
  timeout: 30000,
  readOnly: false,
};

describe("RegistryCrudClient", () => {
  let client: RegistryCrudClient;

  beforeEach(() => {
    client = new RegistryCrudClient(config);
    mockRequest.mockReset();
  });

  describe("Area operations", () => {
    it("should create an area", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({ area_id: "test_area", name: "Living Room" })
      );
      const result = await client.createArea({ name: "Living Room", icon: "mdi:sofa" });
      expect(result).toBeDefined();
      expect(result.area_id).toBe("test_area");
    });

    it("should update an area", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({ area_id: "living_room", name: "Updated Living Room" })
      );
      const result = await client.updateArea({
        area_id: "living_room",
        name: "Updated Living Room",
      });
      expect(result).toBeDefined();
    });

    it("should delete an area", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse(null));
      await expect(client.deleteArea("living_room")).resolves.toBeUndefined();
    });
  });

  describe("Floor operations", () => {
    it("should create a floor", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({ floor_id: "test_floor", name: "Ground Floor" })
      );
      const result = await client.createFloor({ name: "Ground Floor", level: 0 });
      expect(result).toBeDefined();
      expect(result.floor_id).toBe("test_floor");
    });

    it("should update a floor", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({ floor_id: "ground_floor", name: "Updated Floor" })
      );
      const result = await client.updateFloor({
        floor_id: "ground_floor",
        name: "Updated Floor",
      });
      expect(result).toBeDefined();
    });

    it("should delete a floor", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse(null));
      await expect(client.deleteFloor("ground_floor")).resolves.toBeUndefined();
    });
  });

  describe("Label operations", () => {
    it("should create a label", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({ label_id: "test_label", name: "Important" })
      );
      const result = await client.createLabel({ name: "Important", color: "red" });
      expect(result).toBeDefined();
      expect(result.label_id).toBe("test_label");
    });

    it("should update a label", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({ label_id: "important", name: "Updated Label" })
      );
      const result = await client.updateLabel({
        label_id: "important",
        name: "Updated Label",
      });
      expect(result).toBeDefined();
    });

    it("should delete a label", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse(null));
      await expect(client.deleteLabel("important")).resolves.toBeUndefined();
    });
  });
});
