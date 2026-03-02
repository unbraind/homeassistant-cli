import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createEntitiesCommand } from "../src/commands/llm.js";

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

describe("entities command", () => {
  beforeEach(() => {
    exitSpy.mockClear();
    mockRequest.mockReset();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("supports --limit for state list output", async () => {
    mockRequest.mockResolvedValueOnce(
      mockResponse([
        { entity_id: "light.kitchen", state: "on", attributes: {}, last_changed: "a", last_updated: "a" },
        { entity_id: "light.hall", state: "off", attributes: {}, last_changed: "b", last_updated: "b" },
      ])
    );

    const cmd = createEntitiesCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["-d", "light", "--limit", "1"], { from: "user" });

    console.log = originalLog;
    const parsed = JSON.parse(output.join("\n")) as Array<{ entity_id: string }>;
    expect(parsed).toHaveLength(1);
    expect(parsed[0].entity_id).toBe("light.kitchen");
  });

  it("supports --limit with --domains output", async () => {
    mockRequest.mockResolvedValueOnce(
      mockResponse([
        { entity_id: "sensor.a", state: "1", attributes: {}, last_changed: "a", last_updated: "a" },
        { entity_id: "sensor.b", state: "1", attributes: {}, last_changed: "a", last_updated: "a" },
        { entity_id: "light.a", state: "on", attributes: {}, last_changed: "a", last_updated: "a" },
      ])
    );

    const cmd = createEntitiesCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["--domains", "--limit", "1"], { from: "user" });

    console.log = originalLog;
    const parsed = JSON.parse(output.join("\n")) as Array<{ domain: string; count: number }>;
    expect(parsed).toHaveLength(1);
    expect(parsed[0]).toEqual({ domain: "sensor", count: 2 });
  });
});
