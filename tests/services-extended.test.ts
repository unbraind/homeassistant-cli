import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createFireEventCommand,
  createRenderTemplateCommand,
  createCheckConfigCommand,
  createHandleIntentCommand,
} from "../src/commands/services.js";

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

describe("fire-event command", () => {
  beforeEach(() => { mockRequest.mockReset(); exitSpy.mockClear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it("fires an event", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ message: "Event my_event fired." }));

    const cmd = createFireEventCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["my_event"], { from: "user" })
    );

    expect(result).toContain("my_event");
  });

  it("fires an event with data", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ message: "Event my_event fired." }));

    const cmd = createFireEventCommand();
    await captureLog(() =>
      cmd.parseAsync(["my_event", "--data", '{"key":"value"}'], { from: "user" })
    );

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.key).toBe("value");
  });
});

describe("render-template command", () => {
  beforeEach(() => { mockRequest.mockReset(); exitSpy.mockClear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it("renders a template string", async () => {
    mockRequest.mockResolvedValueOnce({
      statusCode: 200,
      body: {
        text: () => Promise.resolve("Hello World"),
        arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)),
      },
    });

    const cmd = createRenderTemplateCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["{{ 'Hello World' }}"], { from: "user" })
    );

    expect(result).toContain("Hello World");
  });

  it("reads a template from a file", async () => {
    mockRequest.mockResolvedValueOnce({
      statusCode: 200,
      body: { text: () => Promise.resolve("rendered"), arrayBuffer: () => Promise.resolve(new ArrayBuffer(0)) },
    });
    await captureLog(() => createRenderTemplateCommand().parseAsync([
      "ignored", "--file", "AGENTS.md",
    ], { from: "user" }));
    const body = JSON.parse((mockRequest.mock.calls[0]?.[1] as { body: string }).body);
    expect(body.template).toContain("AGENTS.md");
  });
});

describe("check-config command", () => {
  beforeEach(() => { mockRequest.mockReset(); exitSpy.mockClear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it("returns config check result", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({
      result: "valid",
      errors: null,
    }));

    const cmd = createCheckConfigCommand();
    const result = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );

    expect(result).toContain("valid");
  });
});

describe("handle-intent command", () => {
  beforeEach(() => { mockRequest.mockReset(); exitSpy.mockClear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it("handles an intent", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({
      response: { speech: { plain: { speech: "Done!" } } },
    }));

    const cmd = createHandleIntentCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["TurnOn"], { from: "user" })
    );

    expect(result).toContain("response");
  });

  it("handles an intent with data", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({
      response: { speech: { plain: { speech: "Done!" } } },
    }));

    const cmd = createHandleIntentCommand();
    await captureLog(() =>
      cmd.parseAsync(["TurnOn", "--data", '{"entity_id":"light.kitchen"}'], { from: "user" })
    );

    // handleIntent wraps payload as { name, data } in the request body
    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.name).toBe("TurnOn");
    expect(body.data?.entity_id).toBe("light.kitchen");
  });
});
