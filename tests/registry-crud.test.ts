import { describe, it, expect, vi, beforeEach } from "vitest";
import { RegistryCrudClient } from "../src/api/registries-crud.js";
import type { Config } from "../src/types/options.js";

vi.mock("../src/api/client.js", () => {
  return {
    HomeAssistantClient: class {
      protected config: Config;
      
      constructor(config: Config) {
        this.config = config;
      }
      
      async request<T>(method: string, path: string, body?: unknown): Promise<T> {
        if (path.includes("/create") || path.includes("/update")) {
          return Promise.resolve({
            area_id: "test_area",
            floor_id: "test_floor",
            label_id: "test_label",
            name: "Test",
          } as T);
        }
        return Promise.resolve(undefined as T);
      }
    },
  };
});

describe("RegistryCrudClient", () => {
  let client: RegistryCrudClient;
  const config: Config = {
    url: "http://localhost:8123",
    token: "test-token",
    outputFormat: "toon",
    timeout: 30000,
    readOnly: false,
  };

  beforeEach(() => {
    client = new RegistryCrudClient(config);
  });

  describe("Area operations", () => {
    it("should create an area", async () => {
      const result = await client.createArea({
        name: "Living Room",
        icon: "mdi:sofa",
      });
      expect(result).toBeDefined();
      expect(result.area_id).toBe("test_area");
    });

    it("should update an area", async () => {
      const result = await client.updateArea({
        area_id: "living_room",
        name: "Updated Living Room",
      });
      expect(result).toBeDefined();
    });

    it("should delete an area", async () => {
      await expect(client.deleteArea("living_room")).resolves.toBeUndefined();
    });
  });

  describe("Floor operations", () => {
    it("should create a floor", async () => {
      const result = await client.createFloor({
        name: "Ground Floor",
        level: 0,
      });
      expect(result).toBeDefined();
      expect(result.floor_id).toBe("test_floor");
    });

    it("should update a floor", async () => {
      const result = await client.updateFloor({
        floor_id: "ground_floor",
        name: "Updated Floor",
      });
      expect(result).toBeDefined();
    });

    it("should delete a floor", async () => {
      await expect(client.deleteFloor("ground_floor")).resolves.toBeUndefined();
    });
  });

  describe("Label operations", () => {
    it("should create a label", async () => {
      const result = await client.createLabel({
        name: "Important",
        color: "red",
      });
      expect(result).toBeDefined();
      expect(result.label_id).toBe("test_label");
    });

    it("should update a label", async () => {
      const result = await client.updateLabel({
        label_id: "important",
        name: "Updated Label",
      });
      expect(result).toBeDefined();
    });

    it("should delete a label", async () => {
      await expect(client.deleteLabel("important")).resolves.toBeUndefined();
    });
  });
});
