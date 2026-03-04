import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createNumberCommand } from "../src/commands/number.js";

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

const numberStates = [
  {
    entity_id: "number.light_brightness",
    state: "75",
    attributes: {
      friendly_name: "Light Brightness",
      min: 0,
      max: 100,
      step: 1,
      unit_of_measurement: "%",
      mode: "slider",
    },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "number.fan_speed",
    state: "50",
    attributes: {
      friendly_name: "Fan Speed",
      min: 0,
      max: 100,
      step: 5,
      unit_of_measurement: "%",
      mode: "auto",
    },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "switch.unrelated",
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

describe("number command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists all number entities", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(numberStates));
    const cmd = createNumberCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test"], { from: "user" })
    );
    expect(result).toContain("number.light_brightness");
    expect(result).toContain("number.fan_speed");
    expect(result).not.toContain("switch.unrelated");
  });

  it("returns count with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(numberStates));
    const cmd = createNumberCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--count"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.numbers_count).toBe(2);
  });

  it("sets a number value via --entity-id --set", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createNumberCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--entity-id", "number.light_brightness", "--set", "80"], { from: "user" })
    );
    expect(result).toContain("set_value");
    expect(result).toContain("number.light_brightness");
    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.entity_id).toBe("number.light_brightness");
    expect(body.value).toBe("80");
  });

  it("filters by state", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(numberStates));
    const cmd = createNumberCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--state", "75"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.numbers).toHaveLength(1);
    expect(parsed.numbers[0].entity_id).toBe("number.light_brightness");
  });
});
