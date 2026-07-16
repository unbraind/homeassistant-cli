import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createPersonsCommand, createZonesCommand, createSystemLogCommand, createFrontendCommand } from "../src/commands/system.js";

const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

vi.mock("../src/config/loader.js", () => ({
  getConfig: vi.fn(() => ({
    url: "http://localhost:8123",
    token: "test-token",
    outputFormat: "json",
    timeout: 30000,
    readOnly: false,
  })),
}));

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

function captureLog(fn: () => Promise<void>): Promise<string> {
  const output: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => output.push(msg);
  return fn().then(() => {
    console.log = originalLog;
    return output.join("\n");
  });
}

const allStates = [
  {
    entity_id: "person.john",
    state: "home",
    attributes: {
      friendly_name: "John",
      device_trackers: ["device_tracker.phone"],
      user_id: "user-123",
    },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "person.jane",
    state: "not_home",
    attributes: {
      friendly_name: "Jane",
      device_trackers: [],
      user_id: "user-456",
    },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "zone.home",
    state: "2",
    attributes: {
      friendly_name: "Home",
      latitude: 40.7128,
      longitude: -74.006,
      radius: 100,
      passive: false,
    },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "zone.work",
    state: "0",
    attributes: {
      friendly_name: "Work",
      latitude: 40.758,
      longitude: -73.9855,
      radius: 50,
      passive: false,
    },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "light.kitchen",
    state: "on",
    attributes: {},
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
];

describe("persons command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists persons", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(allStates));

    const cmd = createPersonsCommand();
    const result = await captureLog(() => cmd.parseAsync([], { from: "user" }));

    expect(result).toContain("person.john");
    expect(result).toContain("John");
    expect(result).toContain("person.jane");
    expect(result).toContain("Jane");
    expect(result).not.toContain("light.kitchen");
  });

  it("lists persons with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(allStates));

    const cmd = createPersonsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--count"], { from: "user" })
    );

    expect(result).toContain("persons_count");
    expect(result).toContain("2");
  });
});

describe("zones command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists zones", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(allStates));

    const cmd = createZonesCommand();
    const result = await captureLog(() => cmd.parseAsync([], { from: "user" }));

    expect(result).toContain("zone.home");
    expect(result).toContain("Home");
    expect(result).toContain("zone.work");
    expect(result).toContain("Work");
    expect(result).toContain("40.7128");
    expect(result).not.toContain("light.kitchen");
  });

  it("lists zones with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(allStates));

    const cmd = createZonesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--count"], { from: "user" })
    );

    expect(result).toContain("zones_count");
    expect(result).toContain("2");
  });
});

describe("system-log command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("clears the system log", async () => {
    mockRequest.mockResolvedValue(mockResponse(null));
    const cmd = createSystemLogCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--clear"], { from: "user" })
    );
    expect(result).toContain("success");
    expect(mockRequest).toHaveBeenCalledWith(
      expect.stringContaining("/api/services/system_log/clear"),
      expect.any(Object)
    );
  });

  it("writes a custom log entry with defaults", async () => {
    mockRequest.mockResolvedValue(mockResponse(null));
    const cmd = createSystemLogCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--write", "Test message"], { from: "user" })
    );
    expect(result).toContain("Test message");
    expect(result).toContain("warning");
  });

  it("writes a custom log entry with custom level and logger", async () => {
    mockRequest.mockResolvedValue(mockResponse(null));
    const cmd = createSystemLogCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--write", "Debug msg", "--level", "debug", "--logger", "my.logger"], { from: "user" })
    );
    expect(result).toContain("debug");
  });

  it("shows help when no action specified", async () => {
    const cmd = createSystemLogCommand();
    const result = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );
    expect(result).toContain("--clear");
    expect(result).toContain("available_levels");
  });
});

describe("frontend command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("reloads themes", async () => {
    mockRequest.mockResolvedValue(mockResponse(null));
    const cmd = createFrontendCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--reload-themes"], { from: "user" })
    );
    expect(result).toContain("success");
    expect(mockRequest).toHaveBeenCalledWith(
      expect.stringContaining("/api/services/frontend/reload_themes"),
      expect.any(Object)
    );
  });

  it("sets a theme by name", async () => {
    mockRequest.mockResolvedValue(mockResponse(null));
    const cmd = createFrontendCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--set-theme", "default"], { from: "user" })
    );
    expect(result).toContain("default");
    expect(mockRequest).toHaveBeenCalledWith(
      expect.stringContaining("/api/services/frontend/set_theme"),
      expect.any(Object)
    );
  });

  it("sets theme with dark mode variant", async () => {
    mockRequest.mockResolvedValue(mockResponse(null));
    const cmd = createFrontendCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--set-theme", "light", "--dark-theme", "dark"], { from: "user" })
    );
    expect(result).toContain("light");
    expect(result).toContain("dark");
  });

  it("shows help when no action specified", async () => {
    const cmd = createFrontendCommand();
    const result = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );
    expect(result).toContain("--reload-themes");
  });
});
