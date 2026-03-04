import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createMqttCommand } from "../src/commands/mqtt.js";

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

function captureLog(fn: () => Promise<void>): Promise<string> {
  const output: string[] = [];
  const orig = console.log;
  console.log = (msg: string) => output.push(msg);
  return fn()
    .then(() => { console.log = orig; return output.join("\n"); })
    .catch((err) => { console.log = orig; throw err; });
}

describe("mqtt command", () => {
  beforeEach(() => { mockRequest.mockReset(); exitSpy.mockClear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it("publishes a message to a topic", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createMqttCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--publish", "--topic", "home/light", "--payload", "on"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("published");
    expect(parsed.topic).toBe("home/light");
    expect(parsed.payload).toBe("on");
  });

  it("publishes with QoS and retain", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createMqttCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--publish", "--topic", "home/temp", "--payload", "22", "--qos", "1", "--retain"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.qos).toBe(1);
    expect(body.retain).toBe(true);
  });

  it("rejects publish without --topic", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const cmd = createMqttCommand();
    await cmd.parseAsync(["node", "test", "--publish"], { from: "user" });
    expect(exitSpy).toHaveBeenCalledWith(1);
    errSpy.mockRestore();
  });

  it("rejects invalid QoS value", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const cmd = createMqttCommand();
    await cmd.parseAsync(["node", "test", "--publish", "--topic", "t", "--qos", "5"], { from: "user" });
    expect(exitSpy).toHaveBeenCalledWith(1);
    errSpy.mockRestore();
  });

  it("reloads MQTT configuration", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));
    const cmd = createMqttCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--reload"], { from: "user" })
    );
    const parsed = JSON.parse(result);
    expect(parsed.success).toBe(true);
    expect(parsed.action).toBe("reloaded");
  });

  it("exits with error when no flags given", async () => {
    const errSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const cmd = createMqttCommand();
    await cmd.parseAsync(["node", "test"], { from: "user" });
    expect(exitSpy).toHaveBeenCalledWith(1);
    errSpy.mockRestore();
  });
});
