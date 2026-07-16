import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  createConfigSetCommand,
  createConfigPathCommand,
  createInitCommand,
  createValidateCommand,
  createResetCommand,
  createListCommand,
} from "../src/commands/cli-config.js";

const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

const mockSaveConfig = vi.fn();
const mockSaveData = vi.fn();
const mockResetConfig = vi.fn();
const mockConfigExists = vi.fn(() => true);
const mockGetConfigSnapshot = vi.fn(() => ({
  url: "http://localhost:8123",
  token: "test-token",
  outputFormat: "toon" as const,
  timeout: 30000,
  readOnly: false,
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
  getConfigSnapshot: (...args: unknown[]) => mockGetConfigSnapshot(...args),
  getData: vi.fn(() => ({ lastValidatedAt: null, lastVersion: null, lastLocation: null })),
  getDataPath: vi.fn(() => "/tmp/data.json"),
  saveConfig: (...args: unknown[]) => mockSaveConfig(...args),
  saveData: (...args: unknown[]) => mockSaveData(...args),
  resetConfig: (...args: unknown[]) => mockResetConfig(...args),
  configExists: (...args: unknown[]) => mockConfigExists(...args),
}));

vi.mock("../src/utils/github-star.js", () => ({
  maybePromptToStarRepo: vi.fn(async () => undefined),
}));

vi.mock("../src/api/index.js", () => ({
  HomeAssistantClient: vi.fn().mockImplementation(function () { return {
    getStatus: vi.fn(async () => ({ message: "API running." })),
    getConfig: vi.fn(async () => ({ version: "2024.1.0", location_name: "Home" })),
    getStates: vi.fn(async () => [{ entity_id: "light.kitchen" }, { entity_id: "switch.fan" }]),
  }; }),
}));

function captureLog(fn: () => Promise<void>): Promise<{ stdout: string; stderr: string }> {
  const out: string[] = [];
  const err: string[] = [];
  const origLog = console.log;
  const origErr = console.error;
  console.log = (msg: string) => out.push(msg);
  console.error = (msg: string) => err.push(msg);
  return fn().then(() => {
    console.log = origLog;
    console.error = origErr;
    return { stdout: out.join("\n"), stderr: err.join("\n") };
  }).catch((e) => {
    console.log = origLog;
    console.error = origErr;
    throw e;
  });
}

describe("config set command", () => {
  beforeEach(() => { mockSaveConfig.mockClear(); exitSpy.mockClear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it("saves url and token", async () => {
    const cmd = createConfigSetCommand();
    const { stdout } = await captureLog(() =>
      cmd.parseAsync(["--ha-url", "http://ha.local:8123", "--ha-token", "my-token"], { from: "user" })
    );

    expect(mockSaveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ url: "http://ha.local:8123", token: "my-token" }),
      undefined
    );
    expect(stdout).toContain("saved:/tmp/settings.json");
  });

  it("strips trailing slash from URL", async () => {
    const cmd = createConfigSetCommand();
    await captureLog(() =>
      cmd.parseAsync(["--ha-url", "http://ha.local:8123/"], { from: "user" })
    );

    expect(mockSaveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ url: "http://ha.local:8123" }),
      undefined
    );
  });

  it("saves output format", async () => {
    const cmd = createConfigSetCommand();
    await captureLog(() =>
      cmd.parseAsync(["--default-format", "json"], { from: "user" })
    );

    expect(mockSaveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ outputFormat: "json" }),
      undefined
    );
  });

  it("saves timeout", async () => {
    const cmd = createConfigSetCommand();
    await captureLog(() =>
      cmd.parseAsync(["--default-timeout", "45000"], { from: "user" })
    );

    expect(mockSaveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ timeout: 45000 }),
      undefined
    );
  });

  it("saves read-only flag", async () => {
    const cmd = createConfigSetCommand();
    await captureLog(() =>
      cmd.parseAsync(["--read-only", "true"], { from: "user" })
    );

    expect(mockSaveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ readOnly: true }),
      undefined
    );
  });

  it("exits with 1 when no options provided", async () => {
    const cmd = createConfigSetCommand();
    const { stderr } = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(stderr).toContain("No configuration options");
  });
});

describe("config path command", () => {
  beforeEach(() => { exitSpy.mockClear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it("shows paths", async () => {
    const cmd = createConfigPathCommand();
    const { stdout } = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );

    const parsed = JSON.parse(stdout);
    expect(parsed.settings).toBe("/tmp/settings.json");
    expect(parsed.auth).toBe("/tmp/auth.json");
    expect(parsed.data).toBe("/tmp/data.json");
  });
});

describe("init command", () => {
  beforeEach(() => { mockSaveConfig.mockClear(); mockGetConfigSnapshot.mockClear(); exitSpy.mockClear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it("initializes from snapshot with url and token", async () => {
    mockGetConfigSnapshot.mockReturnValue({
      url: "http://ha.local:8123/",
      token: "env-token",
      outputFormat: "toon" as const,
      timeout: 30000,
      readOnly: false,
    });

    const cmd = createInitCommand();
    const { stdout } = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );

    expect(mockSaveConfig).toHaveBeenCalledWith(
      expect.objectContaining({ url: "http://ha.local:8123", token: "env-token" }),
      undefined
    );
    expect(stdout).toContain("saved:/tmp/settings.json");
  });

  it("exits with 1 when no url or token in snapshot", async () => {
    mockGetConfigSnapshot.mockReturnValue({});

    const cmd = createInitCommand();
    const { stderr } = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(stderr).toContain("No HASSIO_URL or HASSIO_TOKEN");
  });
});

describe("validate command", () => {
  beforeEach(() => { mockSaveData.mockClear(); exitSpy.mockClear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it("validates successfully and saves data", async () => {
    const cmd = createValidateCommand();
    const { stdout } = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );

    expect(stdout).toContain("VALID");
    expect(stdout).toContain("2024.1.0");
    expect(mockSaveData).toHaveBeenCalled();
  });
});

describe("reset command", () => {
  beforeEach(() => { mockResetConfig.mockClear(); mockConfigExists.mockClear(); exitSpy.mockClear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it("resets config with --force flag", async () => {
    mockConfigExists.mockReturnValue(true);

    const cmd = createResetCommand();
    const { stdout } = await captureLog(() =>
      cmd.parseAsync(["--force"], { from: "user" })
    );

    expect(mockResetConfig).toHaveBeenCalled();
    expect(stdout).toContain("RESET");
  });

  it("exits with 1 without --force", async () => {
    mockConfigExists.mockReturnValue(true);

    const cmd = createResetCommand();
    const { stdout } = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );

    expect(exitSpy).toHaveBeenCalledWith(1);
    expect(stdout).toContain("WARNING");
  });

  it("shows NO_CONFIG when no config exists", async () => {
    mockConfigExists.mockReturnValue(false);

    const cmd = createResetCommand();
    const { stdout } = await captureLog(() =>
      cmd.parseAsync(["--force"], { from: "user" })
    );

    expect(stdout).toContain("NO_CONFIG");
    expect(mockResetConfig).not.toHaveBeenCalled();
  });
});

describe("list command", () => {
  beforeEach(() => { exitSpy.mockClear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it("lists all configuration options", async () => {
    const cmd = createListCommand();
    const { stdout } = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );

    expect(stdout).toContain("config_options");
    expect(stdout).toContain("outputFormat");
    expect(stdout).toContain("HASSIO_URL");
    expect(stdout).toContain("settings_file");
  });
});
