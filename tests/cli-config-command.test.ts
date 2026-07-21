import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createConfigGetCommand } from "../src/commands/cli-config.js";
const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
const { snapshotMock, dataMock } = vi.hoisted(() => ({
  snapshotMock: vi.fn(() => ({
    url: "http://localhost:8123", token: "token-123", outputFormat: "toon" as const,
    timeout: 30000, readOnly: false,
  })),
  dataMock: vi.fn(() => ({
    lastValidatedAt: "2026-03-02T10:00:00Z", lastVersion: "2026.1.3", lastLocation: "Home",
    capabilitiesCache: { checkedAt: "2026-03-02T10:01:00Z", report: { ok: true } },
  })),
}));

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
  getConfigSnapshot: snapshotMock,
  getData: dataMock,
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
    snapshotMock.mockReturnValue({ url: "http://localhost:8123", token: "token-123", outputFormat: "toon", timeout: 30000, readOnly: false });
    dataMock.mockReturnValue({
      lastValidatedAt: "2026-03-02T10:00:00Z", lastVersion: "2026.1.3", lastLocation: "Home",
      capabilitiesCache: { checkedAt: "2026-03-02T10:01:00Z", report: { ok: true } },
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns runtime summary by default", async () => {
    const cmd = createConfigGetCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync([], { from: "user" });

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

    await cmd.parseAsync(["--include-runtime"], { from: "user" });

    console.log = originalLog;
    const parsed = JSON.parse(output.join("\n")) as Record<string, unknown>;
    expect(parsed["runtime"]).toBeTruthy();
    expect(parsed["runtimeSummary"]).toBeUndefined();
  });

  it("uses safe defaults and can show a missing token explicitly", async () => {
    snapshotMock.mockReturnValue({});
    dataMock.mockReturnValue({});
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (message: string) => output.push(message);
    await createConfigGetCommand().parseAsync(["--show-token", "--runtime-summary"], { from: "user" });
    console.log = originalLog;
    expect(JSON.parse(output.join("\n"))).toMatchObject({
      url: "NOT_SET", outputFormat: "toon", timeout: 30000, readOnly: false, token: "NOT_SET",
      runtimeSummary: { lastValidatedAt: null, lastVersion: null, lastLocation: null, capabilitiesCache: null },
    });
  });

  it("reports a missing token without explicit token display", async () => {
    snapshotMock.mockReturnValue({});
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (message: string) => output.push(message);
    await createConfigGetCommand().parseAsync([], { from: "user" });
    console.log = originalLog;
    expect((JSON.parse(output.join("\n")) as { token: string }).token).toBe("NOT_SET");
  });

  it("shows a configured token only with explicit consent", async () => {
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (message: string) => output.push(message);
    await createConfigGetCommand().parseAsync(["--show-token"], { from: "user" });
    console.log = originalLog;
    expect((JSON.parse(output.join("\n")) as { token: string }).token).toBe("token-123");
  });
});
