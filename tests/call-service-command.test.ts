import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCallServiceCommand } from "../src/commands/services.js";

const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);
const { configMock, wsCallService, wsClose } = vi.hoisted(() => ({
  configMock: vi.fn(),
  wsCallService: vi.fn(),
  wsClose: vi.fn(async () => undefined),
}));

vi.mock("../src/config/loader.js", () => ({
  getConfig: configMock,
}));

vi.mock("undici", () => ({
  request: vi.fn(),
}));

vi.mock("../src/api/websocket.js", () => ({
  HomeAssistantWebSocketClient: vi.fn().mockImplementation(function () {
    return { callService: wsCallService, close: wsClose };
  }),
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

function serviceCatalog(definition: Record<string, unknown> = {}) {
  return [{ domain: "light", services: { turn_on: definition } }];
}

async function captureOutput(args: string[]): Promise<Record<string, unknown>> {
  const output: string[] = [];
  const log = vi.spyOn(console, "log").mockImplementation((value: string) => output.push(value));
  await createCallServiceCommand().parseAsync(args, { from: "user" });
  log.mockRestore();
  return JSON.parse(output.join("\n")) as Record<string, unknown>;
}

describe("call-service command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    configMock.mockReturnValue({
      url: "http://localhost:8123",
      token: "test-token",
      outputFormat: "json",
      timeout: 30000,
      readOnly: false,
    });
    wsCallService.mockReset();
    wsClose.mockClear();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("validates input and calls service", async () => {
    mockRequest
      .mockResolvedValueOnce(
        mockResponse([
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
        ])
      )
      .mockResolvedValueOnce(
        mockResponse([{ entity_id: "light.kitchen", state: "on", attributes: {} }])
      );

    const cmd = createCallServiceCommand();
    const output: string[] = [];
    const originalLog = console.log;
    console.log = (msg: string) => output.push(msg);

    await cmd.parseAsync(
      [
        "light",
        "turn_on",
        "--data",
        "{\"entity_id\":\"light.kitchen\",\"brightness\":180}",
        "--validate-input",
      ],
      { from: "user" }
    );
    console.log = originalLog;

    expect(output.join("\n")).toContain("\"changed_state_count\": 1");
  });

  it("fails strict validation for unknown fields", async () => {
    mockRequest.mockResolvedValueOnce(
      mockResponse([
        {
          domain: "light",
          services: {
            turn_on: {
              fields: {
                entity_id: { required: true },
              },
            },
          },
        },
      ])
    );

    const cmd = createCallServiceCommand();
    await expect(
      cmd.parseAsync(
        [
          "light",
          "turn_on",
          "--data",
          "{\"entity_id\":\"light.kitchen\",\"random_field\":true}",
          "--strict-input",
        ],
        { from: "user" }
      )
    ).rejects.toThrow("Unknown field: 'random_field'");
  });

  it("normalizes required REST response data and explicit targets", async () => {
    mockRequest
      .mockResolvedValueOnce(mockResponse(serviceCatalog({
        target: {},
        fields: { brightness: { required: false } },
        response: { optional: false },
      })))
      .mockResolvedValueOnce(mockResponse({
        changed_states: [],
        service_response: { accepted: true },
      }));

    const output = await captureOutput([
      "light", "turn_on",
      "--data", "{\"brightness\":180}",
      "--target", "{\"entity_id\":\"light.old\",\"label_id\":[\"evening\"]}",
      "--entity-id", "light.kitchen,light.dining",
      "--device-id", "device-1",
      "--area-id", "kitchen",
      "--floor-id", "ground",
      "--label-id", "evening,new-label",
    ]);

    const body = JSON.parse((mockRequest.mock.calls[1]?.[1] as { body: string }).body) as Record<string, unknown>;
    expect(body).toEqual({
      brightness: 180,
      entity_id: ["light.kitchen", "light.dining"],
      label_id: ["evening", "new-label"],
      device_id: ["device-1"],
      area_id: ["kitchen"],
      floor_id: ["ground"],
    });
    expect(mockRequest.mock.calls[1]?.[0]).toContain("?return_response");
    expect(output).toEqual(expect.objectContaining({
      operation: "service_action",
      transport: "rest",
      response_capability: "required",
      response_requested: true,
      service_response: { accepted: true },
    }));
  });

  it("keeps optional response data opt-in and honors the legacy alias", async () => {
    mockRequest
      .mockResolvedValueOnce(mockResponse(serviceCatalog({ response: { optional: true } })))
      .mockResolvedValueOnce(mockResponse([]));
    const automatic = await captureOutput(["light", "turn_on"]);
    expect(mockRequest.mock.calls[1]?.[0]).not.toContain("return_response");
    expect(automatic["response_capability"]).toBe("optional");

    mockRequest
      .mockResolvedValueOnce(mockResponse(serviceCatalog({ response: { optional: true } })))
      .mockResolvedValueOnce(mockResponse({ changed_states: [], service_response: null }));
    const explicit = await captureOutput(["light", "turn_on", "--return-response"]);
    expect(mockRequest.mock.calls[3]?.[0]).toContain("?return_response");
    expect(explicit["response_requested"]).toBe(true);
  });

  it("loads service data from a file but gives inline data precedence", async () => {
    mockRequest
      .mockResolvedValueOnce(mockResponse(serviceCatalog()))
      .mockResolvedValueOnce(mockResponse([]));
    await captureOutput([
      "light", "turn_on", "--data-file", "tests/fixtures/service-action-data.json",
    ]);
    expect(JSON.parse((mockRequest.mock.calls[1]?.[1] as { body: string }).body)).toEqual({ brightness: 64 });

    mockRequest
      .mockResolvedValueOnce(mockResponse(serviceCatalog()))
      .mockResolvedValueOnce(mockResponse([]));
    await captureOutput([
      "light", "turn_on", "--data", "{\"brightness\":128}", "--data-file", "does-not-exist.json",
    ]);
    expect(JSON.parse((mockRequest.mock.calls[3]?.[1] as { body: string }).body)).toEqual({ brightness: 128 });
  });

  it("returns a non-executing plan with validation evidence in read-only mode", async () => {
    configMock.mockReturnValue({
      url: "http://localhost:8123",
      token: "test-token",
      outputFormat: "json",
      timeout: 30000,
      readOnly: true,
    });
    mockRequest.mockResolvedValueOnce(mockResponse(serviceCatalog({
      fields: { brightness: { required: true } },
      response: { optional: false },
    })));

    const output = await captureOutput([
      "light", "turn_on", "--dry-run", "--strict-input", "--response", "never",
    ]);
    expect(output).toEqual(expect.objectContaining({
      operation: "service_action_plan",
      executable: false,
      read_only: true,
      response_capability: "required",
    }));
    expect((output["validation"] as Record<string, unknown>)["ok"]).toBe(false);
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it("blocks execution before discovery when read-only mode is active", async () => {
    configMock.mockReturnValue({
      url: "http://localhost:8123",
      token: "test-token",
      outputFormat: "json",
      timeout: 30000,
      readOnly: true,
    });
    await expect(createCallServiceCommand().parseAsync(
      ["light", "turn_on", "--transport", "websocket"],
      { from: "user" },
    )).rejects.toThrow("Read-only mode blocked WEBSOCKET");
    expect(mockRequest).not.toHaveBeenCalled();
    expect(wsCallService).not.toHaveBeenCalled();
  });

  it("reports the REST endpoint when read-only mode blocks execution", async () => {
    configMock.mockReturnValue({
      url: "http://localhost:8123",
      token: "test-token",
      outputFormat: "json",
      timeout: 30000,
      readOnly: true,
    });
    await expect(createCallServiceCommand().parseAsync(
      ["light", "turn_on"],
      { from: "user" },
    )).rejects.toThrow("Read-only mode blocked POST /api/services/light/turn_on");
    expect(mockRequest).not.toHaveBeenCalled();
  });

  it("marks invalid and response-incompatible writable plans as non-executable", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(serviceCatalog({
      fields: { brightness: { required: true } },
    })));
    const invalid = await captureOutput(["light", "turn_on", "--dry-run"]);
    expect(invalid["executable"]).toBe(false);

    mockRequest.mockResolvedValueOnce(mockResponse(serviceCatalog({ response: {} })));
    const incompatible = await captureOutput([
      "light", "turn_on", "--dry-run", "--response", "never",
    ]);
    expect(incompatible["executable"]).toBe(false);
  });

  it("rejects disabling a required response before execution", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(serviceCatalog({ response: {} })));
    await expect(createCallServiceCommand().parseAsync(
      ["light", "turn_on", "--response", "never"],
      { from: "user" },
    )).rejects.toThrow("requires response data");
    expect(mockRequest).toHaveBeenCalledTimes(1);
  });

  it.each(["rest", "websocket"])("rejects targets for non-targetable %s actions", async (transport) => {
    mockRequest.mockResolvedValueOnce(mockResponse(serviceCatalog({ fields: {} })));
    await expect(createCallServiceCommand().parseAsync(
      ["light", "turn_on", "--transport", transport, "--entity-id", "light.kitchen"],
      { from: "user" },
    )).rejects.toThrow("does not accept a target");
    expect(mockRequest).toHaveBeenCalledTimes(1);
    expect(wsCallService).not.toHaveBeenCalled();
  });

  it("records unsupported targets as non-executable dry-run evidence", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(serviceCatalog({ fields: {} })));
    const output = await captureOutput([
      "light", "turn_on", "--entity-id", "light.kitchen", "--dry-run",
    ]);
    expect(output["executable"]).toBe(false);
    expect((output["validation"] as { errors: string[] }).errors).toContain(
      "Service action 'light.turn_on' does not accept a target",
    );
  });

  it("normalizes WebSocket execution and always closes the connection", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(serviceCatalog({
      target: {},
      response: { optional: true },
    })));
    wsCallService.mockResolvedValueOnce({
      context: { id: "ctx", parent_id: null, user_id: "user" },
      response: { accepted: true },
    });

    const output = await captureOutput([
      "light", "turn_on", "--transport", "websocket", "--response", "always",
      "--data", "{\"brightness\":100}", "--label-id", "evening",
    ]);
    expect(wsCallService).toHaveBeenCalledWith({
      domain: "light",
      service: "turn_on",
      serviceData: { brightness: 100 },
      target: { label_id: ["evening"] },
      returnResponse: true,
    });
    expect(output).toEqual(expect.objectContaining({
      transport: "websocket",
      changed_state_count: 0,
      context: { id: "ctx", parent_id: null, user_id: "user" },
      service_response: { accepted: true },
    }));
    expect(wsClose).toHaveBeenCalledTimes(1);
  });

  it("closes WebSocket transport after an execution error", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse(serviceCatalog()));
    wsCallService.mockRejectedValueOnce(new Error("server rejected action"));
    await expect(createCallServiceCommand().parseAsync(
      ["light", "turn_on", "--transport", "websocket"],
      { from: "user" },
    )).rejects.toThrow("server rejected action");
    expect(wsClose).toHaveBeenCalledTimes(1);
  });

  it("reports unknown service schemas in dry-run plans", async () => {
    mockRequest.mockResolvedValueOnce(mockResponse([]));
    const output = await captureOutput(["custom", "act", "--dry-run"]);
    expect(output["response_capability"]).toBe("unknown");
    expect((output["validation"] as { warnings: string[] }).warnings[0]).toContain("No structured schema");
  });

  it("emits non-strict validation warnings without blocking execution", async () => {
    mockRequest
      .mockResolvedValueOnce(mockResponse(serviceCatalog({ fields: {} })))
      .mockResolvedValueOnce(mockResponse([]));
    const warning = vi.spyOn(console, "error").mockImplementation(() => undefined);
    await captureOutput(["light", "turn_on", "--data", "{\"extra\":true}", "--validate-input"]);
    expect(warning).toHaveBeenCalledWith(expect.stringContaining("Unknown field"));
    warning.mockRestore();
  });

  it.each([
    [["light", "turn_on", "--data", "[]"], "Service data must be a JSON object"],
    [["light", "turn_on", "--target", "[]"], "Target must be a JSON object"],
    [["light", "turn_on", "--target", "{\"unsupported\":\"value\"}"], "Unknown target field"],
    [["light", "turn_on", "--target", "{\"entity_id\":42}"], "must be a string or array"],
    [["light", "turn_on", "--target", "{\"entity_id\":[\"\"]}"], "must be a string or array"],
  ])("rejects malformed structured input %#", async (args, message) => {
    await expect(createCallServiceCommand().parseAsync(args, { from: "user" })).rejects.toThrow(message);
    expect(mockRequest).not.toHaveBeenCalled();
  });
});
