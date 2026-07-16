import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLoggerCommand } from "../src/commands/logger.js";

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

vi.mock("undici", () => ({ request: vi.fn() }));

import { request } from "undici";
const mockRequest = request as ReturnType<typeof vi.fn>;

const mockResponse = (data: unknown, status = 200) => ({
  statusCode: status,
  body: { text: () => Promise.resolve(JSON.stringify(data)) },
});

function captureLog(fn: () => Promise<void>): Promise<string> {
  const output: string[] = [];
  const orig = console.log;
  console.log = (msg: string) => output.push(msg);
  return fn()
    .then(() => { console.log = orig; return output.join("\n"); })
    .catch((err) => { console.log = orig; throw err; });
}

describe("logger command", () => {
  beforeEach(() => { mockRequest.mockReset(); exitSpy.mockClear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it("sets default log level", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createLoggerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--set-default", "debug"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("set_default_level");
    expect(parsed.level).toBe("debug");
  });

  it("sets component log levels", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createLoggerCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--set", "homeassistant.components.http=debug"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("set_level");
    expect(parsed.logs["homeassistant.components.http"]).toBe("debug");
  });

  it("rejects invalid default log level", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(function () {});
    const cmd = createLoggerCommand();
    await cmd.parseAsync(["--set-default", "verbose"], { from: "user" });
    expect(exitSpy).toHaveBeenCalledWith(1);
    errSpy.mockRestore();
  });

  it("rejects invalid level in set", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(function () {});
    const cmd = createLoggerCommand();
    await cmd.parseAsync(["--set", "homeassistant.core=verbose"], { from: "user" });
    expect(exitSpy).toHaveBeenCalledWith(1);
    errSpy.mockRestore();
  });

  it("rejects malformed set entry (no =)", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(function () {});
    const cmd = createLoggerCommand();
    await cmd.parseAsync(["--set", "noequalssign"], { from: "user" });
    expect(exitSpy).toHaveBeenCalledWith(1);
    errSpy.mockRestore();
  });

  it("exits with error when no flags given", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(function () {});
    const cmd = createLoggerCommand();
    await cmd.parseAsync([], { from: "user" });
    expect(exitSpy).toHaveBeenCalledWith(1);
    errSpy.mockRestore();
  });
});
