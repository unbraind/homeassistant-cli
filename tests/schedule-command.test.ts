import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createScheduleCommand } from "../src/commands/schedule.js";

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

vi.mock("undici", () => ({ request: vi.fn() }));

import { request } from "undici";
const mockRequest = request as ReturnType<typeof vi.fn>;

const mockResponse = (data: unknown, status = 200) => ({
  statusCode: status,
  body: { text: () => Promise.resolve(JSON.stringify(data)) },
});

const scheduleStates = [
  {
    entity_id: "schedule.work_hours",
    state: "on",
    attributes: { friendly_name: "Work Hours", icon: "mdi:briefcase" },
    last_changed: "2024-01-01T08:00:00Z",
    last_updated: "2024-01-01T08:00:00Z",
  },
  {
    entity_id: "schedule.night_mode",
    state: "off",
    attributes: { friendly_name: "Night Mode", icon: "mdi:moon-waning-crescent" },
    last_changed: "2024-01-01T22:00:00Z",
    last_updated: "2024-01-01T22:00:00Z",
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
  const orig = console.log;
  console.log = (msg: string) => output.push(msg);
  return fn()
    .then(() => { console.log = orig; return output.join("\n"); })
    .catch((err) => { console.log = orig; throw err; });
}

describe("schedule command", () => {
  beforeEach(() => { mockRequest.mockReset(); exitSpy.mockClear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it("lists all schedule entities", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(scheduleStates));
    const cmd = createScheduleCommand();
    const result = await captureLog(() => cmd.parseAsync(["node", "test"], { from: "user" }));
    const parsed = JSON.parse(result);
    expect(parsed.schedules).toHaveLength(2);
    expect(parsed.schedules[0].entity_id).toBe("schedule.work_hours");
    expect(parsed.schedules[1].entity_id).toBe("schedule.night_mode");
  });

  it("returns count with --count", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(scheduleStates));
    const cmd = createScheduleCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--count"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.schedules_count).toBe(2);
  });

  it("filters by state", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(scheduleStates));
    const cmd = createScheduleCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--state", "on"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.schedules).toHaveLength(1);
    expect(parsed.schedules[0].entity_id).toBe("schedule.work_hours");
  });

  it("reloads schedule configuration", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createScheduleCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--reload"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("reloaded");
  });

  it("gets schedule for a specific entity", async () => {
    const scheduleData = { schedule: [{ from: "08:00:00", to: "17:00:00" }] };
    mockRequest.mockResolvedValueOnce(mockResponse(scheduleData));
    const cmd = createScheduleCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--entity-id", "schedule.work_hours"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.entity_id).toBe("schedule.work_hours");
  });
});
