import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRemoteCommand } from "../src/commands/remote.js";

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

const remoteStates = [
  {
    entity_id: "remote.living_room_tv",
    state: "on",
    attributes: {
      friendly_name: "Living Room TV Remote",
      current_activity: "Watch TV",
      activity_list: ["Watch TV", "Watch Movie", "Listen to Music"],
    },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "remote.bedroom_ir",
    state: "off",
    attributes: {
      friendly_name: "Bedroom IR Blaster",
      current_activity: null,
      activity_list: null,
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

describe("remote command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists all remote entities", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(remoteStates));
    const cmd = createRemoteCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test"], { from: "user" })
    );
    expect(result).toContain("remote.living_room_tv");
    expect(result).toContain("remote.bedroom_ir");
    expect(result).not.toContain("switch.unrelated");
  });

  it("returns count with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(remoteStates));
    const cmd = createRemoteCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--count"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.remotes_count).toBe(2);
  });

  it("turns on a remote", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createRemoteCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--on", "remote.living_room_tv"], { from: "user" })
    );
    expect(result).toContain("turned_on");
  });

  it("turns off a remote", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createRemoteCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--off", "remote.bedroom_ir"], { from: "user" })
    );
    expect(result).toContain("turned_off");
  });

  it("toggles a remote", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createRemoteCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--toggle", "remote.living_room_tv"], { from: "user" })
    );
    expect(result).toContain("toggled");
  });

  it("sends a command via --entity-id --send", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createRemoteCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--entity-id", "remote.living_room_tv", "--send", "power"], { from: "user" })
    );
    expect(result).toContain("command_sent");
    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.command).toContain("power");
    expect(body.entity_id).toBe("remote.living_room_tv");
  });

  it("sends a command with device and num-repeats", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createRemoteCommand();
    await captureLog(() =>
      cmd.parseAsync(["node", "test", "--entity-id", "remote.bedroom_ir", "--send", "volume_up", "--device", "TV", "--num-repeats", "3"], { from: "user" })
    );
    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.device).toBe("TV");
    expect(body.num_repeats).toBe(3);
  });

  it("learns a command via --entity-id --learn", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createRemoteCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--entity-id", "remote.bedroom_ir", "--learn", "power"], { from: "user" })
    );
    expect(result).toContain("learning_command");
  });

  it("deletes a command via --entity-id --delete", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createRemoteCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--entity-id", "remote.bedroom_ir", "--delete", "power"], { from: "user" })
    );
    expect(result).toContain("command_deleted");
  });

  it("filters by state", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(remoteStates));
    const cmd = createRemoteCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--state", "on"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.remotes).toHaveLength(1);
    expect(parsed.remotes[0].entity_id).toBe("remote.living_room_tv");
  });
});
