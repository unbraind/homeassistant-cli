import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createConfigGetCommand } from "../src/commands/cli-config.js";
const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

vi.mock("../src/config/index.js", () => ({
  getAuthPath: vi.fn(() => "/tmp/auth.json"),
  getConfig: vi.fn(() => ({
    url: "http://localhost:8123",
    token: "test-token",
    outputFormat: "json",
    timeout: 30000,
    readOnly: false,
  })),
  getConfigPath: vi.fn(() => "/tmp/settings.json"),
  getConfigSnapshot: vi.fn(() => ({
    url: "http://localhost:8123",
    token: "token-123",
    outputFormat: "toon",
    timeout: 30000,
    readOnly: false,
  })),
  getData: vi.fn(() => ({
    lastValidatedAt: "2026-03-02T10:00:00Z",
    lastVersion: "2026.1.3",
    lastLocation: "Home",
    capabilitiesCache: {
      checkedAt: "2026-03-02T10:01:00Z",
      report: { ok: true },
    },
  })),
  getDataPath: vi.fn(() => "/tmp/data.json"),
  saveConfig: vi.fn(),
  saveData: vi.fn(),
}));

vi.mock("../src/utils/github-star.js", () => ({
  maybePromptToStarRepo: vi.fn(async () => undefined),
}));

describe("settings get command", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns runtime summary by default", async () => {
    const cmd = createConfigGetCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["node", "test"], { from: "user" });

    console.log = originalLog;
    const parsed = JSON.parse(output.join("\n")) as Record<string, unknown>;
    expect(parsed["runtime"]).toBeUndefined();
    expect(parsed["runtimeSummary"]).toBeTruthy();
  });

  it("includes full runtime metadata when requested", async () => {
    const cmd = createConfigGetCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["node", "test", "--include-runtime"], { from: "user" });

    console.log = originalLog;
    const parsed = JSON.parse(output.join("\n")) as Record<string, unknown>;
    expect(parsed["runtime"]).toBeTruthy();
    expect(parsed["runtimeSummary"]).toBeUndefined();
  });
});
