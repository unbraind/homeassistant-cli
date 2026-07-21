import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SystemApiClient } from "../src/api/system.js";

vi.mock("undici", () => ({
  FormData: globalThis.FormData,
  request: vi.fn(),
}));

import { request } from "undici";

const mockRequest = request as ReturnType<typeof vi.fn>;

const mockResponse = (data: unknown, status = 200) => ({
  statusCode: status,
  body: {
    text: () => Promise.resolve(JSON.stringify(data)),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  },
});

describe("SystemApiClient extended", () => {
  let client: SystemApiClient;

  beforeEach(() => {
    client = new SystemApiClient({
      url: "http://localhost:8123",
      token: "test-token",
      outputFormat: "toon",
      timeout: 30000,
      readOnly: false,
    });
    mockRequest.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getPerson", () => {
    it("returns a single person by id", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({ id: "person1", name: "John", device_trackers: [] })
      );
      const result = await client.getPerson("person1");
      expect(result.name).toBe("John");
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining("/person/person1"),
        expect.any(Object)
      );
    });
  });

  describe("createPerson", () => {
    it("creates a person", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({ id: "new_person", name: "Alice", device_trackers: [] })
      );
      const result = await client.createPerson({ name: "Alice" });
      expect(result.name).toBe("Alice");
    });
  });

  describe("updatePerson", () => {
    it("updates a person", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({ id: "person1", name: "John Updated", device_trackers: [] })
      );
      const result = await client.updatePerson("person1", { name: "John Updated" });
      expect(result.name).toBe("John Updated");
    });
  });

  describe("deletePerson", () => {
    it("deletes a person", async () => {
      mockRequest.mockResolvedValueOnce({
        statusCode: 200,
        body: { text: () => Promise.resolve("") },
      });
      await client.deletePerson("person1");
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining("/person/person1"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  describe("getZone", () => {
    it("returns a single zone by id", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({ entity_id: "zone.home", name: "Home", latitude: 45.5, longitude: -122.6, radius: 100 })
      );
      const result = await client.getZone("home");
      expect(result.name).toBe("Home");
    });
  });

  describe("createZone", () => {
    it("creates a zone", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({ entity_id: "zone.work", name: "Work", latitude: 40.7, longitude: -73.9, radius: 50 })
      );
      const result = await client.createZone({ name: "Work", latitude: 40.7, longitude: -73.9, radius: 50 });
      expect(result.name).toBe("Work");
    });
  });

  describe("updateZone", () => {
    it("updates a zone", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({ entity_id: "zone.home", name: "Home Updated", latitude: 45.5, longitude: -122.6, radius: 150 })
      );
      const result = await client.updateZone("home", { radius: 150 });
      expect(result.radius).toBe(150);
    });
  });

  describe("deleteZone", () => {
    it("deletes a zone", async () => {
      mockRequest.mockResolvedValueOnce({
        statusCode: 200,
        body: { text: () => Promise.resolve("") },
      });
      await client.deleteZone("home");
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining("/zones/home"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  describe("uploadBackup", () => {
    it("uploads a backup file", async () => {
      const fakeBuffer = Buffer.from([0x50, 0x4b, 0x03, 0x04]);
      mockRequest.mockResolvedValueOnce({
        statusCode: 200,
        body: {
          text: () => Promise.resolve(JSON.stringify({ slug: "uploaded_backup", name: "Uploaded" })),
        },
      });
      const result = await client.uploadBackup(fakeBuffer, "backup.tar");
      expect(result).toBeDefined();
    });
  });
});
