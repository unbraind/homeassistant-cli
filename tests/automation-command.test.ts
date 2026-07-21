import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createAutomationsCommand, createScriptsCommand, createScenesCommand } from "../src/commands/automation.js";

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

const mockResponse = (data: unknown, status = 200) => ({
  statusCode: status,
  body: {
    text: () => Promise.resolve(JSON.stringify(data)),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  },
});

function captureLog(fn: () => Promise<void>): Promise<string> {
  const output: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => output.push(msg);
  return fn().then(() => {
    console.log = originalLog;
    return output.join("\n");
  });
}

const automationStates = [
  {
    entity_id: "automation.morning_lights",
    state: "on",
    attributes: { friendly_name: "Morning Lights", last_triggered: "2024-01-01T08:00:00Z" },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "light.kitchen",
    state: "off",
    attributes: {},
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
];

const scriptStates = [
  {
    entity_id: "script.bedtime",
    state: "off",
    attributes: { friendly_name: "Bedtime", last_triggered: "2024-01-01T22:00:00Z" },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
];

const sceneStates = [
  {
    entity_id: "scene.movie_mode",
    state: "scening",
    attributes: { friendly_name: "Movie Mode" },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
];

describe("automations command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists automations", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(automationStates));

    const cmd = createAutomationsCommand();
    const result = await captureLog(() => cmd.parseAsync([], { from: "user" }));

    expect(result).toContain("automation.morning_lights");
    expect(result).toContain("Morning Lights");
  });

  it("falls back to the automation entity id when no friendly name exists", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([{
      entity_id: "automation.unnamed", state: "on", attributes: {}, last_changed: "", last_updated: "",
    }]));
    expect(await captureLog(() => createAutomationsCommand().parseAsync([], { from: "user" }))).toContain("automation.unnamed");
  });

  it("lists automations with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(automationStates));

    const cmd = createAutomationsCommand();
    const result = await captureLog(() => cmd.parseAsync(["--count"], { from: "user" }));

    expect(result).toContain("automations_count");
    expect(result).toContain("1");
  });

  it("turns on an automation", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createAutomationsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--on", "automation.morning_lights"], { from: "user" })
    );

    expect(result).toContain("turned_on");
    expect(result).toContain("automation.morning_lights");
  });

  it("turns off an automation", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createAutomationsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--off", "automation.morning_lights"], { from: "user" })
    );

    expect(result).toContain("turned_off");
  });

  it("toggles an automation", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createAutomationsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--toggle", "automation.morning_lights"], { from: "user" })
    );

    expect(result).toContain("toggled");
  });

  it("triggers an automation", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createAutomationsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--trigger", "automation.morning_lights"], { from: "user" })
    );

    expect(result).toContain("triggered");
  });

  it("reloads automations", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createAutomationsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--reload"], { from: "user" })
    );

    expect(result).toContain("reloaded");
    expect(result).toContain("automation");
  });
});

describe("scripts command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists scripts", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(scriptStates));

    const cmd = createScriptsCommand();
    const result = await captureLog(() => cmd.parseAsync([], { from: "user" }));

    expect(result).toContain("script.bedtime");
    expect(result).toContain("Bedtime");
  });

  it("lists scripts with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(scriptStates));

    const cmd = createScriptsCommand();
    const result = await captureLog(() => cmd.parseAsync(["--count"], { from: "user" }));

    expect(result).toContain("scripts_count");
    expect(result).toContain("1");
  });

  it("executes a script", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createScriptsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--run", "script.bedtime"], { from: "user" })
    );

    expect(result).toContain("executed");
    expect(result).toContain("script.bedtime");
  });

  it("executes a script with variables", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    await captureLog(() => createScriptsCommand().parseAsync([
      "--run", "script.bedtime", "--data", '{"volume":5}',
    ], { from: "user" }));
    expect(JSON.parse((mockRequest.mock.calls[0]?.[1] as { body: string }).body).volume).toBe(5);
  });

  it("falls back to the script entity id when no friendly name exists", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([{
      entity_id: "script.unnamed", state: "off", attributes: {}, last_changed: "", last_updated: "",
    }]));
    expect(await captureLog(() => createScriptsCommand().parseAsync([], { from: "user" }))).toContain("script.unnamed");
  });

  it("reloads scripts", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createScriptsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--reload"], { from: "user" })
    );

    expect(result).toContain("reloaded");
    expect(result).toContain("script");
  });
});

describe("scenes command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists scenes", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sceneStates));

    const cmd = createScenesCommand();
    const result = await captureLog(() => cmd.parseAsync([], { from: "user" }));

    expect(result).toContain("scene.movie_mode");
    expect(result).toContain("Movie Mode");
  });

  it("falls back to the scene entity id when no friendly name exists", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([{
      entity_id: "scene.unnamed", state: "scening", attributes: {}, last_changed: "", last_updated: "",
    }]));
    expect(await captureLog(() => createScenesCommand().parseAsync([], { from: "user" }))).toContain("scene.unnamed");
  });

  it("lists scenes with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sceneStates));

    const cmd = createScenesCommand();
    const result = await captureLog(() => cmd.parseAsync(["--count"], { from: "user" }));

    expect(result).toContain("scenes_count");
    expect(result).toContain("1");
  });

  it("applies a scene", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createScenesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--apply", "scene.movie_mode"], { from: "user" })
    );

    expect(result).toContain("applied");
    expect(result).toContain("scene.movie_mode");
  });

  it("reloads scenes", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createScenesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--reload"], { from: "user" })
    );

    expect(result).toContain("reloaded");
    expect(result).toContain("scene");
  });
});
