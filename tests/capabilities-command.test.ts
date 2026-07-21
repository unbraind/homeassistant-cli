import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCapabilitiesCommand } from "../src/commands/capabilities.js";

const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
const { getDataMock, saveDataMock, probeApiMatrixMock, apiBehavior } = vi.hoisted(() => ({
  getDataMock: vi.fn(),
  saveDataMock: vi.fn(),
  probeApiMatrixMock: vi.fn(),
  apiBehavior: {
    statusMessage: "API running.",
    installationType: "Home Assistant OS" as string | undefined,
    websocketError: undefined as Error | undefined,
    configEntriesError: undefined as Error | undefined,
    supervisorError: new Error("API request failed: 401 - Unauthorized") as Error | undefined,
    includeConversation: true,
    includeTts: false,
  },
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
      return { message: apiBehavior.statusMessage };
    }
    async getConfig() {
      return { version: "2026.1.3", location_name: "Home", installation_type: apiBehavior.installationType };
    }
    async getServices() {
      return [
        { domain: "light", services: { turn_on: {}, turn_off: {} } },
        ...(apiBehavior.includeConversation ? [{ domain: "conversation", services: { process: {} } }] : []),
        ...(apiBehavior.includeTts ? [{ domain: "tts", services: { speak: {} } }] : []),
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
      if (apiBehavior.configEntriesError) throw apiBehavior.configEntriesError;
      return [{ entry_id: "1" }];
    }
  },
  HomeAssistantWebSocketClient: class {
    async connect() {
      if (apiBehavior.websocketError) throw apiBehavior.websocketError;
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
      if (apiBehavior.supervisorError) throw apiBehavior.supervisorError;
      return [];
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
    apiBehavior.statusMessage = "API running.";
    apiBehavior.installationType = "Home Assistant OS";
    apiBehavior.websocketError = undefined;
    apiBehavior.configEntriesError = undefined;
    apiBehavior.supervisorError = new Error("API request failed: 401 - Unauthorized");
    apiBehavior.includeConversation = true;
    apiBehavior.includeTts = false;
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

    await cmd.parseAsync([], { from: "user" });
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

    await cmd.parseAsync(["--refresh", "--count"], { from: "user" });
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

    await cmd.parseAsync(["--agent-plan"], { from: "user" });
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

    await cmd.parseAsync(["--agent-profile"], { from: "user" });
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

    await cmd.parseAsync(["--agent-context"], { from: "user" });
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

    await cmd.parseAsync(["--redact-private"], { from: "user" });
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

    await cmd.parseAsync(["--api-matrix"], { from: "user" });
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

    await cmd.parseAsync(["--api-matrix", "--count"], { from: "user" });
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

  it("returns and redacts a live report while probing optional capability failures", async () => {
    getDataMock.mockReturnValue({});
    apiBehavior.statusMessage = "API starting";
    apiBehavior.installationType = undefined;
    apiBehavior.websocketError = new Error("socket unavailable");
    apiBehavior.configEntriesError = new Error("API request failed: 404 - Not Found");
    apiBehavior.supervisorError = undefined;

    const output: string[] = [];
    const originalLog = console.log;
    console.log = (message: string) => output.push(message);
    await createCapabilitiesCommand().parseAsync(["--refresh", "--redact-private"], { from: "user" });
    console.log = originalLog;

    const parsed = JSON.parse(output.join("\n")) as {
      source: string;
      report: {
        api: { location: string; installation_type: string };
        counts: { config_entry_count?: number };
        capabilities: Record<string, { status: string }>;
      };
    };
    expect(parsed.source).toBe("live");
    expect(parsed.report.api.location).toBe("[REDACTED]");
    expect(parsed.report.api.installation_type).toBe("unknown");
    expect(parsed.report.counts.config_entry_count).toBeUndefined();
    expect(parsed.report.capabilities["rest_api"]?.status).toBe("error");
    expect(parsed.report.capabilities["websocket"]?.status).toBe("error");
    expect(parsed.report.capabilities["config_entries"]?.status).toBe("unavailable");
    expect(parsed.report.capabilities["supervisor"]?.status).toBe("available");
  });

  it("reports conversation as unavailable and TTS as available from service discovery", async () => {
    getDataMock.mockReturnValue({});
    apiBehavior.includeConversation = false;
    apiBehavior.includeTts = true;
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (message: string) => output.push(message);
    await createCapabilitiesCommand().parseAsync(["--refresh"], { from: "user" });
    console.log = originalLog;
    const capabilities = (JSON.parse(output.join("\n")) as {
      report: { capabilities: Record<string, { status: string }> };
    }).report.capabilities;
    expect(capabilities["conversation"]?.status).toBe("unavailable");
    expect(capabilities["tts"]?.status).toBe("available");
  });

  it.each([
    ["--agent-plan", "plan"],
    ["--agent-profile", "profile"],
    ["--agent-context", "summary"],
  ])("returns a live %s payload", async (option, expectedKey) => {
    getDataMock.mockReturnValue({});
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (message: string) => output.push(message);
    await createCapabilitiesCommand().parseAsync(["--refresh", option], { from: "user" });
    console.log = originalLog;

    const parsed = JSON.parse(output.join("\n")) as Record<string, unknown>;
    expect(parsed["source"]).toBe("live");
    expect(parsed[expectedKey]).toBeDefined();
  });

  it("returns cached counts", async () => {
    const checkedAt = new Date().toISOString();
    getDataMock.mockReturnValue({
      capabilitiesCache: {
        checkedAt,
        report: {
          checked_at: checkedAt,
          api: { version: "2026.1.3", location: "Home", installation_type: "OS" },
          counts: { entity_count: 0, service_domain_count: 0, service_count: 0 },
          service_domains: [], entity_domains: {},
          capabilities: { rest_api: { status: "available", endpoint: "/api/" } },
          hints: [],
        },
      },
    });
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (message: string) => output.push(message);
    await createCapabilitiesCommand().parseAsync(["--count"], { from: "user" });
    console.log = originalLog;
    expect(JSON.parse(output.join("\n"))).toMatchObject({ source: "cache", entity_count: 0 });
  });

  it.each([
    [{ capabilitiesCache: { checkedAt: "not-a-date", report: { invalid: true } } }],
    [{ capabilitiesCache: { checkedAt: new Date(0).toISOString(), report: { invalid: true } } }],
    [{ capabilitiesCache: { checkedAt: new Date().toISOString(), report: null } }],
  ])("ignores unusable cache data and performs a live probe", async (cachedData) => {
    getDataMock.mockReturnValue(cachedData);
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (message: string) => output.push(message);
    await createCapabilitiesCommand().parseAsync([], { from: "user" });
    console.log = originalLog;
    expect(JSON.parse(output.join("\n"))).toMatchObject({ source: "live" });
  });

  it("rejects a fresh cache with an invalid report shape", async () => {
    getDataMock.mockReturnValue({
      capabilitiesCache: { checkedAt: new Date().toISOString(), report: { checked_at: "invalid" } },
    });
    await expect(createCapabilitiesCommand().parseAsync([], { from: "user" })).rejects.toThrow(
      "Invalid cached capabilities report shape"
    );
  });

  it("rejects a fresh primitive cache report", async () => {
    getDataMock.mockReturnValue({ capabilitiesCache: { checkedAt: new Date().toISOString(), report: "invalid" } });
    await expect(createCapabilitiesCommand().parseAsync([], { from: "user" })).rejects.toThrow(
      "Invalid cached capabilities report shape"
    );
  });
});
