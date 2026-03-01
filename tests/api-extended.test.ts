import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HomeAssistantClient, HomeAssistantApiError, HomeAssistantReadOnlyError } from "../src/api/client.js";

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

describe("HomeAssistantClient extended", () => {
  let client: HomeAssistantClient;

  beforeEach(() => {
    client = new HomeAssistantClient({
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

  describe("getErrorLog", () => {
    it("should return error log as text", async () => {
      mockRequest.mockResolvedValueOnce({
        statusCode: 200,
        body: {
          text: () => Promise.resolve("Error log content"),
        },
      });
      const result = await client.getErrorLog();
      expect(result).toBe("Error log content");
    });
  });

  describe("renderTemplate", () => {
    it("should render template", async () => {
      mockRequest.mockResolvedValueOnce({
        statusCode: 200,
        body: {
          text: () => Promise.resolve("rendered result"),
        },
      });
      const result = await client.renderTemplate("{{ now() }}");
      expect(result).toBe("rendered result");
      expect(mockRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          method: "POST",
          headersTimeout: 30000,
          bodyTimeout: 30000,
        })
      );
    });
  });

  describe("getCalendars", () => {
    it("should return calendars", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([{ entity_id: "calendar.home", name: "Home" }])
      );
      const result = await client.getCalendars();
      expect(result).toEqual([{ entity_id: "calendar.home", name: "Home" }]);
    });
  });

  describe("getCalendarEvents", () => {
    it("should return calendar events", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([{ summary: "Event", start: {}, end: {} }])
      );
      const result = await client.getCalendarEvents(
        "calendar.home",
        "2024-01-01T00:00:00Z",
        "2024-01-31T23:59:59Z"
      );
      expect(result).toHaveLength(1);
    });
  });

  describe("checkConfig", () => {
    it("should return config validation result", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({ errors: null, result: "valid" })
      );
      const result = await client.checkConfig();
      expect(result.result).toBe("valid");
    });
  });

  describe("handleIntent", () => {
    it("should handle intent", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse({ success: true }));
      const result = await client.handleIntent("SetTimer", { seconds: 30 });
      expect(result).toEqual({ success: true });
    });
  });

  describe("error handling", () => {
    it("should throw HomeAssistantApiError on HTTP error", async () => {
      mockRequest.mockResolvedValueOnce({
        statusCode: 401,
        body: {
          text: () => Promise.resolve("Unauthorized"),
        },
      });
      await expect(client.getStatus()).rejects.toThrow(HomeAssistantApiError);
    });
  });

  describe("read-only mode", () => {
    it("should block write operations when read-only mode is enabled", async () => {
      const readOnlyClient = new HomeAssistantClient({
        url: "http://localhost:8123",
        token: "test-token",
        outputFormat: "toon",
        timeout: 30000,
        readOnly: true,
      });

      await expect(readOnlyClient.callService("light", "turn_on", {
        entity_id: "light.office",
      })).rejects.toThrow(HomeAssistantReadOnlyError);
      expect(mockRequest).not.toHaveBeenCalled();
    });
  });
});
