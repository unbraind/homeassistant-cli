import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createInputCommand } from "../src/commands/input.js";

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

const allStates = [
  {
    entity_id: "input_boolean.fan",
    state: "off",
    attributes: { friendly_name: "Fan", editable: true },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "input_text.greeting",
    state: "Hello",
    attributes: { friendly_name: "Greeting", min: 0, max: 100 },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "input_number.volume",
    state: "50",
    attributes: { friendly_name: "Volume", min: 0, max: 100, step: 1 },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "input_select.mode",
    state: "away",
    attributes: { friendly_name: "Mode", options: ["home", "away", "sleeping"] },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "light.kitchen",
    state: "on",
    attributes: {},
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
];

function captureLog(fn: () => Promise<void>): Promise<string> {
  const output: string[] = [];
  const originalLog = console.log;
  const originalErr = console.error;
  console.log = (msg: string) => output.push(msg);
  console.error = () => {};
  return fn().then(() => {
    console.log = originalLog;
    console.error = originalErr;
    return output.join("\n");
  }).catch((err) => {
    console.log = originalLog;
    console.error = originalErr;
    throw err;
  });
}

describe("input command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists all input helpers", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(allStates));

    const cmd = createInputCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test"], { from: "user" })
    );

    expect(result).toContain("input_boolean.fan");
    expect(result).toContain("input_text.greeting");
    expect(result).toContain("input_number.volume");
    expect(result).not.toContain("light.kitchen");
  });

  it("filters by domain with --domain flag", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(allStates));

    const cmd = createInputCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--domain", "input_boolean"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed.inputs.every((i: { entity_id: string }) => i.entity_id.startsWith("input_boolean."))).toBe(true);
  });

  it("returns input count with --count flag", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(allStates));

    const cmd = createInputCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--count"], { from: "user" })
    );

    expect(result).toContain("input_count");
    const parsed = JSON.parse(result);
    expect(typeof parsed.input_count).toBe("number");
  });

  it("toggles an input_boolean", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createInputCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--toggle", "input_boolean.fan"], { from: "user" })
    );

    expect(result).toContain("toggled");
    expect(result).toContain("input_boolean.fan");
  });

  it("turns on an input_boolean", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createInputCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--on", "input_boolean.fan"], { from: "user" })
    );

    expect(result).toContain("turned_on");
  });

  it("turns off an input_boolean", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createInputCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--off", "input_boolean.fan"], { from: "user" })
    );

    expect(result).toContain("turned_off");
  });

  it("presses an input_button", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createInputCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--press", "input_button.restart"], { from: "user" })
    );

    expect(result).toContain("pressed");
  });

  it("increments an input_number", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createInputCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--increment", "input_number.volume"], { from: "user" })
    );

    expect(result).toContain("incremented");
  });

  it("decrements an input_number", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createInputCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--decrement", "input_number.volume"], { from: "user" })
    );

    expect(result).toContain("decremented");
  });

  it("sets value for input_text", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createInputCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--entity-id", "input_text.greeting", "--set", "Hi there"], { from: "user" })
    );

    expect(result).toContain("set");
    expect(result).toContain("input_text.greeting");
  });

  it("sets option for input_select", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createInputCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--entity-id", "input_select.mode", "--set", "home"], { from: "user" })
    );

    expect(result).toContain("set");
    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.option).toBe("home");
  });

  it("sets date for input_datetime (date only)", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createInputCommand();
    await captureLog(() =>
      cmd.parseAsync(["node", "test", "--entity-id", "input_datetime.birthday", "--set", "2024-06-15"], { from: "user" })
    );

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.date).toBe("2024-06-15");
  });

  it("sets datetime for input_datetime (with time)", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createInputCommand();
    await captureLog(() =>
      cmd.parseAsync(["node", "test", "--entity-id", "input_datetime.alarm", "--set", "2024-06-15T07:00:00"], { from: "user" })
    );

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.datetime).toBe("2024-06-15T07:00:00");
  });

  it("selects option with --select flag", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createInputCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--entity-id", "input_select.mode", "--select", "sleeping"], { from: "user" })
    );

    expect(result).toContain("selected");
    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.option).toBe("sleeping");
  });

  it("reloads all input helpers", async () => {
    // 6 domains, but some may fail (that's ok)
    mockRequest.mockResolvedValue(mockResponse({ context: { id: "ctx" } }));

    const cmd = createInputCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--reload"], { from: "user" })
    );

    expect(result).toContain("reloaded");
  });
});
