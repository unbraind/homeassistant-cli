import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SearchApiClient } from "../src/api/search.js";

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

describe("SearchApiClient", () => {
  let client: SearchApiClient;

  beforeEach(() => {
    client = new SearchApiClient({
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

  describe("search", () => {
    it("should search entities", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([
          { entity_id: "light.living_room", name: "Living Room Light", domain: "light", area: null, labels: [], device: null, platform: "hue", state: "on" },
        ])
      );
      const result = await client.search("living");
      expect(result).toHaveLength(1);
      expect(result[0]?.entity_id).toBe("light.living_room");
    });

    it("should fall back to local state search when /search endpoint is unavailable", async () => {
      mockRequest
        .mockResolvedValueOnce(
          mockResponse({ message: "404: Not Found" }, 404)
        )
        .mockResolvedValueOnce(
          mockResponse([
            {
              entity_id: "light.living_room",
              state: "on",
              attributes: { friendly_name: "Living Room" },
              last_changed: "2024-01-01T00:00:00Z",
              last_updated: "2024-01-01T00:00:00Z",
            },
          ])
        );

      const result = await client.search("living");
      expect(result).toHaveLength(1);
      expect(result[0]?.entity_id).toBe("light.living_room");
      expect(result[0]?.platform).toBe("state_fallback");
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });
  });

  describe("quickSearch", () => {
    it("should filter states by pattern", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([
          { entity_id: "light.living_room", state: "on", attributes: { friendly_name: "Living Room" }, last_changed: "2024-01-01T00:00:00Z", last_updated: "2024-01-01T00:00:00Z" },
          { entity_id: "light.kitchen", state: "off", attributes: { friendly_name: "Kitchen" }, last_changed: "2024-01-01T00:00:00Z", last_updated: "2024-01-01T00:00:00Z" },
        ])
      );
      const result = await client.quickSearch("living");
      expect(result).toHaveLength(1);
      expect(result[0]?.entity_id).toBe("light.living_room");
    });

    it("should match friendly_name", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([
          { entity_id: "light.abc123", state: "on", attributes: { friendly_name: "Living Room Light" }, last_changed: "2024-01-01T00:00:00Z", last_updated: "2024-01-01T00:00:00Z" },
        ])
      );
      const result = await client.quickSearch("living");
      expect(result).toHaveLength(1);
    });
  });
});
