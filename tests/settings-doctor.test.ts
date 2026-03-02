import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createDoctorCommand } from "../src/commands/settings-doctor.js";

const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

vi.mock("../src/config/loader.js", () => ({
  getConfig: vi.fn(() => ({
    url: "http://localhost:8123",
    token: "test-token",
    outputFormat: "json",
    timeout: 30000,
    readOnly: false,
  })),
  getConfigPath: vi.fn(() => "/tmp/settings.json"),
  getAuthPath: vi.fn(() => "/tmp/auth.json"),
  getDataPath: vi.fn(() => "/tmp/data.json"),
  getData: vi.fn(() => ({ lastValidatedAt: "2026-03-02T00:00:00.000Z" })),
}));

vi.mock("../src/utils/github-star.js", () => ({
  maybePromptToStarRepo: vi.fn(async () => undefined),
}));

vi.mock("undici", () => ({
  request: vi.fn(),
}));

import { request } from "undici";

const mockRequest = request as ReturnType<typeof vi.fn>;

function mockJson(data: unknown, status = 200) {
  return {
    statusCode: status,
    body: {
      text: () => Promise.resolve(JSON.stringify(data)),
      arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
    },
  };
}

describe("settings doctor command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns diagnostics report and skips supervisor when requested", async () => {
    mockRequest
      .mockResolvedValueOnce(mockJson({ message: "API running." }))
      .mockResolvedValueOnce(mockJson({ version: "2026.1.3", location_name: "Home" }))
      .mockResolvedValueOnce(mockJson([{ entity_id: "light.kitchen", state: "on", attributes: {}, last_changed: "", last_updated: "", context: { id: "", parent_id: null, user_id: null } }]));

    const cmd = createDoctorCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["--skip-supervisor"], { from: "user" });

    console.log = originalLog;
    const parsed = JSON.parse(output.join("\n")) as Record<string, unknown>;
    expect(parsed["healthy"]).toBe(true);
    expect((parsed["api"] as Record<string, unknown>)["entity_count"]).toBe(1);
    expect((parsed["output_validation"] as Record<string, unknown>)["all_valid"]).toBe(true);
    expect((parsed["supervisor"] as Record<string, unknown>)["skipped"]).toBe(true);
  });

  it("classifies supervisor unauthorized errors", async () => {
    mockRequest
      .mockResolvedValueOnce(mockJson({ message: "API running." }))
      .mockResolvedValueOnce(mockJson({ version: "2026.1.3", location_name: "Home" }))
      .mockResolvedValueOnce(mockJson([]))
      .mockResolvedValueOnce(mockJson({ message: "Unauthorized" }, 401));

    const cmd = createDoctorCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync([], { from: "user" });

    console.log = originalLog;
    const parsed = JSON.parse(output.join("\n")) as Record<string, unknown>;
    const supervisor = parsed["supervisor"] as Record<string, unknown>;
    expect(supervisor["available"]).toBe(false);
    expect(supervisor["code"]).toBe("unauthorized");
  });
});
