import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createCoverCommand } from "../src/commands/cover.js";

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

const coverStates = [
  {
    entity_id: "cover.living_room_blinds",
    state: "open",
    attributes: { current_position: 80, current_tilt_position: null, device_class: "blind", friendly_name: "Living Room Blinds" },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "cover.garage_door",
    state: "closed",
    attributes: { current_position: 0, current_tilt_position: null, device_class: "garage", friendly_name: "Garage Door" },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "switch.hall",
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

describe("cover command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists all covers", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(coverStates));

    const cmd = createCoverCommand();
    const result = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );

    expect(result).toContain("cover.living_room_blinds");
    expect(result).toContain("cover.garage_door");
    expect(result).not.toContain("switch.hall");
  });

  it("returns cover count with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(coverStates));

    const cmd = createCoverCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--count"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed.covers_count).toBe(2);
  });

  it("filters covers by state", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(coverStates));

    const cmd = createCoverCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--state", "closed"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed.covers).toHaveLength(1);
    expect(parsed.covers[0].entity_id).toBe("cover.garage_door");
  });

  it("opens a cover", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createCoverCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--open", "cover.garage_door"], { from: "user" })
    );

    expect(result).toContain("opened");
    expect(result).toContain("cover.garage_door");
  });

  it("closes a cover", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createCoverCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--close", "cover.living_room_blinds"], { from: "user" })
    );

    expect(result).toContain("closed");
  });

  it("stops a cover", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createCoverCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--stop", "cover.living_room_blinds"], { from: "user" })
    );

    expect(result).toContain("stopped");
  });

  it("toggles a cover", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createCoverCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--toggle", "cover.garage_door"], { from: "user" })
    );

    expect(result).toContain("toggled");
  });

  it("sets cover position", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createCoverCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entity-id", "cover.living_room_blinds", "--position", "50"], { from: "user" })
    );

    expect(result).toContain("set_position");

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.position).toBe(50);
    expect(body.entity_id).toBe("cover.living_room_blinds");
  });

  it("sets cover tilt position", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createCoverCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entity-id", "cover.living_room_blinds", "--tilt", "30"], { from: "user" })
    );

    expect(result).toContain("set_tilt");

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.tilt_position).toBe(30);
  });

  it("opens cover tilt", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createCoverCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--open-tilt", "cover.living_room_blinds"], { from: "user" })
    );

    expect(result).toContain("opened_tilt");
  });

  it("closes cover tilt", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createCoverCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--close-tilt", "cover.living_room_blinds"], { from: "user" })
    );

    expect(result).toContain("closed_tilt");
  });

  it("stops cover tilt", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createCoverCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--stop-tilt", "cover.living_room_blinds"], { from: "user" })
    );

    expect(result).toContain("stopped_tilt");
  });
});
