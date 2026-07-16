import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createHistoryCommand, createLogbookCommand, createErrorLogCommand } from "../src/commands/history.js";

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
  }).catch((err) => {
    console.log = originalLog;
    throw err;
  });
}

const sampleHistory = [
  [
    {
      entity_id: "light.kitchen",
      state: "on",
      attributes: { brightness: 200 },
      last_changed: "2024-01-01T00:00:00Z",
      last_updated: "2024-01-01T00:00:00Z",
    },
    {
      entity_id: "light.kitchen",
      state: "off",
      attributes: { brightness: 0 },
      last_changed: "2024-01-01T01:00:00Z",
      last_updated: "2024-01-01T01:00:00Z",
    },
  ],
];

const sampleLogbook = [
  {
    when: "2024-01-01T00:00:00Z",
    name: "Kitchen Light",
    entity_id: "light.kitchen",
    state: "on",
    message: "turned on",
  },
  {
    when: "2024-01-01T01:00:00Z",
    name: "Kitchen Light",
    entity_id: "light.kitchen",
    state: "off",
    message: "turned off",
  },
];

describe("history command", () => {
  beforeEach(() => { mockRequest.mockReset(); exitSpy.mockClear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it("returns history for an entity", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleHistory));

    const cmd = createHistoryCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entity-id", "light.kitchen"], { from: "user" })
    );

    expect(result).toContain("light.kitchen");
  });

  it("returns history with start and end time", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleHistory));

    const cmd = createHistoryCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(
        [
          "--entity-id", "light.kitchen",
          "--start-time", "2024-01-01T00:00:00Z",
          "--end-time", "2024-01-02T00:00:00Z",
        ],
        { from: "user" }
      )
    );

    expect(result).toContain("light.kitchen");
    // start/end time should be included in the request URL
    const url = mockRequest.mock.calls[0]?.[0] as string;
    expect(url).toContain("2024-01-01");
  });

  it("returns history with --minimal-response", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleHistory));

    const cmd = createHistoryCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(
        ["--entity-id", "light.kitchen", "--minimal-response"],
        { from: "user" }
      )
    );

    expect(result).toContain("light.kitchen");
    const url = mockRequest.mock.calls[0]?.[0] as string;
    expect(url).toContain("minimal_response");
  });

  it("returns history with --significant-only", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleHistory));

    const cmd = createHistoryCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(
        ["--entity-id", "light.kitchen", "--significant-only"],
        { from: "user" }
      )
    );

    expect(result).toContain("light.kitchen");
    const url = mockRequest.mock.calls[0]?.[0] as string;
    expect(url).toContain("significant_changes_only");
  });

  it("supports multiple comma-separated entities", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([
      ...sampleHistory,
      [{ entity_id: "switch.fan", state: "on", attributes: {}, last_changed: "2024-01-01T00:00:00Z", last_updated: "2024-01-01T00:00:00Z" }],
    ]));

    const cmd = createHistoryCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(
        ["--entity-id", "light.kitchen,switch.fan"],
        { from: "user" }
      )
    );

    expect(result).toContain("light.kitchen");
  });
});

describe("logbook command", () => {
  beforeEach(() => { mockRequest.mockReset(); exitSpy.mockClear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it("returns logbook entries", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleLogbook));

    const cmd = createLogbookCommand();
    const result = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );

    expect(result).toContain("light.kitchen");
    expect(result).toContain("turned on");
  });

  it("returns logbook filtered by entity", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleLogbook));

    const cmd = createLogbookCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entity-id", "light.kitchen"], { from: "user" })
    );

    expect(result).toContain("light.kitchen");
    const url = mockRequest.mock.calls[0]?.[0] as string;
    expect(url).toContain("light.kitchen");
  });

  it("returns logbook with time range", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sampleLogbook));

    const cmd = createLogbookCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(
        [
          "--start-time", "2024-01-01T00:00:00Z",
          "--end-time", "2024-01-02T00:00:00Z",
        ],
        { from: "user" }
      )
    );

    expect(result).toContain("light.kitchen");
  });
});

describe("error-log command", () => {
  beforeEach(() => { mockRequest.mockReset(); exitSpy.mockClear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it("returns error log content", async () => {
    mockRequest.mockResolvedValueOnce({
      statusCode: 200,
      body: {
        text: () => Promise.resolve("2024-01-01 ERROR Some error occurred\n2024-01-01 WARNING Something else"),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      },
    });

    const cmd = createErrorLogCommand();
    const result = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );

    expect(result).toContain("error_log");
    expect(result).toContain("Some error occurred");
  });
});
