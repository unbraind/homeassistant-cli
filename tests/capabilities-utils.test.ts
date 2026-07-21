import { describe, expect, it } from "vitest";
import { buildAgentPlan, type CapabilityReportSnapshot } from "../src/commands/capabilities-agent-plan.js";
import {
  buildHints,
  countServices,
  normalizeProbeError,
  parseTtlSeconds,
  summarizeEntityDomains,
} from "../src/commands/capabilities-utils.js";

function report(status: "available" | "unavailable"): CapabilityReportSnapshot {
  const probe = { status, endpoint: "/api/test" } as const;
  return {
    hints: ["base hint", "base hint"],
    capabilities: {
      rest_api: probe,
      websocket: probe,
      config_entries: probe,
      supervisor: probe,
      conversation: probe,
      tts: probe,
    },
  };
}

describe("capability planning utilities", () => {
  it("builds recommendations when optional capabilities are available", () => {
    const plan = buildAgentPlan(report("available"));
    expect(plan.recommended_commands).toEqual(expect.arrayContaining([
      "hassio websocket status",
      "hassio config-entries --count --format json",
      "hassio ask \"<question>\" --format json",
      "hassio tts engines --format json",
      "hassio supervisor addons --list --format json",
    ]));
    expect(plan.avoid_commands).toEqual([]);
    expect(plan.notes).toEqual(["base hint"]);
  });

  it("builds fallback guidance when optional capabilities are unavailable", () => {
    const plan = buildAgentPlan(report("unavailable"));
    expect(plan.avoid_commands).toContain("hassio supervisor addons --list");
    expect(plan.notes).toEqual(expect.arrayContaining([
      expect.stringContaining("WebSocket API is unavailable"),
      expect.stringContaining("Config entries endpoint is unavailable"),
      expect.stringContaining("Conversation domain unavailable"),
    ]));
  });

  it("parses TTL values and rejects invalid TTLs", () => {
    expect(parseTtlSeconds()).toBe(900);
    expect(parseTtlSeconds("60")).toBe(60);
    expect(() => parseTtlSeconds("0")).toThrow("positive integer");
    expect(() => parseTtlSeconds("invalid")).toThrow("positive integer");
  });

  it("normalizes probe status families", () => {
    expect(normalizeProbeError("/x", new Error("401 Unauthorized")).status).toBe("unauthorized");
    expect(normalizeProbeError("/x", new Error("404 Not Found")).status).toBe("unavailable");
    expect(normalizeProbeError("/x", "offline")).toEqual({ status: "error", endpoint: "/x", message: "offline" });
  });

  it("summarizes service and entity domains including malformed entity IDs", () => {
    expect(countServices([
      { domain: "light", services: ["turn_on"] },
      { domain: "switch", services: { turn_on: {}, turn_off: {} } },
    ])).toBe(3);
    expect(summarizeEntityDomains([
      { entity_id: "light.kitchen", state: "on", attributes: {}, last_changed: "", last_updated: "" },
      { entity_id: "orphan", state: "unknown", attributes: {}, last_changed: "", last_updated: "" },
      { entity_id: "", state: "unknown", attributes: {}, last_changed: "", last_updated: "" },
    ])).toEqual({ light: 1, orphan: 1, unknown: 1 });
  });

  it("builds conditional hints for the available capability mix", () => {
    expect(buildHints(report("available"))).toEqual(expect.arrayContaining([
      expect.stringContaining("websocket subscribe"),
      expect.stringContaining("Natural-language flows"),
      expect.stringContaining("format toon"),
    ]));
    expect(buildHints(report("unavailable"))).toEqual(expect.arrayContaining([
      expect.stringContaining("Avoid supervisor commands"),
      expect.stringContaining("format toon"),
    ]));
  });
});
