import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createServicesCommand } from "../src/commands/core.js";

const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

vi.mock("../src/config/loader.js", () => ({
  getConfig: vi.fn(() => ({
    url: "http://localhost:8123",
    token: "test-token",
    outputFormat: "toon",
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

describe("core services command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("formats object-style services in default output", async () => {
    mockRequest.mockResolvedValueOnce(
      mockResponse([
        {
          domain: "light",
          services: {
            turn_on: { fields: {} },
            turn_off: { fields: {} },
          },
        },
      ])
    );

    const cmd = createServicesCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["node", "test"], { from: "user" });
    console.log = originalLog;

    expect(output.join("\n")).toContain("light,turn_on|turn_off");
  });

  it("supports --count output", async () => {
    mockRequest.mockResolvedValueOnce(
      mockResponse([
        { domain: "light", services: { turn_on: {}, turn_off: {} } },
        { domain: "switch", services: ["turn_on"] },
      ])
    );

    const cmd = createServicesCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["node", "test", "--count"], { from: "user" });
    console.log = originalLog;

    const result = output.join("\n");
    expect(result).toContain("total_services");
    expect(result).toContain("3");
  });

  it("supports --flat with metadata", async () => {
    mockRequest.mockResolvedValueOnce(
      mockResponse([
        { domain: "light", services: { turn_on: { fields: { brightness: {} } } } },
      ])
    );

    const cmd = createServicesCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["node", "test", "--flat"], { from: "user" });
    console.log = originalLog;

    const result = output.join("\n");
    expect(result).toContain("field_count");
    expect(result).toContain("turn_on");
    expect(result).toContain("1");
  });

  it("supports --schema normalized output", async () => {
    mockRequest.mockResolvedValueOnce(
      mockResponse([
        {
          domain: "light",
          services: {
            turn_on: {
              target: {},
              fields: {
                entity_id: { required: true },
                brightness: { required: false },
              },
            },
          },
        },
      ])
    );

    const cmd = createServicesCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(["node", "test", "--schema"], { from: "user" });
    console.log = originalLog;

    const result = output.join("\n");
    expect(result).toContain("required_fields");
    expect(result).toContain("accepts_target");
    expect(result).toContain("entity_id");
  });
});
