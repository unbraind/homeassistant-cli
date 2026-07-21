import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createSchemaCommand, createActionCommand } from "../src/commands/llm-extended.js";
import { Command } from "commander";

const exitSpy = vi.spyOn(process, 'exit').mockImplementation(() => undefined as never);

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

describe("LLM Extended Commands", () => {
  beforeEach(() => {
    mockRequest.mockReset();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("createSchemaCommand", () => {
    it("should create schema command", () => {
      const cmd = createSchemaCommand();
      expect(cmd.name()).toBe("schema");
    });

    it("should export command schema", async () => {
      const cmd = createSchemaCommand();
      const output: string[] = [];
      const originalLog = console.log;
      console.log = (msg: string) => output.push(msg);

      await cmd.parseAsync(["--commands"], { from: "user" });

      console.log = originalLog;
      const result = output.join("\n");
      expect(result).toContain("commands");
      expect(result).toContain("status");
      expect(result).toContain("call-service");
    });

    it("should export object-style service schema", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([
          { domain: "light", services: { turn_on: { fields: {} }, turn_off: { fields: {} } } },
        ])
      );

      const cmd = createSchemaCommand();
      const output: string[] = [];
      const originalLog = console.log;
      console.log = (msg: string) => output.push(msg);

      await cmd.parseAsync(["--services"], { from: "user" });

      console.log = originalLog;
      const result = output.join("\n");
      expect(result).toContain("services:");
      expect(result).toContain("light");
      expect(result).toContain("turn_on");
    });

    it("exports entity domains without requesting service schemas", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse([
        { entity_id: "sensor.one", state: "1", attributes: {} },
        { entity_id: "sensor.two", state: "2", attributes: {} },
        { entity_id: "", state: "unknown", attributes: {} },
      ]));
      const output: string[] = [];
      const originalLog = console.log;
      console.log = (message: string) => output.push(message);
      await createSchemaCommand().parseAsync(["--entities", "--count"], { from: "user" });
      console.log = originalLog;
      const result = output.join("\n");
      expect(result).toContain("entity_domain_count: 2");
      expect(result).toContain("total_entities: 3");
      expect(result).toContain("command_count: 0");
      expect(result).toContain("output_contract_count: 0");
    });

    it("should export formatter output contracts", async () => {
      const cmd = createSchemaCommand();
      const output: string[] = [];
      const originalLog = console.log;
      console.log = (msg: string) => output.push(msg);

      await cmd.parseAsync(["--output-contracts"], { from: "user" });

      console.log = originalLog;
      const result = output.join("\n");
      expect(result).toContain("output_contracts");
      expect(result).toContain("toon");
      expect(result).toContain("json-compact");
      expect(result).toContain("default_for_agents");
    });

    it("exports the full schema and reports precise section counts", async () => {
      mockRequest
        .mockResolvedValueOnce(mockResponse([{ domain: "light", services: ["turn_on"] }]))
        .mockResolvedValueOnce(mockResponse([
          { entity_id: "light.kitchen", state: "on", attributes: {} },
          { entity_id: "sensor.temperature", state: "20", attributes: {} },
          { entity_id: "malformed", state: "unknown", attributes: {} },
        ]));

      const output: string[] = [];
      const originalLog = console.log;
      console.log = (message: string) => output.push(message);
      await createSchemaCommand().parseAsync(["--full", "--count"], { from: "user" });
      console.log = originalLog;

      const result = output.join("\n");
      expect(result).toContain("service_domain_count: 1");
      expect(result).toContain("entity_domain_count: 3");
      expect(result).toContain("total_entities: 3");
      expect(result).toContain("output_contract_count: 6");
    });

    it("reports zero counts for a deliberately empty selection", async () => {
      const output: string[] = [];
      const originalLog = console.log;
      console.log = (message: string) => output.push(message);
      await createSchemaCommand().parseAsync(["--count"], { from: "user" });
      console.log = originalLog;

      expect(output.join("\n")).toContain("service_domain_count: 0");
      expect(output.join("\n")).toContain("total_entities: 0");
    });
  });

  describe("createActionCommand", () => {
    it("should create action command", () => {
      const cmd = createActionCommand();
      expect(cmd.name()).toBe("action");
    });

    it("should analyze intent and provide suggestions", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([
          { entity_id: "light.living_room", state: "off", attributes: { friendly_name: "Living Room Light" } },
          { entity_id: "switch.kitchen", state: "off", attributes: { friendly_name: "Kitchen Switch" } },
        ])
      );
      mockRequest.mockResolvedValueOnce(
        mockResponse([{ domain: "light", services: ["turn_on", "turn_off"] }])
      );

      const cmd = createActionCommand();
      const output: string[] = [];
      const originalLog = console.log;
      console.log = (msg: string) => output.push(msg);

      await cmd.parseAsync(["turn on living", "--dry-run"], { from: "user" });

      console.log = originalLog;
      const result = output.join("\n");
      expect(result).toContain("intent");
      expect(result).toContain("suggestions");
      expect(result).toContain("dry_run");
    });

    it("outputs hint without dry-run flag", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([
          { entity_id: "light.bedroom", state: "off", attributes: { friendly_name: "Bedroom Light" } },
        ])
      );

      const cmd = createActionCommand();
      const output: string[] = [];
      const originalLog = console.log;
      console.log = (msg: string) => output.push(msg);

      await cmd.parseAsync(["turn on bedroom"], { from: "user" });

      console.log = originalLog;
      const result = output.join("\n");
      expect(result).toContain("intent");
      expect(result).toContain("hint");
      expect(result).not.toContain("dry_run");
    });

    it("handles turn off intent", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([
          { entity_id: "light.kitchen", state: "on", attributes: { friendly_name: "Kitchen Light" } },
        ])
      );

      const cmd = createActionCommand();
      const output: string[] = [];
      const originalLog = console.log;
      console.log = (msg: string) => output.push(msg);

      await cmd.parseAsync(["turn off kitchen", "--dry-run"], { from: "user" });

      console.log = originalLog;
      const result = output.join("\n");
      expect(result).toContain("turn_off");
    });

    it("handles toggle intent", async () => {
      mockRequest.mockResolvedValueOnce(
        mockResponse([
          { entity_id: "switch.fan", state: "on", attributes: { friendly_name: "Fan Switch" } },
        ])
      );

      const cmd = createActionCommand();
      const output: string[] = [];
      const originalLog = console.log;
      console.log = (msg: string) => output.push(msg);

      await cmd.parseAsync(["toggle fan", "--dry-run"], { from: "user" });

      console.log = originalLog;
      const result = output.join("\n");
      expect(result).toContain("toggle");
    });

    it("ignores unsupported domains, short words, and duplicate entity matches", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse([
        { entity_id: "light.living_room", state: "off", attributes: {} },
        { entity_id: "sensor.living_room", state: "20", attributes: { friendly_name: "Living Sensor" } },
        { entity_id: "", state: "unknown", attributes: { friendly_name: "Living orphan" } },
      ]));

      const output: string[] = [];
      const originalLog = console.log;
      console.log = (message: string) => output.push(message);
      await createActionCommand().parseAsync(["turn on living room", "--dry-run"], { from: "user" });
      console.log = originalLog;

      const result = output.join("\n");
      expect(result.match(/light\.living_room/g)).toHaveLength(1);
      expect(result).not.toContain("sensor.living_room");
    });

    it("returns no suggestions when the intent has no supported action", async () => {
      mockRequest.mockResolvedValueOnce(mockResponse([
        { entity_id: "light.kitchen", state: "off", attributes: {} },
      ]));

      const output: string[] = [];
      const originalLog = console.log;
      console.log = (message: string) => output.push(message);
      await createActionCommand().parseAsync(["describe kitchen", "--dry-run"], { from: "user" });
      console.log = originalLog;

      expect(output.join("\n")).toContain("suggestions: []");
    });
  });
});
