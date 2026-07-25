import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWebsocketCommand } from "../src/commands/websocket.js";

const close = vi.fn(async () => undefined);
const subscribeTrigger = vi.fn(async () => [{ variables: { trigger: { trigger: "event" } } }]);

vi.mock("../src/api/websocket.js", () => ({
  HomeAssistantWebSocketClient: vi.fn().mockImplementation(function () {
    return { close, subscribeTrigger };
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

describe("typed websocket trigger subscriptions", () => {
  const output: string[] = [];
  const originalLog = console.log;

  beforeEach(() => {
    close.mockClear();
    subscribeTrigger.mockClear();
    subscribeTrigger.mockResolvedValue([{ variables: { trigger: { trigger: "event" } } }]);
    output.length = 0;
    console.log = (message: string) => output.push(message);
  });

  afterEach(() => {
    console.log = originalLog;
  });

  it("observes an inline trigger with variables and explicit bounds", async () => {
    await createWebsocketCommand().parseAsync([
      "subscribe-trigger",
      "--trigger", '{"trigger":"event","event_type":"doorbell"}',
      "--variables", '{"source":"agent"}',
      "--wait-ms", "250",
      "--max-events", "3",
    ], { from: "user" });

    expect(subscribeTrigger).toHaveBeenCalledWith({
      trigger: { trigger: "event", event_type: "doorbell" },
      variables: { source: "agent" },
      waitMs: 250,
      maxEvents: 3,
    });
    expect(JSON.parse(output.join("\n"))).toMatchObject({
      subscription: "trigger",
      event_count: 1,
    });
    expect(close).toHaveBeenCalledOnce();
  });

  it("reads an array from a trigger file and uses defaults", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "hassio-trigger-"));
    const file = path.join(directory, "trigger.json");
    writeFileSync(file, JSON.stringify([{ trigger: "event", event_type: "doorbell" }]));

    try {
      await createWebsocketCommand().parseAsync([
        "subscribe-trigger", "--file", file,
      ], { from: "user" });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }

    expect(subscribeTrigger).toHaveBeenCalledWith({
      trigger: [{ trigger: "event", event_type: "doorbell" }],
      waitMs: 5000,
      maxEvents: 10,
    });
  });

  it("lets an inline trigger take precedence over a file", async () => {
    await createWebsocketCommand().parseAsync([
      "subscribe-trigger",
      "--trigger", '{"trigger":"event","event_type":"inline"}',
      "--file", "unused.json",
    ], { from: "user" });
    expect(subscribeTrigger).toHaveBeenCalledWith(expect.objectContaining({
      trigger: { trigger: "event", event_type: "inline" },
    }));
  });

  it("requires a trigger source", async () => {
    await expect(createWebsocketCommand().parseAsync([
      "subscribe-trigger",
    ], { from: "user" })).rejects.toThrow("Provide --trigger or --file");
    expect(subscribeTrigger).not.toHaveBeenCalled();
  });

  it.each([
    ['"event"', "Trigger must be a JSON object or array of objects"],
    ['[{"trigger":"event"},7]', "Trigger must be a JSON object or array of objects"],
  ])("rejects invalid trigger JSON shapes", async (trigger, message) => {
    await expect(createWebsocketCommand().parseAsync([
      "subscribe-trigger", "--trigger", trigger,
    ], { from: "user" })).rejects.toThrow(message);
    expect(subscribeTrigger).not.toHaveBeenCalled();
  });

  it("rejects non-object variables", async () => {
    await expect(createWebsocketCommand().parseAsync([
      "subscribe-trigger",
      "--trigger", '{"trigger":"event","event_type":"doorbell"}',
      "--variables", "[]",
    ], { from: "user" })).rejects.toThrow("Variables must be a JSON object");
  });

  it.each([
    ["--wait-ms", "0"],
    ["--max-events", "1.5"],
    ["--wait-ms", "9007199254740992"],
  ])("rejects invalid positive integer bounds", async (flag, value) => {
    await expect(createWebsocketCommand().parseAsync([
      "subscribe-trigger",
      "--trigger", '{"trigger":"event","event_type":"doorbell"}',
      flag, value,
    ], { from: "user" })).rejects.toThrow(`${flag} must be a positive integer`);
  });

  it("closes the socket when subscription fails", async () => {
    subscribeTrigger.mockRejectedValueOnce(new Error("admin required"));
    await expect(createWebsocketCommand().parseAsync([
      "subscribe-trigger",
      "--trigger", '{"trigger":"event","event_type":"doorbell"}',
    ], { from: "user" })).rejects.toThrow("admin required");
    expect(close).toHaveBeenCalledOnce();
  });
});
