import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { HomeAssistantClient, HomeAssistantApiError } from "../src/api/client.js";

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

describe("HomeAssistantClient", () => {
  let client: HomeAssistantClient;

  beforeEach(() => {
    client = new HomeAssistantClient({
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

  describe("getStatus", () => {
    it("should return API status", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({ message: "API running." })
      );
      const result = await client.getStatus();
      expect(result).toEqual({ message: "API running." });
      expect(mockRequest).toHaveBeenCalledWith(
        "http://localhost:8123/api/",
        expect.objectContaining({
          method: "GET",
          headers: expect.objectContaining({
            Authorization: "Bearer test-token",
          }),
        })
      );
    });
  });

  describe("getConfig", () => {
    it("should return HA config", async () => {
      const configData = {
        location_name: "Home",
        version: "2024.1.0",
        time_zone: "UTC",
      };
      mockRequest.mockResolvedValueOnce(mockResponse(configData));
      const result = await client.getConfig();
      expect(result).toEqual(configData);
    });
  });

  describe("getComponents", () => {
    it("should return list of components", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse(["light", "switch", "sensor"])
      );
      const result = await client.getComponents();
      expect(result).toEqual(["light", "switch", "sensor"]);
    });
  });

  describe("getEvents", () => {
    it("should return list of events", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([{ event: "state_changed", listener_count: 5 }])
      );
      const result = await client.getEvents();
      expect(result).toEqual([{ event: "state_changed", listener_count: 5 }]);
    });
  });

  describe("getServices", () => {
    it("should return list of services", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([{ domain: "light", services: ["turn_on", "turn_off"] }])
      );
      const result = await client.getServices();
      expect(result).toEqual([{ domain: "light", services: ["turn_on", "turn_off"] }]);
    });
  });

  describe("getStates", () => {
    it("should return all states", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([
          { entity_id: "light.living_room", state: "on" },
          { entity_id: "switch.kitchen", state: "off" },
        ])
      );
      const result = await client.getStates();
      expect(result).toHaveLength(2);
      expect(result[0]?.entity_id).toBe("light.living_room");
    });
  });

  describe("getState", () => {
    it("should return specific entity state", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({ entity_id: "light.living_room", state: "on" })
      );
      const result = await client.getState("light.living_room");
      expect(result.entity_id).toBe("light.living_room");
    });
  });

  describe("setState", () => {
    it("should update entity state", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({ entity_id: "sensor.test", state: "42" })
      );
      const result = await client.setState("sensor.test", "42");
      expect(result.state).toBe("42");
    });

    it("should update entity state with attributes", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({ entity_id: "sensor.test", state: "42", attributes: { unit: "C" } })
      );
      const result = await client.setState("sensor.test", "42", { unit: "C" });
      expect(mockRequest).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({ state: "42", attributes: { unit: "C" } }),
        })
      );
    });
  });

  describe("deleteState", () => {
    it("should delete entity state", async () => {
      mockRequest.mockResolvedValueOnce({
        statusCode: 200,
        body: {
          text: () => Promise.resolve(""),
          arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
        },
      });
      await client.deleteState("sensor.test");
    });
  });

  describe("callService", () => {
    it("should call service without response", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({ context: { id: "123" } })
      );
      const result = await client.callService("light", "turn_on", {
        entity_id: "light.living_room",
      });
      expect(result.context.id).toBe("123");
    });

    it("should call service with response", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({ context: { id: "123" }, response: { data: "test" } })
      );
      const result = await client.callService(
        "weather",
        "get_forecasts",
        { entity_id: "weather.home" },
        true
      );
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining("?return_response"),
        expect.any(Object)
      );
    });
  });

  describe("fireEvent", () => {
    it("should fire event", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse({ message: "Event test_event fired." })
      );
      const result = await client.fireEvent("test_event", { foo: "bar" });
      expect(result.message).toBe("Event test_event fired.");
    });
  });

  describe("getHistory", () => {
    it("should get history with entity filter", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse([]));
      await client.getHistory({ entityId: "sensor.temperature" });
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining("filter_entity_id=sensor.temperature"),
        expect.any(Object)
      );
    });

    it("should get history with multiple entities", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse([]));
      await client.getHistory({
        entityId: ["sensor.temp1", "sensor.temp2"],
      });
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining("filter_entity_id=sensor.temp1%2Csensor.temp2"),
        expect.any(Object)
      );
    });

    it("should get history with options", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse([]));
      await client.getHistory({
        entityId: "sensor.temperature",
        startTime: "2024-01-01T00:00:00Z",
        endTime: "2024-01-02T00:00:00Z",
        minimalResponse: true,
        noAttributes: true,
        significantChangesOnly: true,
      });
      const callUrl = mockRequest.mock.calls[0]?.[0] as string;
      expect(callUrl).toContain("/history/period/2024-01-01T00:00:00Z");
      expect(callUrl).toContain("minimal_response");
      expect(callUrl).toContain("no_attributes");
      expect(callUrl).toContain("significant_changes_only");
    });
  });

  describe("getLogbook", () => {
    it("should get logbook entries", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse([]));
      await client.getLogbook();
      expect(mockRequest).toHaveBeenCalledWith(
        expect.stringContaining("/logbook"),
        expect.any(Object)
      );
    });

    it("should get logbook with filters", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse([]));
      await client.getLogbook({
        entityId: "light.living_room",
        startTime: "2024-01-01T00:00:00Z",
        endTime: "2024-01-02T00:00:00Z",
      });
      const callUrl = mockRequest.mock.calls[0]?.[0] as string;
      expect(callUrl).toContain("/logbook/2024-01-01T00:00:00Z");
      expect(callUrl).toContain("entity=light.living_room");
    });
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
});
