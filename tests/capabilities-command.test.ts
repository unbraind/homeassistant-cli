import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCapabilitiesCommand } from "../src/commands/capabilities.js";

const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
const { getDataMock, saveDataMock, probeApiMatrixMock } = vi.hoisted(() => ({
  getDataMock: vi.fn(),
  saveDataMock: vi.fn(),
  probeApiMatrixMock: vi.fn(),
}));

vi.mock("../src/config/index.js", () => ({
  getConfig: vi.fn(() => ({
    url: "http://localhost:8123",
    token: "test-token",
    outputFormat: "json",
    timeout: 30000,
    readOnly: false,
  })),
  getData: getDataMock,
  saveData: saveDataMock,
}));

vi.mock("../src/api/index.js", () => ({
  HomeAssistantClient: class {
    async getStatus() {
      return { message: "API running." };
    }
    async getConfig() {
      return { version: "2026.1.3", location_name: "Home", installation_type: "Home Assistant OS" };
    }
    async getServices() {
      return [
        { domain: "light", services: { turn_on: {}, turn_off: {} } },
        { domain: "conversation", services: { process: {} } },
      ];
    }
    async getStates() {
      return [
        { entity_id: "light.kitchen", state: "on", attributes: {} },
        { entity_id: "sensor.temp", state: "20", attributes: {} },
      ];
    }
  },
  ConfigEntriesApiClient: class {
    async getConfigEntries() {
      return [{ entry_id: "1" }];
    }
  },
  HomeAssistantWebSocketClient: class {
    async connect() {
      return undefined;
    }
    async close() {
      return undefined;
    }
  },
}));

vi.mock("../src/api/supervisor.js", () => ({
  SupervisorApiClient: class {
    async getAddons() {
      throw new Error("API request failed: 401 - Unauthorized");
    }
  },
}));

vi.mock("../src/commands/capabilities-api-matrix.js", () => ({
  probeApiMatrix: probeApiMatrixMock,
}));

describe("capabilities command", () => {
  beforeEach(() => {
    exitSpy.mockClear();
    getDataMock.mockReset();
    saveDataMock.mockReset();
    probeApiMatrixMock.mockReset();
    probeApiMatrixMock.mockResolvedValue({
      source: "live",
      checked_at: "2026-03-04T00:00:00.000Z",
      summary: { total: 3, available: 2, unavailable: 1, unauthorized: 0, error: 0 },
      entries: [],
      recommendations: ["Use --format toon for token-efficient agent workflows."],
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns cached report when cache is fresh", async () => {
    const now = new Date().toISOString();
    getDataMock.mockReturnValue({
      capabilitiesCache: {
        checkedAt: now,
        report: {
          checked_at: now,
          api: { version: "2026.1.3", location: "Home", installation_type: "Home Assistant OS" },
          counts: { entity_count: 2, service_domain_count: 2, service_count: 3 },
          service_domains: ["light"],
          entity_domains: { light: 1 },
          capabilities: {
            rest_api: { status: "available", endpoint: "/api/" },
            websocket: { status: "available", endpoint: "/api/websocket" },
            config_entries: { status: "available", endpoint: "/api/config/config_entries/entry" },
            supervisor: { status: "unauthorized", endpoint: "/api/hassio/addons" },
            conversation: { status: "available", endpoint: "/api/services/conversation/process" },
            tts: { status: "unavailable", endpoint: "/api/services/tts" },
          },
          hints: [],
        },
      },
    });

    const cmd = createCapabilitiesCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["node", "test"], { from: "user" });
    console.log = originalLog;

    const parsed = JSON.parse(output.join("\n")) as Record<string, unknown>;
    expect(parsed["source"]).toBe("cache");
    expect(saveDataMock).not.toHaveBeenCalled();
  });

  it("runs live probe and saves cache", async () => {
    getDataMock.mockReturnValue({});

    const cmd = createCapabilitiesCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["node", "test", "--refresh", "--count"], { from: "user" });
    console.log = originalLog;

    const parsed = JSON.parse(output.join("\n")) as Record<string, unknown>;
    expect(parsed["source"]).toBe("live");
    expect(parsed["entity_count"]).toBe(2);
    expect(parsed["service_count"]).toBe(3);
    expect(saveDataMock).toHaveBeenCalledTimes(1);
  });

  it("returns an agent-plan payload", async () => {
    const now = new Date().toISOString();
    getDataMock.mockReturnValue({
      capabilitiesCache: {
        checkedAt: now,
        report: {
          checked_at: now,
          api: { version: "2026.1.3", location: "Home", installation_type: "Home Assistant OS" },
          counts: { entity_count: 2, service_domain_count: 2, service_count: 3 },
          service_domains: ["conversation", "light"],
          entity_domains: { light: 1, sensor: 1 },
          capabilities: {
            rest_api: { status: "available", endpoint: "/api/" },
            websocket: { status: "available", endpoint: "/api/websocket" },
            config_entries: { status: "available", endpoint: "/api/config/config_entries/entry" },
            supervisor: { status: "unauthorized", endpoint: "/api/hassio/addons" },
            conversation: { status: "available", endpoint: "/api/services/conversation/process" },
            tts: { status: "unavailable", endpoint: "/api/services/tts" },
          },
          hints: [],
        },
      },
    });

    const cmd = createCapabilitiesCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["node", "test", "--agent-plan"], { from: "user" });
    console.log = originalLog;

    const parsed = JSON.parse(output.join("\n")) as { source: string; plan: { recommended_commands: string[]; avoid_commands: string[] } };
    expect(parsed.source).toBe("cache");
    expect(parsed.plan.recommended_commands).toContain("hassio ask \"<question>\" --format json");
    expect(parsed.plan.avoid_commands).toContain("hassio supervisor addons --list");
  });

  it("returns an agent-profile payload", async () => {
    const now = new Date().toISOString();
    getDataMock.mockReturnValue({
      capabilitiesCache: {
        checkedAt: now,
        report: {
          checked_at: now,
          api: { version: "2026.1.3", location: "Home", installation_type: "Home Assistant OS" },
          counts: { entity_count: 2, service_domain_count: 2, service_count: 3 },
          service_domains: ["conversation", "light"],
          entity_domains: { light: 1, sensor: 1 },
          capabilities: {
            rest_api: { status: "available", endpoint: "/api/" },
            websocket: { status: "available", endpoint: "/api/websocket" },
            config_entries: { status: "available", endpoint: "/api/config/config_entries/entry" },
            supervisor: { status: "unauthorized", endpoint: "/api/hassio/addons" },
            conversation: { status: "available", endpoint: "/api/services/conversation/process" },
            tts: { status: "unavailable", endpoint: "/api/services/tts" },
          },
          hints: [],
        },
      },
    });

    const cmd = createCapabilitiesCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["node", "test", "--agent-profile"], { from: "user" });
    console.log = originalLog;

    const parsed = JSON.parse(output.join("\n")) as {
      source: string;
      profile: { preferred_output_format: string; planning: { fast_path: string[]; streaming_ready: boolean } };
    };
    expect(parsed.source).toBe("cache");
    expect(parsed.profile.preferred_output_format).toBe("toon");
    expect(parsed.profile.planning.fast_path).toContain("hassio summary --format toon");
    expect(parsed.profile.planning.streaming_ready).toBe(true);
  });

  it("returns merged agent-context payload", async () => {
    const now = new Date().toISOString();
    getDataMock.mockReturnValue({
      capabilitiesCache: {
        checkedAt: now,
        report: {
          checked_at: now,
          api: { version: "2026.1.3", location: "Home", installation_type: "Home Assistant OS" },
          counts: { entity_count: 2, service_domain_count: 2, service_count: 3 },
          service_domains: ["conversation", "light"],
          entity_domains: { light: 1, sensor: 1 },
          capabilities: {
            rest_api: { status: "available", endpoint: "/api/" },
            websocket: { status: "available", endpoint: "/api/websocket" },
            config_entries: { status: "available", endpoint: "/api/config/config_entries/entry" },
            supervisor: { status: "unauthorized", endpoint: "/api/hassio/addons" },
            conversation: { status: "available", endpoint: "/api/services/conversation/process" },
            tts: { status: "unavailable", endpoint: "/api/services/tts" },
          },
          hints: [],
        },
      },
    });

    const cmd = createCapabilitiesCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["node", "test", "--agent-context"], { from: "user" });
    console.log = originalLog;

    const parsed = JSON.parse(output.join("\n")) as {
      source: string;
      summary: { entity_count: number };
      format_contract: { default: string };
      profile: { preferred_output_format: string };
      plan: { recommended_commands: string[] };
      suggested_sequence: string[];
    };
    expect(parsed.source).toBe("cache");
    expect(parsed.summary.entity_count).toBe(2);
    expect(parsed.format_contract.default).toBe("toon");
    expect(parsed.profile.preferred_output_format).toBe("toon");
    expect(parsed.plan.recommended_commands).toContain("hassio status");
    expect(parsed.suggested_sequence).toContain("hassio summary --format toon");
  });

  it("redacts private fields when requested", async () => {
    const now = new Date().toISOString();
    getDataMock.mockReturnValue({
      capabilitiesCache: {
        checkedAt: now,
        report: {
          checked_at: now,
          api: { version: "2026.1.3", location: "Home", installation_type: "Home Assistant OS" },
          counts: { entity_count: 2, service_domain_count: 2, service_count: 3 },
          service_domains: ["light"],
          entity_domains: { light: 1 },
          capabilities: {
            rest_api: { status: "available", endpoint: "/api/" },
            websocket: { status: "available", endpoint: "/api/websocket" },
            config_entries: { status: "available", endpoint: "/api/config/config_entries/entry" },
            supervisor: { status: "unauthorized", endpoint: "/api/hassio/addons" },
            conversation: { status: "available", endpoint: "/api/services/conversation/process" },
            tts: { status: "unavailable", endpoint: "/api/services/tts" },
          },
          hints: [],
        },
      },
    });

    const cmd = createCapabilitiesCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["node", "test", "--redact-private"], { from: "user" });
    console.log = originalLog;

    const parsed = JSON.parse(output.join("\n")) as { report: { api: { location: string } } };
    expect(parsed.report.api.location).toBe("[REDACTED]");
  });

  it("returns live API matrix payload when requested", async () => {
    getDataMock.mockReturnValue({});

    const cmd = createCapabilitiesCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["node", "test", "--api-matrix"], { from: "user" });
    console.log = originalLog;

    const parsed = JSON.parse(output.join("\n")) as {
      source: string;
      summary: { total: number };
      recommendations: string[];
    };
    expect(parsed.source).toBe("live");
    expect(parsed.summary.total).toBe(3);
    expect(parsed.recommendations.length).toBe(1);
    expect(probeApiMatrixMock).toHaveBeenCalledTimes(1);
  });

  it("returns API matrix summary in count mode", async () => {
    getDataMock.mockReturnValue({});

    const cmd = createCapabilitiesCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["node", "test", "--api-matrix", "--count"], { from: "user" });
    console.log = originalLog;

    const parsed = JSON.parse(output.join("\n")) as {
      source: string;
      recommendation_count: number;
      summary: { available: number };
    };
    expect(parsed.source).toBe("live");
    expect(parsed.summary.available).toBe(2);
    expect(parsed.recommendation_count).toBe(1);
    expect(probeApiMatrixMock).toHaveBeenCalledTimes(1);
  });
});
