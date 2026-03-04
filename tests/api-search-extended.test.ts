import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { SearchApiClient } from "../src/api/search.js";

vi.mock("undici", () => ({
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

const sampleSearchResults = [
  { entity_id: "light.kitchen", name: "Kitchen Light", domain: "light", area: "kitchen", labels: [], device: null, platform: "hue", state: "on" },
  { entity_id: "light.bedroom", name: "Bedroom Light", domain: "light", area: "bedroom", labels: [], device: null, platform: "hue", state: "off" },
  { entity_id: "sensor.kitchen_temp", name: "Kitchen Temp", domain: "sensor", area: "kitchen", labels: [], device: null, platform: "mqtt", state: "22" },
];

const sampleStates = [
  { entity_id: "light.kitchen", state: "on", attributes: { friendly_name: "Kitchen Light" }, last_changed: "2024-01-01T00:00:00Z", last_updated: "2024-01-01T00:00:00Z" },
  { entity_id: "switch.fan", state: "off", attributes: { friendly_name: "Fan" }, last_changed: "2024-01-01T00:00:00Z", last_updated: "2024-01-01T00:00:00Z" },
];

describe("SearchApiClient extended", () => {
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

  describe("search fallback on 404", () => {
    it("falls back to quickSearch when /search endpoint returns 404", async () => {
      // First call: 404 on /search endpoint
      mockRequest.mockResolvedValueOnce(mockResponse({ message: "Not Found" }, 404));
      // Second call (fallback): getStates
      mockRequest.mockResolvedValueOnce(mockResponse(sampleStates));

      const results = await client.search("kitchen");
      expect(results.some(r => r.entity_id === "light.kitchen")).toBe(true);
      expect(results[0]?.platform).toBe("state_fallback");
    });

    it("rethrows non-404 errors", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse({ message: "Server Error" }, 500));

      await expect(client.search("kitchen")).rejects.toThrow();
    });
  });

  describe("searchByDomain", () => {
    it("searches and filters by domain", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse(sampleSearchResults));

      const results = await client.searchByDomain("light", "light");
      expect(results.every(r => r.domain === "light")).toBe(true);
      expect(results.some(r => r.entity_id === "sensor.kitchen_temp")).toBe(false);
    });
  });

  describe("fuzzySearch", () => {
    it("returns all results without options", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse(sampleSearchResults));

      const results = await client.fuzzySearch("kitchen");
      expect(results).toHaveLength(3);
    });

    it("filters by domain option", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse(sampleSearchResults));

      const results = await client.fuzzySearch("light", { domain: "light" });
      expect(results.every(r => r.domain === "light")).toBe(true);
      expect(results).toHaveLength(2);
    });

    it("filters by area option", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse(sampleSearchResults));

      const results = await client.fuzzySearch("kitchen", { area: "kitchen" });
      expect(results.every(r => r.area === "kitchen")).toBe(true);
      expect(results).toHaveLength(2);
    });

    it("filters by state option", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse(sampleSearchResults));

      const results = await client.fuzzySearch("light", { state: "on" });
      expect(results.every(r => r.state === "on")).toBe(true);
      expect(results).toHaveLength(1);
    });

    it("applies multiple filters together", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse(sampleSearchResults));

      const results = await client.fuzzySearch("kitchen", { domain: "light", area: "kitchen", state: "on" });
      expect(results).toHaveLength(1);
      expect(results[0]?.entity_id).toBe("light.kitchen");
    });
  });
});
