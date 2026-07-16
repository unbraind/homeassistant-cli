import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSwitchCommand } from "../src/commands/switch.js";

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

const switchStates = [
  {
    entity_id: "switch.kitchen_outlet",
    state: "on",
    attributes: { friendly_name: "Kitchen Outlet", device_class: "outlet" },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "switch.porch_light",
    state: "off",
    attributes: { friendly_name: "Porch Light", device_class: "switch" },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "light.hall",
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

describe("switch command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists all switches", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(switchStates));

    const cmd = createSwitchCommand();
    const result = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );

    expect(result).toContain("switch.kitchen_outlet");
    expect(result).toContain("switch.porch_light");
    expect(result).not.toContain("light.hall");
  });

  it("returns switch count with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(switchStates));

    const cmd = createSwitchCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--count"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed.switches_count).toBe(2);
  });

  it("filters switches by state", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(switchStates));

    const cmd = createSwitchCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--state", "off"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed.switches).toHaveLength(1);
    expect(parsed.switches[0].entity_id).toBe("switch.porch_light");
  });

  it("turns on a switch", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createSwitchCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--on", "switch.kitchen_outlet"], { from: "user" })
    );

    expect(result).toContain("turned_on");
    expect(result).toContain("switch.kitchen_outlet");

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.entity_id).toBe("switch.kitchen_outlet");
  });

  it("turns off a switch", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createSwitchCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--off", "switch.porch_light"], { from: "user" })
    );

    expect(result).toContain("turned_off");
    expect(result).toContain("switch.porch_light");
  });

  it("toggles a switch", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createSwitchCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--toggle", "switch.kitchen_outlet"], { from: "user" })
    );

    expect(result).toContain("toggled");
    expect(result).toContain("switch.kitchen_outlet");

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.entity_id).toBe("switch.kitchen_outlet");
  });
});
