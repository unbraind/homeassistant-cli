import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWebsocketCommand } from "../src/commands/websocket.js";

const close = vi.fn(async () => undefined);
const call = vi.fn(async () => ({ result: true, template_errors: [] }));
const subscribeCondition = vi.fn(async () => [{ result: true }]);
const executeScript = vi.fn(async () => ({ context: { id: "ctx" }, response: null }));

vi.mock("../src/api/websocket.js", () => ({
  HomeAssistantWebSocketClient: vi.fn().mockImplementation(function () {
    return { call, close, executeScript, subscribeCondition };
  }),
}));

vi.mock("../src/config/loader.js", () => ({
  getConfig: vi.fn(() => ({
    url: "http://localhost:8123",
    token: "test-token",
    outputFormat: "json",
    timeout: 30000,
    readOnly: true,
  })),
}));

describe("typed websocket automation runtime", () => {
  const output: string[] = [];
  const originalLog = console.log;

  beforeEach(() => {
    call.mockClear();
    close.mockClear();
    executeScript.mockClear();
    subscribeCondition.mockClear();
    output.length = 0;
    console.log = (message: string) => output.push(message);
  });

  afterEach(() => {
    console.log = originalLog;
  });

  it("tests an inline condition with variables", async () => {
    await createWebsocketCommand().parseAsync([
      "automation-runtime", "test-condition",
      "--condition", '{"condition":"template","value_template":"{{ value }}"}',
      "--variables", '{"value":true}',
    ], { from: "user" });

    expect(call).toHaveBeenCalledWith("test_condition", {
      condition: { condition: "template", value_template: "{{ value }}" },
      variables: { value: true },
    });
    expect(JSON.parse(output.join("\n"))).toMatchObject({
      evaluation: "condition",
      result: { result: true },
    });
    expect(close).toHaveBeenCalledOnce();
  });

  it("observes a condition extracted from an automation file", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "hassio-condition-"));
    const file = path.join(directory, "automation.json");
    writeFileSync(file, JSON.stringify({
      conditions: { condition: "state", entity_id: "sun.sun", state: "above_horizon" },
    }));
    try {
      await createWebsocketCommand().parseAsync([
        "automation-runtime", "observe-condition", "--file", file,
        "--wait-ms", "250", "--max-events", "2",
      ], { from: "user" });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }

    expect(subscribeCondition).toHaveBeenCalledWith({
      condition: { condition: "state", entity_id: "sun.sun", state: "above_horizon" },
      waitMs: 250,
      maxEvents: 2,
    });
    expect(JSON.parse(output.join("\n"))).toMatchObject({
      subscription: "condition",
      event_count: 1,
    });
  });

  it("accepts direct condition and sequence-array files", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "hassio-runtime-files-"));
    const conditionFile = path.join(directory, "condition.json");
    const sequenceFile = path.join(directory, "sequence.json");
    writeFileSync(conditionFile, JSON.stringify({ condition: "template", value_template: "{{ true }}" }));
    writeFileSync(sequenceFile, JSON.stringify([{ action: "light.turn_off" }]));
    try {
      await createWebsocketCommand().parseAsync([
        "automation-runtime", "test-condition", "--file", conditionFile,
      ], { from: "user" });
      await createWebsocketCommand().parseAsync([
        "automation-runtime", "execute-sequence", "--file", sequenceFile,
      ], { from: "user" });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
    expect(call).toHaveBeenCalledWith("test_condition", {
      condition: { condition: "template", value_template: "{{ true }}" },
    });
    expect(executeScript).toHaveBeenCalledWith({ sequence: [{ action: "light.turn_off" }] });
  });

  it.each([["null"], ['"invalid"']])("rejects primitive file content %s", async (content) => {
    const directory = mkdtempSync(path.join(tmpdir(), "hassio-runtime-invalid-"));
    const file = path.join(directory, "condition.json");
    writeFileSync(file, content);
    try {
      await expect(createWebsocketCommand().parseAsync([
        "automation-runtime", "test-condition", "--file", file,
      ], { from: "user" })).rejects.toThrow("Condition must be a JSON object");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
  });

  it("executes actions extracted from a file with variables", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "hassio-sequence-"));
    const file = path.join(directory, "automation.json");
    writeFileSync(file, JSON.stringify({ actions: [{ action: "light.turn_on" }] }));
    try {
      await createWebsocketCommand().parseAsync([
        "automation-runtime", "execute-sequence", "--file", file,
        "--variables", '{"source":"agent"}',
      ], { from: "user" });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }

    expect(executeScript).toHaveBeenCalledWith({
      sequence: [{ action: "light.turn_on" }],
      variables: { source: "agent" },
    });
    expect(JSON.parse(output.join("\n"))).toMatchObject({ execution: "sequence" });
  });

  it("prefers inline sequence input and omits absent variables", async () => {
    await createWebsocketCommand().parseAsync([
      "automation-runtime", "execute-sequence",
      "--sequence", '{"action":"light.turn_off"}',
      "--file", "unused.json",
    ], { from: "user" });
    expect(executeScript).toHaveBeenCalledWith({ sequence: { action: "light.turn_off" } });
  });

  it.each([
    ["test-condition", "Provide --condition or --file"],
    ["observe-condition", "Provide --condition or --file"],
    ["execute-sequence", "Provide --sequence or --file"],
  ])("requires a source for %s", async (subcommand, message) => {
    await expect(createWebsocketCommand().parseAsync([
      "automation-runtime", subcommand,
    ], { from: "user" })).rejects.toThrow(message);
  });

  it.each([
    ["test-condition", "--condition", "[]", "Condition must be a JSON object"],
    ["execute-sequence", "--sequence", '"light.turn_on"', "Sequence must be a JSON object or array of objects"],
    ["execute-sequence", "--sequence", '[{"action":"light.turn_on"},7]', "Sequence must be a JSON object or array of objects"],
  ])("rejects invalid %s definitions", async (subcommand, flag, value, message) => {
    await expect(createWebsocketCommand().parseAsync([
      "automation-runtime", subcommand, flag, value,
    ], { from: "user" })).rejects.toThrow(message);
  });

  it("rejects non-object variables", async () => {
    await expect(createWebsocketCommand().parseAsync([
      "automation-runtime", "test-condition",
      "--condition", '{"condition":"template","value_template":"{{ true }}"}',
      "--variables", "[]",
    ], { from: "user" })).rejects.toThrow("Variables must be a JSON object");
  });

  it.each([["--wait-ms", "0"], ["--max-events", "1.5"]])(
    "rejects invalid observation bound %s",
    async (flag, value) => {
      await expect(createWebsocketCommand().parseAsync([
        "automation-runtime", "observe-condition",
        "--condition", '{"condition":"template","value_template":"{{ true }}"}',
        flag, value,
      ], { from: "user" })).rejects.toThrow(`${flag} must be a positive integer`);
    },
  );

  it("closes the client when evaluation fails", async () => {
    call.mockRejectedValueOnce(new Error("admin required"));
    await expect(createWebsocketCommand().parseAsync([
      "automation-runtime", "test-condition",
      "--condition", '{"condition":"template","value_template":"{{ true }}"}',
    ], { from: "user" })).rejects.toThrow("admin required");
    expect(close).toHaveBeenCalledOnce();
  });
});
