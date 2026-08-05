import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createRelatedCommand } from "../src/commands/related.js";

const close = vi.fn(async () => undefined);
const getRelatedResources = vi.fn(async (): Promise<Record<string, string[]>> => ({}));

vi.mock("../src/api/diagnostics.js", () => ({
  DiagnosticsApiClient: vi.fn().mockImplementation(function () {
    return { close, getRelatedResources };
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

describe("related command", () => {
  const output: string[] = [];
  const originalLog = console.log;

  beforeEach(() => {
    output.length = 0;
    close.mockClear();
    getRelatedResources.mockReset();
    getRelatedResources.mockResolvedValue({});
    console.log = (message: string) => output.push(message);
  });

  afterEach(() => {
    console.log = originalLog;
  });

  it("sorts and bounds every returned resource type", async () => {
    getRelatedResources.mockResolvedValue({
      automation: ["automation.z", "automation.a"],
      entity: ["light.z", "light.a"],
      area: [],
    });
    await createRelatedCommand().parseAsync(["entity", "light.source", "--limit", "1"], { from: "user" });
    expect(JSON.parse(output.join("\n"))).toEqual({
      query: { item_type: "entity", item_id: "light.source" },
      count: 4,
      by_type: [{ type: "automation", count: 2 }, { type: "entity", count: 2 }],
      related: { automation: ["automation.a"], entity: ["light.a"] },
    });
    expect(close).toHaveBeenCalledOnce();
  });

  it("filters one result type and returns counts without identifiers", async () => {
    getRelatedResources.mockResolvedValue({ automation: ["automation.a"], entity: ["light.a"] });
    await createRelatedCommand().parseAsync([
      "area", "kitchen", "--result-type", "entity", "--count",
    ], { from: "user" });
    expect(JSON.parse(output.join("\n"))).toEqual({
      query: { item_type: "area", item_id: "kitchen" },
      count: 1,
      by_type: [{ type: "entity", count: 1 }],
    });
  });

  it.each([
    [["unknown", "id"], "Unsupported item type 'unknown'"],
    [["entity", "id", "--result-type", "unknown"], "Unsupported result type 'unknown'"],
    [["entity", "  "], "Item ID must not be empty"],
    [["entity", "id", "--limit", "0"], "Must be a positive integer"],
  ])("rejects invalid input before connecting", async (args, message) => {
    await expect(createRelatedCommand().parseAsync(args, { from: "user" })).rejects.toThrow(message);
    expect(getRelatedResources).not.toHaveBeenCalled();
  });

  it("closes the websocket when related search fails", async () => {
    getRelatedResources.mockRejectedValue(new Error("unknown_error"));
    await expect(createRelatedCommand().parseAsync(["integration", "sun"], { from: "user" }))
      .rejects.toThrow("unknown_error");
    expect(close).toHaveBeenCalledOnce();
  });
});
