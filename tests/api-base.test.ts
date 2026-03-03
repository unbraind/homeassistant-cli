import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HomeAssistantClient, HomeAssistantApiError, HomeAssistantReadOnlyError } from "../src/api/client.js";
import { HomeAssistantConnectionError, HomeAssistantTimeoutError } from "../src/api/errors.js";

const mockResponse = (data: unknown, status = 200) => ({
  statusCode: status,
  body: {
    text: () => Promise.resolve(JSON.stringify(data)),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(8)),
  },
});

const mockTextResponse = (text: string, status = 200) => ({
  statusCode: status,
  body: {
    text: () => Promise.resolve(text),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  },
});

vi.mock("undici", () => ({
  request: vi.fn(),
}));

import { request } from "undici";
const mockRequest = request as ReturnType<typeof vi.fn>;

describe("BaseClient via HomeAssistantClient", () => {
  let client: HomeAssistantClient;
  let readOnlyClient: HomeAssistantClient;

  beforeEach(() => {
    client = new HomeAssistantClient({
      url: "http://localhost:8123",
      token: "test-token",
      outputFormat: "toon",
      timeout: 30000,
      readOnly: false,
    });
    readOnlyClient = new HomeAssistantClient({
      url: "http://localhost:8123",
      token: "test-token",
      outputFormat: "toon",
      timeout: 30000,
      readOnly: true,
    });
    mockRequest.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("requestText error handling", () => {
    it("throws HomeAssistantApiError on 4xx for getErrorLog", async () => {
      mockRequest.mockResolvedValueOnce(mockTextResponse("Unauthorized", 401));
      await expect(client.getErrorLog()).rejects.toThrow(HomeAssistantApiError);
    });

    it("returns text on success for renderTemplate", async () => {
      mockRequest.mockResolvedValueOnce(mockTextResponse("rendered"));
      const result = await client.renderTemplate("{{ 1+1 }}");
      expect(result).toBe("rendered");
    });
  });

  describe("requestBuffer error handling", () => {
    it("throws HomeAssistantApiError on 404 for getCameraImage", async () => {
      mockRequest.mockResolvedValueOnce({
        statusCode: 404,
        body: {
          text: () => Promise.resolve("Not found"),
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        },
      });
      await expect(client.getCameraImage("camera.front")).rejects.toThrow(HomeAssistantApiError);
    });

    it("returns Buffer on success for getCameraImage", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse({}, 200));
      const result = await client.getCameraImage("camera.front");
      expect(Buffer.isBuffer(result)).toBe(true);
    });
  });

  describe("read-only mode blocking", () => {
    it("blocks POST via callService", async () => {
      await expect(
        readOnlyClient.callService("light", "turn_on", { entity_id: "light.lr" })
      ).rejects.toThrow(HomeAssistantReadOnlyError);
      expect(mockRequest).not.toHaveBeenCalled();
    });

    it("blocks DELETE via deleteState", async () => {
      await expect(readOnlyClient.deleteState("sensor.test")).rejects.toThrow(
        HomeAssistantReadOnlyError
      );
      expect(mockRequest).not.toHaveBeenCalled();
    });

    it("blocks POST via setState", async () => {
      await expect(readOnlyClient.setState("sensor.test", "42")).rejects.toThrow(
        HomeAssistantReadOnlyError
      );
    });

    it("allows GET in read-only mode", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse({ message: "API running." }));
      const result = await readOnlyClient.getStatus();
      expect(result).toEqual({ message: "API running." });
    });

    it("blocks renderTemplate (POST) in read-only mode", async () => {
      await expect(readOnlyClient.renderTemplate("{{ 1 }}")).rejects.toThrow(
        HomeAssistantReadOnlyError
      );
    });
  });

  describe("retry logic", () => {
    let noRetryClient: HomeAssistantClient;

    beforeEach(() => {
      // Client with skipRetry via single attempt for fast error tests
      noRetryClient = client;
    });

    it("retries on 500 and eventually succeeds", async () => {
      // Use zero-delay client to avoid needing fake timers
      const fastClient = new HomeAssistantClient({
        url: "http://localhost:8123",
        token: "test-token",
        outputFormat: "toon",
        timeout: 30000,
        readOnly: false,
      });
      (fastClient as unknown as { retryConfig: { initialDelayMs: number } }).retryConfig.initialDelayMs = 0;
      mockRequest
        .mockResolvedValueOnce(mockTextResponse("Server Error", 500))
        .mockResolvedValueOnce(mockResponse({ message: "API running." }));
      const result = await fastClient.getStatus();
      expect(result).toEqual({ message: "API running." });
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    it("retries on 429 and eventually succeeds", async () => {
      // Use zero-delay client to avoid needing fake timers
      const fastClient = new HomeAssistantClient({
        url: "http://localhost:8123",
        token: "test-token",
        outputFormat: "toon",
        timeout: 30000,
        readOnly: false,
      });
      (fastClient as unknown as { retryConfig: { initialDelayMs: number } }).retryConfig.initialDelayMs = 0;
      mockRequest
        .mockResolvedValueOnce(mockTextResponse("Rate limited", 429))
        .mockResolvedValueOnce(mockResponse(["light"]));
      const result = await fastClient.getComponents();
      expect(result).toEqual(["light"]);
      expect(mockRequest).toHaveBeenCalledTimes(2);
    });

    it("does not retry non-retriable status codes", async () => {
      mockRequest.mockResolvedValueOnce(mockTextResponse("Not found", 404));
      await expect(noRetryClient.getStatus()).rejects.toThrow(HomeAssistantApiError);
      expect(mockRequest).toHaveBeenCalledTimes(1);
    });

    it("wraps ECONNREFUSED in HomeAssistantConnectionError", async () => {
      // Create a client with no retries to avoid unhandled intermediate rejections
      const zeroRetryClient = new HomeAssistantClient({
        url: "http://localhost:8123",
        token: "test-token",
        outputFormat: "toon",
        timeout: 30000,
        readOnly: false,
      });
      // Override retryConfig to 0 retries
      (zeroRetryClient as unknown as { retryConfig: { maxRetries: number } }).retryConfig.maxRetries = 0;
      mockRequest.mockRejectedValueOnce(new Error("ECONNREFUSED"));
      await expect(zeroRetryClient.getStatus()).rejects.toThrow(HomeAssistantConnectionError);
    });

    it("wraps timeout errors in HomeAssistantTimeoutError", async () => {
      const zeroRetryClient = new HomeAssistantClient({
        url: "http://localhost:8123",
        token: "test-token",
        outputFormat: "toon",
        timeout: 30000,
        readOnly: false,
      });
      (zeroRetryClient as unknown as { retryConfig: { maxRetries: number } }).retryConfig.maxRetries = 0;
      mockRequest.mockRejectedValueOnce(new Error("timeout"));
      await expect(zeroRetryClient.getStatus()).rejects.toThrow(HomeAssistantTimeoutError);
    });
  });

  describe("request returns undefined for empty body", () => {
    it("handles empty response body", async () => {
      mockRequest.mockResolvedValueOnce(mockTextResponse("", 200));
      const result = await client.deleteState("sensor.test");
      expect(result).toBeUndefined();
    });
  });
});
