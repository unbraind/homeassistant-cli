import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SystemApiClient } from "../src/api/system.js";

const mockResponse = (data: unknown, status = 200) => ({
  statusCode: status,
  body: {
    text: () => Promise.resolve(JSON.stringify(data)),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  },
});

vi.mock("undici", () => ({
  request: vi.fn(),
}));

import { request } from "undici";

const mockRequest = request as ReturnType<typeof vi.fn>;

describe("SystemApiClient", () => {
  let client: SystemApiClient;

  beforeEach(() => {
    client = new SystemApiClient({
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

  describe("getPersons", () => {
    it("should return list of persons", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([
          { id: "person1", name: "John", device_trackers: [] },
          { id: "person2", name: "Jane", device_trackers: ["device_tracker.jane"] },
        ])
      );
      const result = await client.getPersons();
      expect(result).toHaveLength(2);
      expect(result[0]?.name).toBe("John");
      expect(result[1]?.name).toBe("Jane");
    });
  });

  describe("getZones", () => {
    it("should return list of zones", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([
          { 
            entity_id: "zone.home", 
            name: "Home", 
            latitude: 45.5, 
            longitude: -122.6, 
            radius: 100,
            passive: false 
          },
        ])
      );
      const result = await client.getZones();
      expect(result).toHaveLength(1);
      expect(result[0]?.entity_id).toBe("zone.home");
    });
  });

  describe("getAnalytics", () => {
    it("should return analytics data", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({
          active_integrations: ["light", "sensor"],
          addons: [],
          energy: false,
          homeassistant: "Home",
          installation_type: "Home Assistant OS",
          integration_count: 50,
          state_count: 200,
          uuid: "test-uuid",
          version: "2024.1.0",
        })
      );
      const result = await client.getAnalytics();
      expect(result.version).toBe("2024.1.0");
      expect(result.integration_count).toBe(50);
    });
  });

  describe("getBackups", () => {
    it("should return list of backups", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([
          { 
            slug: "backup1", 
            name: "Test Backup", 
            date: "2024-01-01", 
            size: 1024,
            compressed: true,
            protected: false,
          },
        ])
      );
      const result = await client.getBackups();
      expect(result).toHaveLength(1);
      expect(result[0]?.name).toBe("Test Backup");
    });
  });

  describe("createBackup", () => {
    it("should create a backup", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({ 
          slug: "new_backup", 
          name: "New Backup", 
          date: "2024-01-02",
          size: 2048,
          compressed: true,
          protected: false,
        })
      );
      const result = await client.createBackup("New Backup");
      expect(result.name).toBe("New Backup");
      expect(result.compressed).toBe(true);
    });

    it("should create a backup with password", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({ 
          slug: "secure_backup", 
          name: "Secure Backup", 
          date: "2024-01-02",
          size: 2048,
          compressed: true,
          protected: true,
        })
      );
      const result = await client.createBackup("Secure Backup", { password: "secret" });
      expect(result.name).toBe("Secure Backup");
    });
  });

  describe("restoreBackup", () => {
    it("should restore a backup", async () => {
      mockRequest.mockResolvedValueOnce({
        statusCode: 200,
        body: { text: () => Promise.resolve("") },
      });
      await client.restoreBackup("backup1");
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining("/backups/backup1/restore"),
        expect.any(Object)
      );
    });
  });

  describe("deleteBackup", () => {
    it("should delete a backup", async () => {
      mockRequest.mockResolvedValueOnce({
        statusCode: 200,
        body: { text: () => Promise.resolve("") },
      });
      await client.deleteBackup("backup1");
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining("/backups/backup1"),
        expect.objectContaining({ method: "DELETE" })
      );
    });
  });

  describe("downloadBackup", () => {
    it("should download a backup", async () => {
      const buffer = Buffer.from([0x1, 0x2, 0x3]);
      mockRequest.mockResolvedValueOnce({
        statusCode: 200,
        body: { 
          arrayBuffer: () => Promise.resolve(buffer.buffer.slice(buffer.byteOffset, buffer.byteOffset + buffer.byteLength))
        },
      });
      const result = await client.downloadBackup("backup1");
      expect(result).toBeInstanceOf(Buffer);
    });
  });
});
