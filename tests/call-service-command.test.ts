import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createCallServiceCommand } from "../src/commands/services.js";

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

describe("call-service command", () => {
  beforeEach(() => {
    mockRequest.mockReset();
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
        mockResponse({
          context: { id: "ctx", parent_id: null, user_id: null },
        })
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

    expect(output.join("\n")).toContain("\"id\": \"ctx\"");
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
});
