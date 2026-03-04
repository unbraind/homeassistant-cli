import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSupervisorCommand } from "../src/commands/supervisor.js";

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

function mockResponse(data: unknown, status = 200) {
  return {
    statusCode: status,
    body: {
      text: () => Promise.resolve(JSON.stringify(data)),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    },
  };
}

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

describe("supervisor command extended", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("gets addon info with --info flag", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({
      result: "ok",
      data: { slug: "core_ssh", name: "SSH & Web Terminal", state: "started" },
    }));

    const cmd = createSupervisorCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["addons", "--info", "core_ssh"], { from: "user" })
    );

    expect(result).toContain("core_ssh");
  });

  it("starts an addon with --start flag", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ result: "ok" }));

    const cmd = createSupervisorCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["addons", "--start", "core_ssh"], { from: "user" })
    );

    expect(result).toContain("ok");
  });

  it("stops an addon with --stop flag", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ result: "ok" }));

    const cmd = createSupervisorCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["addons", "--stop", "core_ssh"], { from: "user" })
    );

    expect(result).toContain("ok");
  });

  it("restarts an addon with --restart flag", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ result: "ok" }));

    const cmd = createSupervisorCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["addons", "--restart", "core_ssh"], { from: "user" })
    );

    expect(result).toContain("ok");
  });

  it("lists addons by default (no flags)", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ result: "ok", data: { addons: [{ slug: "core_ssh" }] } }));

    const cmd = createSupervisorCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["addons"], { from: "user" })
    );

    expect(result).toContain("core_ssh");
  });

  it("reboots host with --reboot flag", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ result: "ok" }));

    const cmd = createSupervisorCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["host", "--reboot"], { from: "user" })
    );

    expect(result).toContain("ok");
    const url = mockRequest.mock.calls[0]?.[0] as string;
    expect(url).toContain("/host/reboot");
  });

  it("shuts down host with --shutdown flag", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ result: "ok" }));

    const cmd = createSupervisorCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["host", "--shutdown"], { from: "user" })
    );

    expect(result).toContain("ok");
    const url = mockRequest.mock.calls[0]?.[0] as string;
    expect(url).toContain("/host/shutdown");
  });

  it("fetches supervisor logs", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({
      result: "ok",
      data: "Supervisor log content...",
    }));

    const cmd = createSupervisorCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["logs"], { from: "user" })
    );

    expect(result).toContain("ok");
  });

  it("adds actionable guidance for 404 supervisor responses", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ message: "Not Found" }, 404));

    const cmd = createSupervisorCommand();
    await expect(
      cmd.parseAsync(["addons", "--list"], { from: "user" })
    ).rejects.toThrow(/Supervisor API is unavailable/);
  });

  it("rethrows non-401/404 errors", async () => {
    mockRequest.mockRejectedValueOnce(new Error("Network error"));

    const cmd = createSupervisorCommand();
    await expect(
      cmd.parseAsync(["addons", "--list"], { from: "user" })
    ).rejects.toThrow("Network error");
  });

  it("calls raw api with POST method and data", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ result: "ok" }));

    const cmd = createSupervisorCommand();
    await captureLog(() =>
      cmd.parseAsync(["api", "-m", "POST", "-p", "/addons/core_ssh/start", "--data", '{"key":"val"}'], { from: "user" })
    );

    expect(mockRequest).toHaveBeenCalledWith(
      expect.stringContaining("/hassio/addons/core_ssh/start"),
      expect.objectContaining({ method: "POST" })
    );
  });

  it("throws on invalid HTTP method", async () => {
    const cmd = createSupervisorCommand();
    await expect(
      cmd.parseAsync(["api", "-m", "INVALID", "-p", "/addons"], { from: "user" })
    ).rejects.toThrow(/Invalid method/);
  });

  it("throws when path is missing from api command", async () => {
    const cmd = createSupervisorCommand();
    await expect(
      cmd.parseAsync(["api", "-m", "GET"], { from: "user" })
    ).rejects.toThrow(/path is required/);
  });
});
