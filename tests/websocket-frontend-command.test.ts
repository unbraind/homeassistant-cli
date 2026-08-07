import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createWebsocketCommand } from "../src/commands/websocket.js";

const call = vi.fn(async (): Promise<unknown> => ({}));
const close = vi.fn(async () => undefined);

vi.mock("../src/api/websocket.js", () => ({
  HomeAssistantWebSocketClient: vi.fn().mockImplementation(function () {
    return { call, close };
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

describe("typed WebSocket frontend semantic discovery", () => {
  let output: string[];

  beforeEach(() => {
    output = [];
    call.mockReset();
    call.mockResolvedValue({});
    close.mockClear();
    vi.spyOn(console, "log").mockImplementation((value: string) => output.push(value));
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("returns object and scalar frontend versions", async () => {
    call.mockResolvedValueOnce({ version: "20260807.0" }).mockResolvedValueOnce("legacy");

    await createWebsocketCommand().parseAsync(["frontend", "version"], { from: "user" });
    expect(call).toHaveBeenLastCalledWith("frontend/get_version", undefined);
    expect(JSON.parse(output[0] ?? "")).toEqual({ version: "20260807.0" });

    output = [];
    await createWebsocketCommand().parseAsync(["frontend", "version"], { from: "user" });
    expect(JSON.parse(output[0] ?? "")).toEqual({ version: "legacy" });
  });

  it("lists filtered theme summaries with deterministic bounds", async () => {
    call.mockResolvedValue({
      themes: {
        Zebra: "unexpected",
        Alpha: { "primary-color": "blue", modes: { dark: {} } },
        Beta: { accent: "pink" },
      },
      default_theme: "Alpha",
      default_dark_theme: null,
    });

    await createWebsocketCommand().parseAsync([
      "frontend", "themes", "--name", "Beta, Alpha,Beta", "--limit", "1", "--include-values",
    ], { from: "user" });

    expect(call).toHaveBeenCalledWith("frontend/get_themes", undefined);
    expect(JSON.parse(output[0] ?? "")).toEqual({
      default_theme: "Alpha",
      default_dark_theme: null,
      count: 2,
      returned_count: 1,
      truncated: true,
      themes: [{
        name: "Alpha",
        variable_count: 2,
        values: { "primary-color": "blue", modes: { dark: {} } },
      }],
    });
  });

  it("handles scalar theme values, all rows, count-only, and unexpected responses", async () => {
    call.mockResolvedValueOnce({ themes: { Zebra: "unexpected" } }).mockResolvedValueOnce([]);

    await createWebsocketCommand().parseAsync(["frontend", "themes", "--all"], { from: "user" });
    expect(JSON.parse(output[0] ?? "")).toEqual({
      default_theme: null,
      default_dark_theme: null,
      count: 1,
      returned_count: 1,
      truncated: false,
      themes: [{ name: "Zebra", variable_count: 0 }],
    });

    output = [];
    await createWebsocketCommand().parseAsync([
      "frontend", "themes", "--count", "--limit", "invalid",
    ], { from: "user" });
    expect(JSON.parse(output[0] ?? "")).toEqual({ count: 0 });
  });

  it("lists sorted icon resources with validated integration filters", async () => {
    call.mockResolvedValue({
      resources: { light: { turn_on: "mdi:lightbulb-on", toggle: "mdi:lightbulb" } },
    });

    await createWebsocketCommand().parseAsync([
      "frontend", "icons", "--category", "services", "--integration", "light, light", "--limit", "1",
    ], { from: "user" });

    expect(call).toHaveBeenCalledWith("frontend/get_icons", {
      category: "services",
      integration: ["light"],
    });
    expect(JSON.parse(output[0] ?? "")).toEqual({
      category: "services",
      integrations: ["light"],
      count: 2,
      returned_count: 1,
      truncated: true,
      icons: [{ key: "light.toggle", value: "mdi:lightbulb" }],
    });
  });

  it("supports unfiltered icon counts and unexpected resource shapes", async () => {
    call.mockResolvedValueOnce({ resources: [] }).mockResolvedValueOnce(null);

    await createWebsocketCommand().parseAsync([
      "frontend", "icons", "--category", "entity", "--count",
    ], { from: "user" });
    expect(call).toHaveBeenLastCalledWith("frontend/get_icons", { category: "entity" });
    expect(JSON.parse(output[0] ?? "")).toEqual({ category: "entity", integrations: [], count: 0 });

    output = [];
    await createWebsocketCommand().parseAsync([
      "frontend", "icons", "--category", "triggers", "--all",
    ], { from: "user" });
    expect(JSON.parse(output[0] ?? "").icons).toEqual([]);
  });

  it("rejects invalid integration domains before connecting", async () => {
    await expect(createWebsocketCommand().parseAsync([
      "frontend", "icons", "--category", "services", "--integration", "Bad-Domain",
    ], { from: "user" })).rejects.toThrow("Invalid integration domain 'Bad-Domain'");
    expect(call).not.toHaveBeenCalled();
  });

  it("lists filtered translations with config-flow provenance", async () => {
    call.mockResolvedValue({
      resources: {
        "component.light.services.turn_on.name": "Turn on",
        "component.light.services.toggle.name": "Toggle",
        "component.switch.services.turn_on.name": "Turn on",
      },
    });

    await createWebsocketCommand().parseAsync([
      "frontend", "translations", "--language", "pt-BR", "--category", "services",
      "--integration", "light", "--config-flow", "--key", "component.light", "--all",
    ], { from: "user" });

    expect(call).toHaveBeenCalledWith("frontend/get_translations", {
      language: "pt-BR",
      category: "services",
      integration: ["light"],
      config_flow: true,
    });
    expect(JSON.parse(output[0] ?? "")).toEqual({
      language: "pt-BR",
      category: "services",
      integrations: ["light"],
      config_flow: true,
      count: 2,
      returned_count: 2,
      truncated: false,
      translations: [
        { key: "component.light.services.toggle.name", value: "Toggle" },
        { key: "component.light.services.turn_on.name", value: "Turn on" },
      ],
    });
  });

  it("supports translation counts without optional payload fields", async () => {
    call.mockResolvedValue({ resources: { "component.light.entity.light.state.on": "On" } });

    await createWebsocketCommand().parseAsync([
      "frontend", "translations", "--language", "de", "--category", "entity", "--count",
    ], { from: "user" });

    expect(call).toHaveBeenCalledWith("frontend/get_translations", { language: "de", category: "entity" });
    expect(JSON.parse(output[0] ?? "")).toEqual({
      language: "de",
      category: "entity",
      integrations: [],
      config_flow: false,
      count: 1,
    });
  });

  it("rejects invalid translation language, category, integration, and limits", async () => {
    for (const args of [
      ["--language", "not a language", "--category", "services"],
      ["--language", "en", "--category", "Bad-Category"],
      ["--language", "en", "--category", "services", "--integration", "Bad-Domain"],
    ]) {
      await expect(createWebsocketCommand().parseAsync([
        "frontend", "translations", ...args,
      ], { from: "user" })).rejects.toThrow("Invalid");
    }
    await expect(createWebsocketCommand().parseAsync([
      "frontend", "icons", "--category", "conditions", "--limit", "0",
    ], { from: "user" })).rejects.toThrow("Invalid limit '0'");
    expect(call).not.toHaveBeenCalled();
  });

  it("closes the WebSocket after call failures", async () => {
    call.mockRejectedValue(new Error("socket failed"));
    await expect(createWebsocketCommand().parseAsync(["frontend", "version"], { from: "user" }))
      .rejects.toThrow("socket failed");
    expect(close).toHaveBeenCalledOnce();
  });
});
