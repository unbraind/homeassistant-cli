import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createUpdateCommand } from "../src/commands/update.js";

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

const updateStates = [
  {
    entity_id: "update.home_assistant_core",
    state: "on",
    attributes: {
      friendly_name: "Home Assistant Core Update",
      installed_version: "2026.1.0",
      latest_version: "2026.2.0",
      title: "Home Assistant Core",
      release_url: "https://www.home-assistant.io/latest-release-notes/",
      auto_update: false,
      skipped_version: null,
      in_progress: false,
    },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "update.home_assistant_supervisor",
    state: "off",
    attributes: {
      friendly_name: "HA Supervisor Update",
      installed_version: "2025.10.0",
      latest_version: "2025.10.0",
      title: "Home Assistant Supervisor",
      release_url: null,
      auto_update: true,
      skipped_version: null,
      in_progress: false,
    },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "switch.unrelated",
    state: "on",
    attributes: {},
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
];

function captureLog(fn: () => Promise<void>): Promise<string> {
  const output: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => output.push(msg);
  return fn().then(() => {
    console.log = originalLog;
    return output.join("\n");
  }).catch((err) => {
    console.log = originalLog;
    throw err;
  });
}

describe("update command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists all update entities", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(updateStates));
    const cmd = createUpdateCommand();
    const result = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );
    expect(result).toContain("update.home_assistant_core");
    expect(result).toContain("update.home_assistant_supervisor");
    expect(result).not.toContain("switch.unrelated");
  });

  it("returns count with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(updateStates));
    const cmd = createUpdateCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--count"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.updates_count).toBe(2);
  });

  it("filters pending updates with --pending", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(updateStates));
    const cmd = createUpdateCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--pending"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.updates).toHaveLength(1);
    expect(parsed.updates[0].entity_id).toBe("update.home_assistant_core");
  });

  it("installs an update via --install", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createUpdateCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--install", "update.home_assistant_core"], { from: "user" })
    );
    expect(result).toContain("install_started");
    expect(result).toContain("update.home_assistant_core");
    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.entity_id).toBe("update.home_assistant_core");
  });

  it("installs a specific version via --install --version", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createUpdateCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--install", "update.home_assistant_core", "--version", "2026.2.0"], { from: "user" })
    );
    expect(result).toContain("install_started");
    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.version).toBe("2026.2.0");
  });

  it("requests a backup before a direct install", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    await captureLog(() => createUpdateCommand().parseAsync([
      "--install", "update.home_assistant_core", "--backup",
    ], { from: "user" }));
    expect(JSON.parse((mockRequest.mock.calls[0]?.[1] as { body: string }).body).backup).toBe(true);
  });

  it("installs via --entity-id --version", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createUpdateCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entity-id", "update.home_assistant_core", "--version", "2026.2.0"], { from: "user" })
    );
    expect(result).toContain("install_started");
    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.entity_id).toBe("update.home_assistant_core");
    expect(body.version).toBe("2026.2.0");
  });

  it("requests a backup before an entity-version install", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    await captureLog(() => createUpdateCommand().parseAsync([
      "--entity-id", "update.home_assistant_core", "--version", "2026.2.0", "--backup",
    ], { from: "user" }));
    expect(JSON.parse((mockRequest.mock.calls[0]?.[1] as { body: string }).body).backup).toBe(true);
  });

  it("skips an update via --skip", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createUpdateCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--skip", "update.home_assistant_core"], { from: "user" })
    );
    expect(result).toContain("skipped");
    expect(result).toContain("update.home_assistant_core");
  });

  it("clears skipped update via --clear-skipped", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createUpdateCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--clear-skipped", "update.home_assistant_core"], { from: "user" })
    );
    expect(result).toContain("cleared_skipped");
  });
});
