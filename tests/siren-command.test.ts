import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSirenCommand } from "../src/commands/siren.js";

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

const sirenStates = [
  {
    entity_id: "siren.alarm",
    state: "off",
    attributes: {
      friendly_name: "Home Alarm",
      available_tones: ["default", "fire", "intrusion"],
      supported_features: 15,
    },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "siren.doorbell",
    state: "off",
    attributes: {
      friendly_name: "Front Doorbell",
      available_tones: ["ding_dong"],
      supported_features: 7,
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

describe("siren command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists all siren entities", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sirenStates));
    const cmd = createSirenCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test"], { from: "user" })
    );
    expect(result).toContain("siren.alarm");
    expect(result).toContain("siren.doorbell");
    expect(result).not.toContain("switch.unrelated");
  });

  it("returns count with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sirenStates));
    const cmd = createSirenCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--count"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.sirens_count).toBe(2);
  });

  it("turns on a siren with --on", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createSirenCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--on", "siren.alarm"], { from: "user" })
    );
    expect(result).toContain("turned_on");
    expect(result).toContain("siren.alarm");
    const callOpts = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOpts?.body ?? "{}");
    expect(body.entity_id).toBe("siren.alarm");
  });

  it("turns on siren with tone and volume", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createSirenCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--on", "siren.alarm", "--tone", "fire", "--volume", "0.8", "--duration", "30"], { from: "user" })
    );
    expect(result).toContain("turned_on");
    const callOpts = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOpts?.body ?? "{}");
    expect(body.tone).toBe("fire");
    expect(body.volume_level).toBe(0.8);
    expect(body.duration).toBe(30);
  });

  it("turns off a siren with --off", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createSirenCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--off", "siren.alarm"], { from: "user" })
    );
    expect(result).toContain("turned_off");
    expect(result).toContain("siren.alarm");
  });

  it("toggles a siren with --toggle", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createSirenCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--toggle", "siren.doorbell"], { from: "user" })
    );
    expect(result).toContain("toggled");
    expect(result).toContain("siren.doorbell");
  });

  it("filters by state", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(sirenStates));
    const cmd = createSirenCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--state", "off"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.sirens).toHaveLength(2);
  });
});
