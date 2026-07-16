import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createLockCommand } from "../src/commands/lock.js";

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

const lockStates = [
  {
    entity_id: "lock.front_door",
    state: "locked",
    attributes: { changed_by: null, device_class: "lock", friendly_name: "Front Door Lock" },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "lock.back_door",
    state: "unlocked",
    attributes: { changed_by: "user", device_class: "lock", friendly_name: "Back Door Lock" },
    last_changed: "2024-01-01T00:00:00Z",
    last_updated: "2024-01-01T00:00:00Z",
  },
  {
    entity_id: "sensor.motion",
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

describe("lock command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists all locks", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(lockStates));

    const cmd = createLockCommand();
    const result = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );

    expect(result).toContain("lock.front_door");
    expect(result).toContain("lock.back_door");
    expect(result).not.toContain("sensor.motion");
  });

  it("returns lock count with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(lockStates));

    const cmd = createLockCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--count"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed.locks_count).toBe(2);
  });

  it("filters locks by state", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(lockStates));

    const cmd = createLockCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--state", "locked"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed.locks).toHaveLength(1);
    expect(parsed.locks[0].entity_id).toBe("lock.front_door");
  });

  it("locks a lock", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createLockCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--lock", "lock.back_door"], { from: "user" })
    );

    expect(result).toContain("locked");
    expect(result).toContain("lock.back_door");

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.entity_id).toBe("lock.back_door");
  });

  it("locks a lock with code", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createLockCommand();
    await captureLog(() =>
      cmd.parseAsync(["--lock", "lock.front_door", "--code", "1234"], { from: "user" })
    );

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.code).toBe("1234");
    expect(body.entity_id).toBe("lock.front_door");
  });

  it("unlocks a lock", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createLockCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--unlock", "lock.front_door"], { from: "user" })
    );

    expect(result).toContain("unlocked");
    expect(result).toContain("lock.front_door");
  });

  it("unlocks a lock with code", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createLockCommand();
    await captureLog(() =>
      cmd.parseAsync(["--unlock", "lock.front_door", "--code", "5678"], { from: "user" })
    );

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.code).toBe("5678");
  });

  it("opens a lock", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createLockCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--open", "lock.front_door"], { from: "user" })
    );

    expect(result).toContain("opened");
    expect(result).toContain("lock.front_door");
  });

  it("opens a lock with code", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createLockCommand();
    await captureLog(() =>
      cmd.parseAsync(["--open", "lock.back_door", "--code", "9999"], { from: "user" })
    );

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.code).toBe("9999");
    expect(body.entity_id).toBe("lock.back_door");
  });
});
