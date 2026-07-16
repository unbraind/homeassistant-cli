import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createFanCommand } from "../src/commands/fan.js";

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

const fanStates = [
  {
    entity_id: "fan.bedroom_fan",
    state: "on",
    attributes: { percentage: 60, preset_mode: null, oscillating: true, direction: "forward", friendly_name: "Bedroom Fan" },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "fan.living_room_fan",
    state: "off",
    attributes: { percentage: null, preset_mode: "low", oscillating: false, direction: null, friendly_name: "Living Room Fan" },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "switch.fan_power",
    state: "on",
    attributes: {},
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
];

function captureLog(fn: () => Promise<void>): Promise<string> {
  const output: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => output.push(msg);
  return fn().then(() => {
    console.log = originalLog;
    return output.join("\n");
  }).catch((err) => {
    console.log = originalLog;
    throw err;
  });
}

describe("fan command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists all fans", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(fanStates));

    const cmd = createFanCommand();
    const result = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );

    expect(result).toContain("fan.bedroom_fan");
    expect(result).toContain("fan.living_room_fan");
    expect(result).not.toContain("switch.fan_power");
  });

  it("returns fan count with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(fanStates));

    const cmd = createFanCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--count"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed.fans_count).toBe(2);
  });

  it("filters fans by state", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(fanStates));

    const cmd = createFanCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--state", "on"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed.fans).toHaveLength(1);
    expect(parsed.fans[0].entity_id).toBe("fan.bedroom_fan");
  });

  it("turns on a fan", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createFanCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--on", "fan.living_room_fan"], { from: "user" })
    );

    expect(result).toContain("turned_on");
    expect(result).toContain("fan.living_room_fan");
  });

  it("turns on a fan with percentage", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createFanCommand();
    await captureLog(() =>
      cmd.parseAsync(["--on", "fan.bedroom_fan", "--percentage", "75"], { from: "user" })
    );

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.percentage).toBe(75);
    expect(body.entity_id).toBe("fan.bedroom_fan");
  });

  it("turns on a fan with preset", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createFanCommand();
    await captureLog(() =>
      cmd.parseAsync(["--on", "fan.bedroom_fan", "--preset", "high"], { from: "user" })
    );

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.preset_mode).toBe("high");
  });

  it("turns off a fan", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createFanCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--off", "fan.bedroom_fan"], { from: "user" })
    );

    expect(result).toContain("turned_off");
  });

  it("toggles a fan", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createFanCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--toggle", "fan.living_room_fan"], { from: "user" })
    );

    expect(result).toContain("toggled");
  });

  it("sets fan percentage via --entity-id", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createFanCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entity-id", "fan.bedroom_fan", "--percentage", "50"], { from: "user" })
    );

    expect(result).toContain("set_percentage");

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.percentage).toBe(50);
  });

  it("sets fan preset via --entity-id", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createFanCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entity-id", "fan.living_room_fan", "--preset", "auto"], { from: "user" })
    );

    expect(result).toContain("set_preset_mode");
    expect(result).toContain("auto");
  });

  it("sets fan direction", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createFanCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entity-id", "fan.bedroom_fan", "--direction", "reverse"], { from: "user" })
    );

    expect(result).toContain("set_direction");
    expect(result).toContain("reverse");

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.direction).toBe("reverse");
  });

  it("enables oscillation", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createFanCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--oscillate", "fan.bedroom_fan"], { from: "user" })
    );

    expect(result).toContain("oscillate_on");

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.oscillating).toBe(true);
  });

  it("increases fan speed", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createFanCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--increase-speed", "fan.bedroom_fan"], { from: "user" })
    );

    expect(result).toContain("increased_speed");
  });

  it("decreases fan speed", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createFanCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--decrease-speed", "fan.bedroom_fan"], { from: "user" })
    );

    expect(result).toContain("decreased_speed");
  });
});
