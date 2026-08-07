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
const mockWsCall = vi.fn();

const mockGetAddons = vi.fn();

vi.mock("../src/api/index.js", () => ({
  HomeAssistantClient: vi.fn().mockImplementation(function () { return {
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
  }; }),
  HomeAssistantWebSocketClient: vi.fn().mockImplementation(function () { return {
    connect: mockWsConnect,
    call: mockWsCall,
    close: mockWsClose,
  }; }),
}));

vi.mock("../src/api/supervisor.js", () => ({
  SupervisorApiClient: vi.fn().mockImplementation(function () { return {
    getAddons: mockGetAddons,
  }; }),
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
    mockWsCall.mockResolvedValue({});
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

  it("skips the history call when no sample entity is available", async () => {
    mockGetStates.mockResolvedValue([]);
    await probeApiMatrix(baseConfig);
    expect(mockGetHistory).not.toHaveBeenCalled();
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
    expect(result.entries.find(e => e.key === "repairs")?.status).toBe("available");
    expect(result.entries.find(e => e.key === "related")?.status).toBe("available");
    expect(result.entries.find(e => e.key === "integration_manifests")?.status).toBe("available");
    expect(result.entries.find(e => e.key === "integration_setup")?.status).toBe("available");
    expect(result.entries.find(e => e.key === "entity_sources")?.status).toBe("available");
    expect(result.entries.find(e => e.key === "slugify")?.status).toBe("available");
    expect(result.entries.find(e => e.key === "automation_runtime")?.status).toBe("available");
    expect(result.entries.find(e => e.key === "automation_traces")?.status).toBe("available");
    expect(result.entries.find(e => e.key === "frontend_version")?.status).toBe("available");
    expect(result.entries.find(e => e.key === "frontend_themes")?.status).toBe("available");
    expect(result.entries.find(e => e.key === "frontend_icons")?.status).toBe("available");
    expect(result.entries.find(e => e.key === "frontend_translations")?.status).toBe("available");
    expect(result.entries.find(e => e.key === "automatic_entity_ids")?.status).toBe("available");
    expect(result.entries.find(e => e.key === "registry_composite_splits")?.status).toBe("available");
    expect(result.entries.find(e => e.key === "entity_id_settings")?.status).toBe("available");
    expect(result.entries.find(e => e.key === "bootstrap_integrations")?.status).toBe("available");
    expect(mockWsCall).toHaveBeenCalledWith("subscribe_bootstrap_integrations", undefined);
    expect(mockWsCall).toHaveBeenCalledWith("config/entity_registry/get_automatic_entity_ids", {
      entity_ids: ["sensor.hassio_cli_capability_probe"],
    });
    expect(mockWsCall).toHaveBeenCalledWith("config/device_registry/list_composite_splits", undefined);
    expect(mockWsCall).toHaveBeenCalledWith("config/entity_registry/settings/get", undefined);
    expect(mockWsCall).toHaveBeenCalledWith("frontend/get_version", undefined);
    expect(mockWsCall).toHaveBeenCalledWith("frontend/get_themes", undefined);
    expect(mockWsCall).toHaveBeenCalledWith("frontend/get_icons", {
      category: "services",
      integration: ["light"],
    });
    expect(mockWsCall).toHaveBeenCalledWith("frontend/get_translations", {
      language: "en",
      category: "services",
      integration: ["light"],
    });
    expect(mockWsCall).toHaveBeenCalledWith("test_condition", {
      condition: { condition: "template", value_template: "{{ true }}" },
    });
    expect(mockWsCall).toHaveBeenCalledWith("trace/list", { domain: "automation" });
    expect(mockWsCall).toHaveBeenCalledWith("manifest/list", undefined);
    expect(mockWsCall).toHaveBeenCalledWith("integration/setup_info", undefined);
    expect(mockWsCall).toHaveBeenCalledWith("entity/source", undefined);
    expect(mockWsCall).toHaveBeenCalledWith("slugify", { text: "hassio_cli_capability_probe" });
    expect(mockWsCall).toHaveBeenCalledWith("repairs/list_issues", undefined);
    expect(mockWsCall).toHaveBeenCalledWith("search/related", {
      item_type: "area",
      item_id: "__hassio_cli_capability_probe__",
    });
  });

  it("classifies unavailable typed websocket commands independently", async () => {
    mockWsCall.mockImplementation(async (type: string) => {
      if (type === "repairs/list_issues") throw new Error("unknown_command");
      throw new Error("401 Unauthorized");
    });
    const result = await probeApiMatrix(baseConfig);
    expect(result.entries.find(e => e.key === "repairs")?.status).toBe("unavailable");
    expect(result.entries.find(e => e.key === "related")?.status).toBe("unauthorized");
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
    expect(result.entries.find(e => e.key === "repairs")?.status).toBe("error");
    expect(result.entries.find(e => e.key === "related")?.status).toBe("error");
    expect(mockWsCall).not.toHaveBeenCalled();
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
