import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockSaveConfig, mockSaveData, mockGetConfigSnapshot } = vi.hoisted(() => ({
  mockSaveConfig: vi.fn(),
  mockSaveData: vi.fn(),
  mockGetConfigSnapshot: vi.fn(() => ({})),
}));

vi.mock("../src/config/index.js", () => ({
  getConfigPath: vi.fn(() => "/tmp/hassio-wizard-test.json"),
  getAuthPath: vi.fn(() => "/tmp/auth.json"),
  getDataPath: vi.fn(() => "/tmp/data.json"),
  getConfigSnapshot: mockGetConfigSnapshot,
  saveConfig: mockSaveConfig,
  saveData: mockSaveData,
}));

vi.mock("../src/utils/github-star.js", () => ({
  maybePromptToStarRepo: vi.fn(async () => undefined),
}));

// Mock node:readline to simulate interactive input
const { mockRlQuestion, mockRlClose } = vi.hoisted(() => ({
  mockRlQuestion: vi.fn(),
  mockRlClose: vi.fn(),
}));

vi.mock("node:readline", () => ({
  createInterface: vi.fn(() => ({
    question: mockRlQuestion,
    close: mockRlClose,
  })),
}));

const { mockGetStatus, mockGetConfig } = vi.hoisted(() => ({
  mockGetStatus: vi.fn(),
  mockGetConfig: vi.fn(),
}));

vi.mock("../src/api/index.js", () => ({
  HomeAssistantClient: vi.fn().mockImplementation(() => ({
    getStatus: mockGetStatus,
    getConfig: mockGetConfig,
  })),
}));

import { createSetupCommand, createWizardCommand } from "../src/commands/settings-wizard.js";

const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

describe("settings wizard command", () => {
  beforeEach(() => {
    mockSaveConfig.mockReset();
    mockSaveData.mockReset();
    mockGetConfigSnapshot.mockReturnValue({});
    mockGetStatus.mockReset();
    mockGetConfig.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("saves config in non-interactive mode", async () => {
    const cmd = createWizardCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(
      [
        "node",
        "test",
        "--non-interactive",
        "--ha-url",
        "http://localhost:8123",
        "--ha-token",
        "token-123",
        "--default-format",
        "toon",
        "--default-timeout",
        "25000",
        "--read-only",
        "true",
        "--skip-test",
      ],
      { from: "user" }
    );

    console.log = originalLog;

    expect(mockSaveConfig).toHaveBeenCalledWith(
      {
        url: "http://localhost:8123",
        token: "token-123",
        outputFormat: "toon",
        timeout: 25000,
        readOnly: true,
      },
      undefined
    );
    expect(output.join("\n")).toContain("saved_settings:/tmp/hassio-wizard-test.json");
  });

  it("fails when required values are missing in non-interactive mode", async () => {
    const cmd = createWizardCommand();

    await cmd.parseAsync(["node", "test", "--non-interactive", "--skip-test"], { from: "user" });

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(mockSaveConfig).not.toHaveBeenCalled();
  });

  it("uses existing snapshot values in non-interactive mode", async () => {
    mockGetConfigSnapshot.mockReturnValue({
      url: "http://ha.local:8123/",
      token: "from-snapshot",
      outputFormat: "toon",
      timeout: 30000,
      readOnly: false,
    });

    const cmd = createWizardCommand();
    await cmd.parseAsync(["node", "test", "--non-interactive", "--skip-test"], { from: "user" });

    expect(mockSaveConfig).toHaveBeenCalledWith(
      {
        url: "http://ha.local:8123",
        token: "from-snapshot",
        outputFormat: "toon",
        timeout: 30000,
        readOnly: false,
      },
      undefined
    );
  });

  it("fails with invalid URL format", async () => {
    const cmd = createWizardCommand();

    await cmd.parseAsync(
      [
        "node",
        "test",
        "--non-interactive",
        "--ha-url",
        "ha.local:8123",
        "--ha-token",
        "token-123",
        "--skip-test",
      ],
      { from: "user" }
    );

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(mockSaveConfig).not.toHaveBeenCalled();
  });

  it("tests connection after saving config (success path)", async () => {
    mockGetStatus.mockResolvedValueOnce({ message: "API running." });
    mockGetConfig.mockResolvedValueOnce({ version: "2026.1.3", location_name: "Home" });

    const cmd = createWizardCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(
      [
        "node",
        "test",
        "--non-interactive",
        "--ha-url",
        "http://localhost:8123",
        "--ha-token",
        "token-123",
      ],
      { from: "user" }
    );

    console.log = originalLog;

    expect(mockSaveConfig).toHaveBeenCalled();
    expect(mockSaveData).toHaveBeenCalledWith(
      expect.objectContaining({ lastVersion: "2026.1.3", lastLocation: "Home" }),
      undefined
    );
    const allOutput = output.join("\n");
    expect(allOutput).toContain("status:API running.");
    expect(allOutput).toContain("version:2026.1.3");
    expect(allOutput).toContain("location:Home");
  });

  it("handles connection test failure gracefully", async () => {
    mockGetStatus.mockRejectedValueOnce(new Error("Connection refused"));

    const cmd = createWizardCommand();
    const errorOutput: string[] = [];
    const originalError = console.error;
    console.error = (msg: string) => errorOutput.push(msg);

    await cmd.parseAsync(
      [
        "node",
        "test",
        "--non-interactive",
        "--ha-url",
        "http://localhost:8123",
        "--ha-token",
        "token-123",
      ],
      { from: "user" }
    );

    console.error = originalError;

    // Config should still be saved even if connection test fails
    expect(mockSaveConfig).toHaveBeenCalled();
    const errText = errorOutput.join("\n");
    expect(errText).toContain("Connection test failed");
  });

  it("normalizes URL by removing trailing slash", async () => {
    const cmd = createWizardCommand();

    await cmd.parseAsync(
      [
        "node",
        "test",
        "--non-interactive",
        "--ha-url",
        "http://ha.local:8123/",
        "--ha-token",
        "token-xyz",
        "--skip-test",
      ],
      { from: "user" }
    );

    expect(mockSaveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ url: "http://ha.local:8123" }),
      undefined
    );
  });

  it("defaults to toon format when none provided", async () => {
    const cmd = createWizardCommand();

    await cmd.parseAsync(
      [
        "node",
        "test",
        "--non-interactive",
        "--ha-url",
        "http://localhost:8123",
        "--ha-token",
        "token-123",
        "--skip-test",
      ],
      { from: "user" }
    );

    expect(mockSaveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ outputFormat: "toon", timeout: 30000, readOnly: false }),
      undefined
    );
  });

  it("runs interactive mode using readline prompts", async () => {
    // Simulate user answering all prompts in sequence:
    // promptRequired(URL), promptSecretRequired(token), question(format), question(timeout), question(readOnly)
    let callIndex = 0;
    const answers = [
      "http://ha.local:8123",  // URL
      "my-token",              // token
      "json",                  // format
      "15000",                 // timeout
      "no",                    // read-only
    ];
    mockRlQuestion.mockImplementation((_prompt: string, cb: (answer: string) => void) => {
      cb(answers[callIndex++] ?? "");
    });
    mockRlClose.mockImplementation(() => undefined);

    const cmd = createWizardCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["node", "test", "--skip-test"], { from: "user" });

    console.log = originalLog;

    expect(mockSaveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "http://ha.local:8123",
        token: "my-token",
        outputFormat: "json",
        timeout: 15000,
        readOnly: false,
      }),
      undefined
    );
    expect(mockRlClose).toHaveBeenCalled();
  });

  it("retries promptRequired when empty input is provided", async () => {
    // First URL answer is empty, second is valid; token provided directly
    let callIndex = 0;
    const answers = [
      "",                      // URL - empty → should retry
      "http://ha.local:8123",  // URL - valid on second attempt
      "retry-token",           // token
      "",                      // format (accept default toon)
      "",                      // timeout (accept default)
      "",                      // read-only (accept default)
    ];
    const errorOutput: string[] = [];
    const originalError = console.error;
    console.error = (msg: string) => errorOutput.push(String(msg));

    mockRlQuestion.mockImplementation((_prompt: string, cb: (answer: string) => void) => {
      cb(answers[callIndex++] ?? "");
    });
    mockRlClose.mockImplementation(() => undefined);

    const cmd = createWizardCommand();
    await cmd.parseAsync(["node", "test", "--skip-test"], { from: "user" });

    console.error = originalError;

    expect(mockSaveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ url: "http://ha.local:8123", token: "retry-token" }),
      undefined
    );
    expect(errorOutput.some(e => e.includes("Value is required"))).toBe(true);
  });

  it("retries promptSecretRequired when empty input and no fallback", async () => {
    // No existing token in snapshot, first token answer is empty → retry
    let callIndex = 0;
    const answers = [
      "http://ha.local:8123",  // URL
      "",                      // token - empty, no fallback → retry
      "valid-token",           // token - valid on retry
      "",                      // format
      "",                      // timeout
      "",                      // read-only
    ];
    const errorOutput: string[] = [];
    const originalError = console.error;
    console.error = (msg: string) => errorOutput.push(String(msg));

    mockRlQuestion.mockImplementation((_prompt: string, cb: (answer: string) => void) => {
      cb(answers[callIndex++] ?? "");
    });
    mockRlClose.mockImplementation(() => undefined);

    const cmd = createWizardCommand();
    await cmd.parseAsync(["node", "test", "--skip-test"], { from: "user" });

    console.error = originalError;

    expect(mockSaveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ token: "valid-token" }),
      undefined
    );
    expect(errorOutput.some(e => e.includes("Value is required"))).toBe(true);
  });

  it("setup alias runs the same non-interactive flow", async () => {
    const cmd = createSetupCommand();

    await cmd.parseAsync(
      [
        "node",
        "test",
        "--non-interactive",
        "--ha-url",
        "http://localhost:8123",
        "--ha-token",
        "token-setup",
        "--skip-test",
      ],
      { from: "user" }
    );

    expect(cmd.name()).toBe("setup");
    expect(mockSaveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "http://localhost:8123",
        token: "token-setup",
      }),
      undefined
    );
  });
});
