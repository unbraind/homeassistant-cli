import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createRestartCommand,
  createStopCommand,
  createAnalyticsCommand,
  createBackupsCommand,
} from "../src/commands/system.js";

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

describe("restart command", () => {
  beforeEach(() => { mockRequest.mockReset(); exitSpy.mockClear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it("restarts Home Assistant", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ message: "Restarting" }));

    const cmd = createRestartCommand();
    const result = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );

    expect(result).toContain("restarting");
    expect(result).toContain("Home Assistant is restarting");
  });
});

describe("stop command", () => {
  beforeEach(() => { mockRequest.mockReset(); exitSpy.mockClear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it("stops Home Assistant", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ message: "Stopping" }));

    const cmd = createStopCommand();
    const result = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );

    expect(result).toContain("stopping");
    expect(result).toContain("Home Assistant is stopping");
  });
});

describe("analytics command", () => {
  beforeEach(() => { mockRequest.mockReset(); exitSpy.mockClear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it("returns analytics data", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({
      huuid: "abc123",
      version: "2024.1.0",
      installation_type: "Home Assistant OS",
    }));

    const cmd = createAnalyticsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );

    expect(result).toContain("abc123");
  });

  it("handles 404 gracefully (analytics not enabled)", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ message: "Not Found" }, 404));

    const cmd = createAnalyticsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );

    expect(result).toContain("Analytics endpoint not available");
  });
});

describe("backups command", () => {
  beforeEach(() => { mockRequest.mockReset(); exitSpy.mockClear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it("shows backup info message without subcommand", async () => {
    const cmd = createBackupsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );

    expect(result).toContain("Backup management requires");
  });

  it("creates a backup", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createBackupsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--create", "my-backup"], { from: "user" })
    );

    expect(result).toContain("created");
    expect(result).toContain("my-backup");
  });

  it("handles 404 on backup create gracefully", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ message: "Not Found" }, 404));

    const cmd = createBackupsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--create", "my-backup"], { from: "user" })
    );

    expect(result).toContain("Backup service not available");
  });

  it("restores a backup", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createBackupsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--restore", "backup-slug-123"], { from: "user" })
    );

    expect(result).toContain("restored");
    expect(result).toContain("backup-slug-123");
  });

  it("handles 404 on backup restore gracefully", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ message: "Not Found" }, 404));

    const cmd = createBackupsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--restore", "backup-slug-123"], { from: "user" })
    );

    expect(result).toContain("Restore service not available");
  });

  it("creates a backup with password", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createBackupsCommand();
    await captureLog(() =>
      cmd.parseAsync(["--create", "secure-backup", "--password", "secret123"], { from: "user" })
    );

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.password).toBe("secret123");
    expect(body.name).toBe("secure-backup");
  });

  it("rethrows non-404 error on backup create", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ message: "Internal Server Error" }, 500));

    const cmd = createBackupsCommand();
    await expect(
      captureLog(() =>
        cmd.parseAsync(["--create", "my-backup"], { from: "user" })
      )
    ).rejects.toThrow();
  });

  it("rethrows non-404 error on backup restore", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ message: "Internal Server Error" }, 500));

    const cmd = createBackupsCommand();
    await expect(
      captureLog(() =>
        cmd.parseAsync(["--restore", "backup-slug-123"], { from: "user" })
      )
    ).rejects.toThrow();
  });
});
