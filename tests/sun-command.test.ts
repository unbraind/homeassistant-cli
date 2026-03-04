import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSunCommand } from "../src/commands/sun.js";

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

const sunState = {
  entity_id: "sun.sun",
  state: "above_horizon",
  attributes: {
    elevation: 35.27,
    azimuth: 172.27,
    rising: true,
    next_dawn: "2026-03-05T05:01:37Z",
    next_rising: "2026-03-05T05:33:16Z",
    next_noon: "2026-03-04T11:11:13Z",
    next_setting: "2026-03-04T16:47:47Z",
    next_dusk: "2026-03-04T17:19:32Z",
    next_midnight: "2026-03-04T23:10:55Z",
    friendly_name: "Sun",
  },
  last_changed: "2026-03-04T05:33:34Z",
  last_updated: "2026-03-04T10:45:44Z",
};

function captureLog(fn: () => Promise<void>): Promise<string> {
  const output: string[] = [];
  const orig = console.log;
  console.log = (msg: string) => output.push(msg);
  return fn()
    .then(() => { console.log = orig; return output.join("\n"); })
    .catch((err) => { console.log = orig; throw err; });
}

describe("sun command", () => {
  beforeEach(() => { mockRequest.mockReset(); exitSpy.mockClear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it("returns sun position data", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([sunState]));
    const cmd = createSunCommand();
    const result = await captureLog(() => cmd.parseAsync(["node", "test"], { from: "user" }));
    const parsed = JSON.parse(result);
    expect(parsed.state).toBe("above_horizon");
    expect(parsed.elevation).toBe(35.27);
    expect(parsed.azimuth).toBe(172.27);
    expect(parsed.rising).toBe(true);
    expect(parsed.next_dawn).toBe("2026-03-05T05:01:37Z");
    expect(parsed.next_setting).toBe("2026-03-04T16:47:47Z");
    expect(parsed.next_noon).toBe("2026-03-04T11:11:13Z");
  });

  it("returns error when sun.sun entity not found", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([]));
    const cmd = createSunCommand();
    const result = await captureLog(() => cmd.parseAsync(["node", "test"], { from: "user" }));
    const parsed = JSON.parse(result);
    expect(parsed.error).toContain("sun.sun entity not found");
  });
});
