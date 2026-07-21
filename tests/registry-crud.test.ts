import { describe, it, expect, vi, beforeEach } from "vitest";
import { RegistryCrudClient } from "../src/api/registries-crud.js";
import type { Config } from "../src/types/options.js";

const { mockCall, mockClose } = vi.hoisted(() => ({
  mockCall: vi.fn(),
  mockClose: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("../src/api/websocket.js", () => ({
  HomeAssistantWebSocketClient: vi.fn().mockImplementation(function () { return {
    call: mockCall,
    close: mockClose,
  }; }),
}));

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
    mockCall.mockReset();
    mockClose.mockReset();
    mockClose.mockResolvedValue(undefined);
  });

  describe("Area operations", () => {
    it("should create an area", async () => {
      mockCall.mockResolvedValueOnce({ area_id: "test_area", name: "Living Room" });
      const result = await client.createArea({ name: "Living Room", icon: "mdi:sofa" });
      expect(result).toBeDefined();
      expect(result.area_id).toBe("test_area");
    });

    it("should update an area", async () => {
      mockCall.mockResolvedValueOnce({ area_id: "living_room", name: "Updated Living Room" });
      const result = await client.updateArea({
        area_id: "living_room",
        name: "Updated Living Room",
      });
      expect(result).toBeDefined();
    });

    it("should delete an area", async () => {
      mockCall.mockResolvedValueOnce(null);
      await expect(client.deleteArea("living_room")).resolves.toBeUndefined();
    });
  });

  describe("Floor operations", () => {
    it("should create a floor", async () => {
      mockCall.mockResolvedValueOnce({ floor_id: "test_floor", name: "Ground Floor" });
      const result = await client.createFloor({ name: "Ground Floor", level: 0 });
      expect(result).toBeDefined();
      expect(result.floor_id).toBe("test_floor");
    });

    it("should update a floor", async () => {
      mockCall.mockResolvedValueOnce({ floor_id: "ground_floor", name: "Updated Floor" });
      const result = await client.updateFloor({
        floor_id: "ground_floor",
        name: "Updated Floor",
      });
      expect(result).toBeDefined();
    });

    it("should delete a floor", async () => {
      mockCall.mockResolvedValueOnce(null);
      await expect(client.deleteFloor("ground_floor")).resolves.toBeUndefined();
    });
  });

  describe("Label operations", () => {
    it("should create a label", async () => {
      mockCall.mockResolvedValueOnce({ label_id: "test_label", name: "Important" });
      const result = await client.createLabel({ name: "Important", color: "red" });
      expect(result).toBeDefined();
      expect(result.label_id).toBe("test_label");
    });

    it("should update a label", async () => {
      mockCall.mockResolvedValueOnce({ label_id: "important", name: "Updated Label" });
      const result = await client.updateLabel({
        label_id: "important",
        name: "Updated Label",
      });
      expect(result).toBeDefined();
    });

    it("should delete a label", async () => {
      mockCall.mockResolvedValueOnce(null);
      await expect(client.deleteLabel("important")).resolves.toBeUndefined();
    });
  });

  it("updates entity and device registry entries", async () => {
    mockCall
      .mockResolvedValueOnce({ entity_id: "light.kitchen", name: "Kitchen" })
      .mockResolvedValueOnce({ id: "device-1", name: "Controller" });
    await expect(client.updateEntity({ entity_id: "light.kitchen", name: "Kitchen" }))
      .resolves.toEqual(expect.objectContaining({ entity_id: "light.kitchen" }));
    await expect(client.updateDevice({ device_id: "device-1", name: "Controller" }))
      .resolves.toEqual(expect.objectContaining({ id: "device-1" }));
    expect(mockClose).toHaveBeenCalledTimes(2);
  });
});
