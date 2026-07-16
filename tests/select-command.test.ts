import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSelectCommand } from "../src/commands/select.js";

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

const selectStates = [
  {
    entity_id: "select.log_level",
    state: "info",
    attributes: {
      friendly_name: "Log Level",
      options: ["error", "warning", "info", "debug"],
    },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "select.power_on_behavior",
    state: "last",
    attributes: {
      friendly_name: "Power On Behavior",
      options: ["on", "off", "last"],
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

describe("select command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists all select entities", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(selectStates));
    const cmd = createSelectCommand();
    const result = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );
    expect(result).toContain("select.log_level");
    expect(result).toContain("select.power_on_behavior");
    expect(result).not.toContain("switch.unrelated");
  });

  it("returns count with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(selectStates));
    const cmd = createSelectCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--count"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.selects_count).toBe(2);
  });

  it("sets an option via --entity-id --set", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createSelectCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entity-id", "select.log_level", "--set", "debug"], { from: "user" })
    );
    expect(result).toContain("selected_option");
    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.entity_id).toBe("select.log_level");
    expect(body.option).toBe("debug");
  });

  it("selects next option via --next", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createSelectCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--next", "select.log_level"], { from: "user" })
    );
    expect(result).toContain("select_next");
    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.entity_id).toBe("select.log_level");
  });

  it("selects previous option via --prev", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createSelectCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--prev", "select.log_level"], { from: "user" })
    );
    expect(result).toContain("select_previous");
  });

  it("selects first option via --first", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createSelectCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--first", "select.log_level"], { from: "user" })
    );
    expect(result).toContain("select_first");
  });

  it("selects last option via --last", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createSelectCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--last", "select.log_level"], { from: "user" })
    );
    expect(result).toContain("select_last");
  });

  it("filters by current state", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(selectStates));
    const cmd = createSelectCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--state", "info"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.selects).toHaveLength(1);
    expect(parsed.selects[0].entity_id).toBe("select.log_level");
  });
});
