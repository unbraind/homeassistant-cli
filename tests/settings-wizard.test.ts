import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

vi.mock("../src/config/index.js", () => ({
  getConfigPath: vi.fn(() => "/tmp/hassio-wizard-test.json"),
  getAuthPath: vi.fn(() => "/tmp/auth.json"),
  getDataPath: vi.fn(() => "/tmp/data.json"),
  getConfigSnapshot: vi.fn(() => ({})),
  saveConfig: vi.fn(),
  saveData: vi.fn(),
}));

vi.mock("../src/utils/github-star.js", () => ({
  maybePromptToStarRepo: vi.fn(async () => undefined),
}));

import * as configModule from "../src/config/index.js";
import { createWizardCommand } from "../src/commands/settings-wizard.js";

const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

describe("settings wizard command", () => {
  beforeEach(() => {
    (configModule.saveConfig as unknown as ReturnType<typeof vi.fn>).mockReset();
    (configModule.getConfigSnapshot as unknown as ReturnType<typeof vi.fn>).mockReturnValue({});
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

    expect(configModule.saveConfig).toHaveBeenCalledWith(
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
    expect(configModule.saveConfig).not.toHaveBeenCalled();
  });

  it("uses existing snapshot values in non-interactive mode", async () => {
    (configModule.getConfigSnapshot as unknown as ReturnType<typeof vi.fn>).mockReturnValue({
      url: "http://ha.local:8123/",
      token: "from-snapshot",
      outputFormat: "toon",
      timeout: 30000,
      readOnly: false,
    });

    const cmd = createWizardCommand();
    await cmd.parseAsync(["node", "test", "--non-interactive", "--skip-test"], { from: "user" });

    expect(configModule.saveConfig).toHaveBeenCalledWith(
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
    expect(configModule.saveConfig).not.toHaveBeenCalled();
  });
});
