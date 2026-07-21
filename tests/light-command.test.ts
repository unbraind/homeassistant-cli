import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLightCommand } from "../src/commands/light.js";

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

const lightStates = [
  {
    entity_id: "light.living_room",
    state: "on",
    attributes: { brightness: 200, color_temp_kelvin: 3000, rgb_color: [255, 200, 100], effect: null, friendly_name: "Living Room" },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "light.bedroom",
    state: "off",
    attributes: { brightness: null, color_temp_kelvin: null, rgb_color: null, effect: null, friendly_name: "Bedroom" },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "switch.kitchen",
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

describe("light command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists all lights", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(lightStates));

    const cmd = createLightCommand();
    const result = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );

    expect(result).toContain("light.living_room");
    expect(result).toContain("light.bedroom");
    expect(result).not.toContain("switch.kitchen");
  });

  it("returns light count with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(lightStates));

    const cmd = createLightCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--count"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed.lights_count).toBe(2);
  });

  it("filters lights by state", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(lightStates));

    const cmd = createLightCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--state", "on"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed.lights).toHaveLength(1);
    expect(parsed.lights[0].entity_id).toBe("light.living_room");
  });

  it("turns on a light", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createLightCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--on", "light.living_room"], { from: "user" })
    );

    expect(result).toContain("turned_on");
    expect(result).toContain("light.living_room");
  });

  it("turns on a light with brightness", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createLightCommand();
    await captureLog(() =>
      cmd.parseAsync(["--on", "light.bedroom", "--brightness", "128"], { from: "user" })
    );

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.entity_id).toBe("light.bedroom");
    expect(body.brightness).toBe(128);
  });

  it("turns on a light with RGB color", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createLightCommand();
    await captureLog(() =>
      cmd.parseAsync(["--on", "light.living_room", "--rgb", "255,100,0"], { from: "user" })
    );

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.rgb_color).toEqual([255, 100, 0]);
  });

  it("turns on a light with kelvin color temp", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createLightCommand();
    await captureLog(() =>
      cmd.parseAsync(["--on", "light.living_room", "--kelvin", "4000"], { from: "user" })
    );

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.kelvin).toBe(4000);
  });

  it("turns off a light", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createLightCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--off", "light.living_room"], { from: "user" })
    );

    expect(result).toContain("turned_off");
  });

  it("turns off a light with transition", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createLightCommand();
    await captureLog(() =>
      cmd.parseAsync(["--off", "light.living_room", "--transition", "2.5"], { from: "user" })
    );

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.transition).toBe(2.5);
  });

  it("turns on a light with a transition", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    await captureLog(() => createLightCommand().parseAsync([
      "--on", "light.living_room", "--transition", "1.5",
    ], { from: "user" }));
    expect(JSON.parse((mockRequest.mock.calls[0]?.[1] as { body: string }).body).transition).toBe(1.5);
  });

  it("toggles a light", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createLightCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--toggle", "light.bedroom"], { from: "user" })
    );

    expect(result).toContain("toggled");
    expect(result).toContain("light.bedroom");
  });

  it("turns on via --entity-id with options", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createLightCommand();
    await captureLog(() =>
      cmd.parseAsync(["--entity-id", "light.bedroom", "--brightness-pct", "50", "--effect", "colorloop"], { from: "user" })
    );

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.entity_id).toBe("light.bedroom");
    expect(body.brightness_pct).toBe(50);
    expect(body.effect).toBe("colorloop");
  });

  it("turns on via --entity-id with hs color", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createLightCommand();
    await captureLog(() =>
      cmd.parseAsync(["--entity-id", "light.living_room", "--hs", "30,100"], { from: "user" })
    );

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.hs_color).toEqual([30, 100]);
  });

  it("turns on with color-name and flash", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createLightCommand();
    await captureLog(() =>
      cmd.parseAsync(["--on", "light.bedroom", "--color-name", "red", "--flash", "short"], { from: "user" })
    );

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.color_name).toBe("red");
    expect(body.flash).toBe("short");
  });

  it("turns on with color-temp mireds", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createLightCommand();
    await captureLog(() =>
      cmd.parseAsync(["--on", "light.living_room", "--color-temp", "300"], { from: "user" })
    );

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.color_temp).toBe(300);
  });
});
