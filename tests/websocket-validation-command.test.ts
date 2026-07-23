import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWebsocketCommand } from "../src/commands/websocket.js";

const close = vi.fn(async () => undefined);
const call = vi.fn(async () => ({
  triggers: { valid: true, error: null },
  conditions: { valid: true, error: null },
  actions: { valid: true, error: null },
}));

vi.mock("../src/api/websocket.js", () => ({
  HomeAssistantWebSocketClient: vi.fn().mockImplementation(function () {
    return { close, call };
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

describe("typed websocket automation validation", () => {
  const output: string[] = [];
  const originalLog = console.log;

  beforeEach(() => {
    call.mockClear();
    close.mockClear();
    output.length = 0;
    console.log = (message: string) => output.push(message);
  });

  afterEach(() => {
    console.log = originalLog;
  });

  it("validates inline trigger, condition, and action definitions", async () => {
    await createWebsocketCommand().parseAsync([
      "validate-config",
      "--trigger", '{"trigger":"state","entity_id":"binary_sensor.door"}',
      "--condition", '{"condition":"state","entity_id":"sun.sun","state":"above_horizon"}',
      "--action", '[{"action":"light.turn_on","target":{"entity_id":"light.kitchen"}}]',
    ], { from: "user" });

    expect(call).toHaveBeenCalledWith("validate_config", {
      triggers: { trigger: "state", entity_id: "binary_sensor.door" },
      conditions: { condition: "state", entity_id: "sun.sun", state: "above_horizon" },
      actions: [{ action: "light.turn_on", target: { entity_id: "light.kitchen" } }],
    });
    expect(JSON.parse(output.join("\n")).actions.valid).toBe(true);
    expect(close).toHaveBeenCalledOnce();
  });

  it("reads singular file fields and lets CLI definitions override them", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "hassio-validation-"));
    const file = path.join(directory, "automation.json");
    writeFileSync(file, JSON.stringify({
      trigger: { trigger: "time", at: "12:00:00" },
      condition: [],
      action: [{ action: "light.turn_off" }],
      alias: "Ignored metadata is allowed",
    }));

    try {
      await createWebsocketCommand().parseAsync([
        "validate-config",
        "--file", file,
        "--action", '{"action":"light.turn_on"}',
      ], { from: "user" });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }

    expect(call).toHaveBeenCalledWith("validate_config", {
      triggers: { trigger: "time", at: "12:00:00" },
      conditions: [],
      actions: { action: "light.turn_on" },
    });
  });

  it("accepts server-compatible plural fields in a JSON file", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "hassio-validation-"));
    const file = path.join(directory, "automation.json");
    writeFileSync(file, JSON.stringify({
      triggers: [],
      conditions: [],
      actions: [],
    }));

    try {
      await createWebsocketCommand().parseAsync([
        "validate-config", "--file", file,
      ], { from: "user" });
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }

    expect(call).toHaveBeenCalledWith("validate_config", {
      triggers: [],
      conditions: [],
      actions: [],
    });
  });

  it("requires at least one definition", async () => {
    await expect(createWebsocketCommand().parseAsync([
      "validate-config",
    ], { from: "user" })).rejects.toThrow(
      "Provide at least one trigger, condition, or action definition",
    );
    expect(call).not.toHaveBeenCalled();
  });

  it("rejects primitive inline definitions", async () => {
    await expect(createWebsocketCommand().parseAsync([
      "validate-config", "--action", '"light.turn_on"',
    ], { from: "user" })).rejects.toThrow("Action must be a JSON object or array");
    expect(call).not.toHaveBeenCalled();
  });

  it("rejects a non-object automation file", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "hassio-validation-"));
    const file = path.join(directory, "automation.json");
    writeFileSync(file, "[]");

    try {
      await expect(createWebsocketCommand().parseAsync([
        "validate-config", "--file", file,
      ], { from: "user" })).rejects.toThrow("Automation file must contain a JSON object");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
    expect(call).not.toHaveBeenCalled();
  });

  it("rejects primitive definitions read from an automation file", async () => {
    const directory = mkdtempSync(path.join(tmpdir(), "hassio-validation-"));
    const file = path.join(directory, "automation.json");
    writeFileSync(file, JSON.stringify({ action: "light.turn_on" }));

    try {
      await expect(createWebsocketCommand().parseAsync([
        "validate-config", "--file", file,
      ], { from: "user" })).rejects.toThrow("Action must be a JSON object or array");
    } finally {
      rmSync(directory, { recursive: true, force: true });
    }
    expect(call).not.toHaveBeenCalled();
  });
});
