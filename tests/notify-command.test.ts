import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createNotifyCommand } from "../src/commands/notify.js";

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

describe("notify command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("sends a basic notification", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createNotifyCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["mobile_app_phone", "-m", "Hello world"], { from: "user" })
    );

    expect(result).toContain("sent");
    expect(result).toContain("notify.mobile_app_phone");
    expect(result).toContain("Hello world");
  });

  it("sends a notification with title", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createNotifyCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["mobile_app_phone", "-m", "Test message", "-t", "Alert"], { from: "user" })
    );

    expect(result).toContain("sent");
    expect(result).toContain("Test message");
  });

  it("sends a notification with target", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createNotifyCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["email", "-m", "Check this", "--target", "user@example.com"], { from: "user" })
    );

    expect(result).toContain("sent");
    expect(result).toContain("notify.email");
  });

  it("sends a notification with JSON data", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createNotifyCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(
        ["mobile_app_phone", "-m", "Alert", "-d", '{"priority":"high"}'],
        { from: "user" }
      )
    );

    expect(result).toContain("sent");
    const callBody = JSON.parse((mockRequest.mock.calls[0]?.[1] as { body: string }).body);
    expect(callBody.data).toBeDefined();
  });

  it("fails on invalid JSON data", async () => {
    const errorSpy = vi.spyOn(console, "error").mockImplementation(function () {});
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createNotifyCommand();
    await cmd.parseAsync(
      ["mobile_app_phone", "-m", "Test", "-d", "not-json"],
      { from: "user" }
    );

    expect(errorSpy).toHaveBeenCalledWith("ERROR: Invalid JSON in --data");
    errorSpy.mockRestore();
  });
});
