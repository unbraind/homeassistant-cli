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

describe("supervisor command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("supports raw supervisor api passthrough", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ result: "ok", data: { healthy: true } }));

    const cmd = createSupervisorCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["api", "-m", "GET", "-p", "/addons"], { from: "user" });

    console.log = originalLog;
    const parsed = JSON.parse(output.join("\n"));
    expect(parsed.result).toBe("ok");
  });

  it("lists addons", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ result: "ok", data: { addons: [] } }));

    const cmd = createSupervisorCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["addons", "--list"], { from: "user" });

    console.log = originalLog;
    const parsed = JSON.parse(output.join("\n"));
    expect(parsed.result).toBe("ok");
  });

  it("supports --endpoint alias for raw supervisor api passthrough", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ result: "ok", data: { healthy: true } }));

    const cmd = createSupervisorCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["api", "-m", "GET", "--endpoint", "/addons"], { from: "user" });

    console.log = originalLog;
    const parsed = JSON.parse(output.join("\n"));
    expect(parsed.result).toBe("ok");
  });
});
