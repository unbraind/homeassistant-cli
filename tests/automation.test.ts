import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { AutomationApiClient, HaAutomation, HaScript, HaScene } from "../src/api/automation.js";

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

describe("AutomationApiClient", () => {
  let client: AutomationApiClient;

  beforeEach(() => {
    client = new AutomationApiClient({
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

  describe("getAutomations", () => {
    it("should return automations", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([
          { entity_id: "automation.test", state: "on", attributes: { friendly_name: "Test", last_triggered: "2024-01-01T00:00:00Z" } },
          { entity_id: "light.test", state: "on", attributes: {} },
        ])
      );
      const result = await client.getAutomations();
      expect(result).toHaveLength(1);
      expect(result[0]?.entity_id).toBe("automation.test");
    });
  });

  describe("triggerAutomation", () => {
    it("should trigger automation", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "123" } }));
      await client.triggerAutomation("automation.test");
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining("/services/automation/trigger"),
        expect.any(Object)
      );
    });
  });

  describe("toggleAutomation", () => {
    it("should toggle automation", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "123" } }));
      await client.toggleAutomation("automation.test");
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining("/services/automation/toggle"),
        expect.any(Object)
      );
    });
  });

  describe("turnOnAutomation", () => {
    it("should turn on automation", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "123" } }));
      await client.turnOnAutomation("automation.test");
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining("/services/automation/turn_on"),
        expect.any(Object)
      );
    });
  });

  describe("turnOffAutomation", () => {
    it("should turn off automation", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "123" } }));
      await client.turnOffAutomation("automation.test");
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining("/services/automation/turn_off"),
        expect.any(Object)
      );
    });
  });

  describe("reloadAutomations", () => {
    it("should reload automations", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "123" } }));
      await client.reloadAutomations();
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining("/services/automation/reload"),
        expect.any(Object)
      );
    });
  });

  describe("getScripts", () => {
    it("should return scripts", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([
          { entity_id: "script.test", state: "off", attributes: { friendly_name: "Test Script" } },
          { entity_id: "light.test", state: "on", attributes: {} },
        ])
      );
      const result = await client.getScripts();
      expect(result).toHaveLength(1);
      expect(result[0]?.entity_id).toBe("script.test");
    });
  });

  describe("executeScript", () => {
    it("should execute script", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "123" } }));
      await client.executeScript("script.test");
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining("/services/script/test"),
        expect.any(Object)
      );
    });

    it("should execute script with variables", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "123" } }));
      await client.executeScript("script.test", { foo: "bar" });
      const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
      const callBody = callOptions?.body ? JSON.parse(callOptions.body) : {};
      expect(callBody.foo).toBe("bar");
    });
  });

  describe("reloadScripts", () => {
    it("should reload scripts", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "123" } }));
      await client.reloadScripts();
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining("/services/script/reload"),
        expect.any(Object)
      );
    });
  });

  describe("getScenes", () => {
    it("should return scenes", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([
          { entity_id: "scene.test", state: "off", attributes: { friendly_name: "Test Scene" } },
          { entity_id: "light.test", state: "on", attributes: {} },
        ])
      );
      const result = await client.getScenes();
      expect(result).toHaveLength(1);
      expect(result[0]?.entity_id).toBe("scene.test");
    });
  });

  describe("applyScene", () => {
    it("should apply scene", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "123" } }));
      await client.applyScene("scene.test");
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining("/services/scene/turn_on"),
        expect.any(Object)
      );
    });
  });

  describe("reloadScenes", () => {
    it("should reload scenes", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "123" } }));
      await client.reloadScenes();
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining("/services/scene/reload"),
        expect.any(Object)
      );
    });
  });
});
