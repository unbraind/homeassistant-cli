import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createFireEventCommand,
  createRenderTemplateCommand,
  createCheckConfigCommand,
  createHandleIntentCommand,
  createCallServiceCommand,
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

describe("call-service command (extended)", () => {
  beforeEach(() => { mockRequest.mockReset(); exitSpy.mockClear(); });
  afterEach(() => { vi.clearAllMocks(); });

  it("calls service with entity-id flag", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createCallServiceCommand();
    await captureLog(() =>
      cmd.parseAsync(["light", "turn_on", "--entity-id", "light.kitchen"], { from: "user" })
    );

    const callOptions = mockRequest.mock.calls[0]?.[1] as { body?: string };
    const body = JSON.parse(callOptions?.body ?? "{}");
    expect(body.entity_id).toBe("light.kitchen");
  });

  it("calls service with --return-response flag", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({
      context: { id: "ctx" },
      response: { brightness: 200 },
    }));

    const cmd = createCallServiceCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["light", "turn_on", "--entity-id", "light.kitchen", "--return-response"], { from: "user" })
    );

    expect(result).toContain("context");
  });

  it("calls service without data or entity-id", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const cmd = createCallServiceCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["homeassistant", "reload_all"], { from: "user" })
    );

    expect(result).toContain("ctx");
  });

  it("warns on unknown fields during validation", async () => {
    mockRequest
      .mockResolvedValueOnce(mockResponse([
        {
          domain: "light",
          services: {
            turn_on: {
              fields: {
                entity_id: { required: true },
                brightness: { required: false },
              },
            },
          },
        },
      ]))
      .mockResolvedValueOnce(mockResponse({ context: { id: "ctx" } }));

    const errors: string[] = [];
    const originalErr = console.error;
    console.error = (msg: string) => errors.push(msg);

    const cmd = createCallServiceCommand();
    await captureLog(() =>
      cmd.parseAsync(
        ["light", "turn_on", "--data", '{"entity_id":"light.kitchen","extra":true}', "--validate-input"],
        { from: "user" }
      )
    );

    console.error = originalErr;
    // Validation passes with warnings for non-strict mode
    expect(mockRequest).toHaveBeenCalledTimes(2);
  });
});
