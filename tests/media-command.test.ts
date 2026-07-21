import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createCalendarsCommand, createCalendarEventsCommand, createCameraCommand } from "../src/commands/media.js";

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

vi.mock("node:fs", () => ({ writeFileSync: vi.fn() }));

import { request } from "undici";
import { writeFileSync } from "node:fs";

const mockRequest = request as ReturnType<typeof vi.fn>;
const mockWriteFileSync = writeFileSync as ReturnType<typeof vi.fn>;

const mockResponse = (data: unknown, status = 200) => ({
  statusCode: status,
  body: {
    text: () => Promise.resolve(JSON.stringify(data)),
    arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
  },
});

function captureLog(fn: () => Promise<void>): Promise<string> {
  const output: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => output.push(msg);
  return fn().then(() => {
    console.log = originalLog;
    return output.join("\n");
  });
}

describe("calendars command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists calendars", async () => {
    mockRequest.mockResolvedValueOnce(
      mockResponse([
        { entity_id: "calendar.home", name: "Home Calendar" },
        { entity_id: "calendar.work", name: "Work Calendar" },
      ])
    );

    const cmd = createCalendarsCommand();
    const result = await captureLog(() => cmd.parseAsync([], { from: "user" }));

    expect(result).toContain("calendar.home");
    expect(result).toContain("calendar.work");
  });
});

describe("calendar-events command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("gets calendar events", async () => {
    mockRequest.mockResolvedValueOnce(
      mockResponse([
        {
          summary: "Team Meeting",
          start: { dateTime: "2024-01-15T10:00:00Z" },
          end: { dateTime: "2024-01-15T11:00:00Z" },
          location: "Office",
        },
      ])
    );

    const cmd = createCalendarEventsCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(
        ["calendar.home", "-s", "2024-01-15T00:00:00Z", "-e", "2024-01-16T00:00:00Z"],
        { from: "user" }
      )
    );

    expect(result).toContain("Team Meeting");
  });
});

describe("camera command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    mockWriteFileSync.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("saves camera image to file", async () => {
    const imageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    mockRequest.mockResolvedValueOnce({
      statusCode: 200,
      body: {
        text: () => Promise.resolve(""),
        arrayBuffer: () => Promise.resolve(imageData.buffer),
      },
    });

    const cmd = createCameraCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["camera.front_door", "-o", "/tmp/snapshot.png"], { from: "user" })
    );

    expect(result).toContain("saved");
    expect(result).toContain("/tmp/snapshot.png");
    expect(mockWriteFileSync).toHaveBeenCalled();
  });

  it("writes camera image to stdout when no output file", async () => {
    const imageData = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);
    mockRequest.mockResolvedValueOnce({
      statusCode: 200,
      body: {
        text: () => Promise.resolve(""),
        arrayBuffer: () => Promise.resolve(imageData.buffer),
      },
    });

    const writeSpy = vi.spyOn(process.stdout, "write").mockImplementation(() => true);

    const cmd = createCameraCommand();
    await cmd.parseAsync(["camera.front_door"], { from: "user" });

    expect(writeSpy).toHaveBeenCalled();
    writeSpy.mockRestore();
  });
});
