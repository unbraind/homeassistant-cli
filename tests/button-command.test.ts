import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createButtonCommand } from "../src/commands/button.js";

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

const buttonStates = [
  {
    entity_id: "button.restart_device",
    state: "unknown",
    attributes: { friendly_name: "Restart Device", device_class: "restart" },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "button.identify",
    state: "unknown",
    attributes: { friendly_name: "Identify Device", device_class: "identify" },
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

describe("button command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists all button entities", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(buttonStates));
    const cmd = createButtonCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test"], { from: "user" })
    );
    expect(result).toContain("button.restart_device");
    expect(result).toContain("button.identify");
    expect(result).not.toContain("switch.unrelated");
  });

  it("returns count with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(buttonStates));
    const cmd = createButtonCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--count"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.buttons_count).toBe(2);
  });

  it("presses a button with --press", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createButtonCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--press", "button.restart_device"], { from: "user" })
    );
    expect(result).toContain("pressed");
    expect(result).toContain("button.restart_device");
    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.entity_id).toBe("button.restart_device");
  });

  it("filters by state", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(buttonStates));
    const cmd = createButtonCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--state", "unknown"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.buttons).toHaveLength(2);
  });
});
