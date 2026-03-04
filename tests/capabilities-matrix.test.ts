import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { probeApiMatrix } from "../src/commands/capabilities-api-matrix.js";

// Mock the API clients
const mockGetStatus = vi.fn();
const mockGetConfig = vi.fn();
const mockGetServices = vi.fn();
const mockGetStates = vi.fn();
const mockGetEvents = vi.fn();
const mockGetComponents = vi.fn();
const mockGetHistory = vi.fn();
const mockGetLogbook = vi.fn();
const mockGetCalendars = vi.fn();
const mockCallService = vi.fn();
const mockGetCalendarEvents = vi.fn();

const mockWsConnect = vi.fn();
const mockWsClose = vi.fn();

const mockGetAddons = vi.fn();

vi.mock("../src/api/index.js", () => ({
  HomeAssistantClient: vi.fn().mockImplementation(() => ({
    getStatus: mockGetStatus,
    getConfig: mockGetConfig,
    getServices: mockGetServices,
    getStates: mockGetStates,
    getEvents: mockGetEvents,
    getComponents: mockGetComponents,
    getHistory: mockGetHistory,
    getLogbook: mockGetLogbook,
    getCalendars: mockGetCalendars,
    callService: mockCallService,
    getCalendarEvents: mockGetCalendarEvents,
    getState: vi.fn(async () => ({ entity_id: "light.kitchen", state: "on", attributes: {} })),
    renderTemplate: vi.fn(async () => "result"),
  })),
  HomeAssistantWebSocketClient: vi.fn().mockImplementation(() => ({
    connect: mockWsConnect,
    close: mockWsClose,
  })),
}));

vi.mock("../src/api/supervisor.js", () => ({
  SupervisorApiClient: vi.fn().mockImplementation(() => ({
    getAddons: mockGetAddons,
  })),
}));

const baseConfig = {
  url: "http://localhost:8123",
  token: "test-token",
  outputFormat: "json" as const,
  timeout: 5000,
  readOnly: false,
};

const sampleStates = [
  { entity_id: "light.kitchen", state: "on", attributes: {} },
  { entity_id: "sensor.temp", state: "21.5", attributes: {} },
];

const sampleServices = [
  { domain: "light", services: { turn_on: {}, turn_off: {} } },
  { domain: "switch", services: { turn_on: {}, turn_off: {} } },
  { domain: "conversation", services: { process: {} } },
  { domain: "notify", services: { notify: {} } },
];

describe("probeApiMatrix", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Default happy-path mocks
    mockGetStatus.mockResolvedValue({ message: "API running." });
    mockGetConfig.mockResolvedValue({ version: "2026.1.3", location_name: "Home" });
    mockGetServices.mockResolvedValue(sampleServices);
    mockGetStates.mockResolvedValue(sampleStates);
    mockGetEvents.mockResolvedValue([]);
    mockGetComponents.mockResolvedValue(["light", "switch"]);
    mockGetHistory.mockResolvedValue([]);
    mockGetLogbook.mockResolvedValue([]);
    mockGetCalendars.mockResolvedValue([]);
    mockCallService.mockResolvedValue({ context: { id: "ctx" } });
    mockGetCalendarEvents.mockResolvedValue([]);
    mockWsConnect.mockResolvedValue(undefined);
    mockWsClose.mockResolvedValue(undefined);
    mockGetAddons.mockResolvedValue({ result: "ok", data: { addons: [] } });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns matrix with all entries", async () => {
    const result = await probeApiMatrix(baseConfig);

    expect(result.source).toBe("live");
    expect(result.checked_at).toBeDefined();
    expect(result.summary.total).toBeGreaterThan(0);
    expect(Array.isArray(result.entries)).toBe(true);
    expect(Array.isArray(result.recommendations)).toBe(true);
  });

  it("marks REST endpoints as available when they succeed", async () => {
    const result = await probeApiMatrix(baseConfig);

    const statusEntry = result.entries.find(e => e.key === "status");
    expect(statusEntry?.status).toBe("available");
    expect(statusEntry?.probe).toBe("rest");
  });

  it("marks websocket as available when connection succeeds", async () => {
    const result = await probeApiMatrix(baseConfig);

    const wsEntry = result.entries.find(e => e.key === "websocket");
    expect(wsEntry?.status).toBe("available");
    expect(wsEntry?.probe).toBe("websocket");
  });

  it("marks supervisor as available when addons succeed", async () => {
    const result = await probeApiMatrix(baseConfig);

    const supEntry = result.entries.find(e => e.key === "supervisor");
    expect(supEntry?.status).toBe("available");
  });

  it("marks service-domain entries based on detected services", async () => {
    const result = await probeApiMatrix(baseConfig);

    // conversation domain IS in sampleServices → available
    const convEntry = result.entries.find(e => e.key === "conversation");
    expect(convEntry?.status).toBe("available");
    expect(convEntry?.probe).toBe("service-domain");

    // tts domain is NOT in sampleServices → unavailable
    const ttsEntry = result.entries.find(e => e.key === "tts");
    expect(ttsEntry?.status).toBe("unavailable");
  });

  it("marks websocket as error when connection fails", async () => {
    mockWsConnect.mockRejectedValue(new Error("Connection refused"));

    const result = await probeApiMatrix(baseConfig);

    const wsEntry = result.entries.find(e => e.key === "websocket");
    expect(wsEntry?.status).toBe("error");
  });

  it("marks supervisor as unavailable on 404", async () => {
    mockGetAddons.mockRejectedValue(new Error("404 Not Found"));

    const result = await probeApiMatrix(baseConfig);

    const supEntry = result.entries.find(e => e.key === "supervisor");
    expect(supEntry?.status).toBe("unavailable");
  });

  it("marks REST probe as error when it fails", async () => {
    mockGetStatus.mockRejectedValue(new Error("Connection refused"));

    const result = await probeApiMatrix(baseConfig);

    const statusEntry = result.entries.find(e => e.key === "status");
    expect(statusEntry?.status).toBe("error");
  });

  it("marks REST probe as unauthorized on 401", async () => {
    mockGetConfig.mockRejectedValue(new Error("401 Unauthorized"));

    const result = await probeApiMatrix(baseConfig);

    const configEntry = result.entries.find(e => e.key === "config");
    expect(configEntry?.status).toBe("unauthorized");
  });

  it("includes recommendations", async () => {
    const result = await probeApiMatrix(baseConfig);

    expect(result.recommendations).toContain("Use --format toon for token-efficient agent workflows.");
    // conversation domain is in sampleServices, so no "avoid conversation" recommendation
    const avoidConv = result.recommendations.find(r => r.includes("conversation"));
    expect(avoidConv).toBeUndefined();
  });

  it("adds conversation warning when conversation domain is missing", async () => {
    mockGetServices.mockResolvedValue([
      { domain: "light", services: { turn_on: {} } },
    ]);

    const result = await probeApiMatrix(baseConfig);

    const convWarning = result.recommendations.find(r => r.includes("conversation"));
    expect(convWarning).toBeDefined();
  });

  it("adds supervisor skip recommendation when not available", async () => {
    mockGetAddons.mockRejectedValue(new Error("404 Not Found"));

    const result = await probeApiMatrix(baseConfig);

    const supWarning = result.recommendations.find(r => r.includes("supervisor"));
    expect(supWarning).toBeDefined();
  });

  it("summary totals match entries", async () => {
    const result = await probeApiMatrix(baseConfig);

    const counted = result.entries.reduce<Record<string, number>>((acc, e) => {
      acc[e.status] = (acc[e.status] || 0) + 1;
      return acc;
    }, {});

    expect(result.summary.total).toBe(result.entries.length);
    expect(result.summary.available).toBe(counted["available"] ?? 0);
    expect(result.summary.unavailable).toBe(counted["unavailable"] ?? 0);
  });
});
