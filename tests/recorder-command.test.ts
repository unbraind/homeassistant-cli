import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRecorderCommand } from "../src/commands/recorder.js";

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

describe("recorder command", () => {
  beforeEach(() => { mockRequest.mockReset(); exitSpy.mockClear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it("purges old recorder data", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createRecorderCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--purge"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("purge");
  });

  it("purges with keep-days and repack", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createRecorderCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--purge", "--keep-days", "7", "--repack"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.keep_days).toBe(7);
    expect(parsed.repack).toBe(true);
  });

  it("rejects invalid keep-days", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const cmd = createRecorderCommand();
    await cmd.parseAsync(["node", "test", "--purge", "--keep-days", "abc"], { from: "user" });
    expect(exitSpy).toHaveBeenCalledWith(1);
    errSpy.mockRestore();
  });

  it("purges specific entities", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createRecorderCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--purge-entities", "sensor.temp,sensor.humidity"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("purge_entities");
    expect(parsed.entity_ids).toEqual(["sensor.temp", "sensor.humidity"]);
  });

  it("rejects empty purge-entities list", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const cmd = createRecorderCommand();
    await cmd.parseAsync(["node", "test", "--purge-entities", "  "], { from: "user" });
    expect(exitSpy).toHaveBeenCalledWith(1);
    errSpy.mockRestore();
  });

  it("enables the recorder", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createRecorderCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--enable"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("enabled");
  });

  it("disables the recorder", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createRecorderCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--disable"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("disabled");
  });

  it("exits with error when no flags given", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const cmd = createRecorderCommand();
    await cmd.parseAsync(["node", "test"], { from: "user" });
    expect(exitSpy).toHaveBeenCalledWith(1);
    errSpy.mockRestore();
  });
});
