import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createValidateCommand } from "../src/commands/cli-config.js";

const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

vi.mock("../src/config/loader.js", () => ({
  getConfig: vi.fn(() => ({
    url: "http://localhost:8123",
    token: "test-token",
    outputFormat: "json",
    timeout: 30000,
    readOnly: false,
  })),
  saveData: vi.fn(),
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

describe("settings validate command", () => {
  beforeEach(() => {
    exitSpy.mockClear();
    mockRequest.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns structured formatter output", async () => {
    mockRequest
      .mockResolvedValueOnce(mockJson({ message: "API running." }))
      .mockResolvedValueOnce(mockJson({ version: "2026.1.3", location_name: "Home" }))
      .mockResolvedValueOnce(mockJson([
        { entity_id: "light.kitchen", state: "on", attributes: {}, last_changed: "", last_updated: "", context: { id: "", parent_id: null, user_id: null } },
      ]));

    const cmd = createValidateCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync([], { from: "user" });

    console.log = originalLog;
    const parsed = JSON.parse(output.join("\n")) as Record<string, unknown>;
    expect(parsed["status"]).toBe("VALID");
    expect(parsed["timeout_ms"]).toBe(30000);
    expect(parsed["entities"]).toBe(1);
  });
});
