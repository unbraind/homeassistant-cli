import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createEventEntityCommand } from "../src/commands/event-entity.js";

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

const eventStates = [
  {
    entity_id: "event.hue_button_1",
    state: "2024-01-01T10:00:00.000+00:00",
    attributes: {
      friendly_name: "Hue Button 1",
      device_class: "button",
      event_type: "short_release",
      event_types: ["initial_press", "repeat", "short_release", "long_press", "long_release"],
    },
    last_changed: "2024-01-01T10:00:00Z",
    last_updated: "2024-01-01T10:00:00Z",
  },
  {
    entity_id: "event.backup_automatic",
    state: "2024-01-01T05:00:00.000+00:00",
    attributes: {
      friendly_name: "Automatic Backup",
      device_class: null,
      event_type: "completed",
      event_types: ["completed", "failed", "in_progress"],
    },
    last_changed: "2024-01-01T05:00:00Z",
    last_updated: "2024-01-01T05:00:00Z",
  },
  {
    entity_id: "sensor.unrelated",
    state: "42",
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

describe("event entity command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists all event entities", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(eventStates));
    const cmd = createEventEntityCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test"], { from: "user" })
    );
    expect(result).toContain("event.hue_button_1");
    expect(result).toContain("event.backup_automatic");
    expect(result).not.toContain("sensor.unrelated");
  });

  it("returns count with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(eventStates));
    const cmd = createEventEntityCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--count"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.event_entities_count).toBe(2);
  });

  it("filters by --entity-id", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(eventStates));
    const cmd = createEventEntityCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--entity-id", "event.hue_button_1"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.event_entities).toHaveLength(1);
    expect(parsed.event_entities[0].entity_id).toBe("event.hue_button_1");
  });

  it("filters by --class (device_class)", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(eventStates));
    const cmd = createEventEntityCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--class", "button"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.event_entities).toHaveLength(1);
    expect(parsed.event_entities[0].device_class).toBe("button");
  });

  it("includes event_type in output", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(eventStates));
    const cmd = createEventEntityCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test"], { from: "user" })
    );
    expect(result).toContain("short_release");
    expect(result).toContain("completed");
  });

  it("filters by state", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(eventStates));
    const cmd = createEventEntityCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--state", "2024-01-01T10:00:00.000+00:00"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.event_entities).toHaveLength(1);
    expect(parsed.event_entities[0].entity_id).toBe("event.hue_button_1");
  });
});
