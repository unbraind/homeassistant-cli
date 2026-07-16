import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRenderTemplateCommand } from "../src/commands/services.js";
import { createErrorLogCommand } from "../src/commands/history.js";

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

describe("command output formatting", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("render-template returns valid JSON output", async () => {
    mockRequest.mockResolvedValueOnce({
      statusCode: 200,
      body: { text: () => Promise.resolve("rendered value") },
    });

    const cmd = createRenderTemplateCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["{{ 1 + 1 }}"], { from: "user" });

    console.log = originalLog;
    const parsed = JSON.parse(output.join("\n"));
    expect(parsed).toEqual({ result: "rendered value" });
  });

  it("error-log returns valid JSON output", async () => {
    mockRequest.mockResolvedValueOnce({
      statusCode: 200,
      body: { text: () => Promise.resolve("error line") },
    });

    const cmd = createErrorLogCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync([], { from: "user" });

    console.log = originalLog;
    const parsed = JSON.parse(output.join("\n"));
    expect(parsed).toEqual({ error_log: "error line" });
  });
});
