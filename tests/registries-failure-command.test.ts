import { describe, it, expect } from "vitest";
import {
  getEntityRegistry,
  getEntityRegistryForDisplay,
  getDeviceRegistry,
  getAreaRegistry,
  getFloorRegistry,
  getLabelRegistry,
  getCategoryRegistry,
  close,
  getStates,
  captureLog,
  captureFailure,
} from "./helpers/registries-command.js";
import { createRegistriesCommand } from "../src/commands/registries.js";
import { HomeAssistantApiError } from "../src/api/index.js";

describe("registries failure command", () => {
  it("reports every unavailable registry before failing the command", async () => {
    getEntityRegistry.mockRejectedValueOnce(new Error("WS failed"));
    getDeviceRegistry.mockRejectedValueOnce(new Error("WS failed"));
    getAreaRegistry.mockRejectedValueOnce(new Error("WS failed"));
    getFloorRegistry.mockRejectedValueOnce(new Error("WS failed"));
    getLabelRegistry.mockRejectedValueOnce(new Error("WS failed"));
    getCategoryRegistry.mockRejectedValueOnce(new Error("WS failed"));

    const { output, error } = await captureFailure([]);
    expect(output.match(/"success": false/g)).toHaveLength(6);
    expect(error.message).toContain("WS failed");
    for (const method of [getEntityRegistry, getDeviceRegistry, getAreaRegistry,
      getFloorRegistry, getLabelRegistry, getCategoryRegistry]) {
      expect(method).toHaveBeenCalledTimes(1);
    }
  });

  it("falls back to unique state area identifiers when websocket areas are unavailable", async () => {
    getAreaRegistry.mockRejectedValueOnce(new Error("WS failed"));
    getStates.mockResolvedValueOnce([
      { entity_id: "light.one", state: "on", attributes: { area_id: "kitchen" } },
      { entity_id: "light.two", state: "off", attributes: { area_id: "kitchen" } },
      { entity_id: "sensor.no_area", state: "20", attributes: {} },
    ]);

    const { output, error } = await captureFailure(["--areas"]);
    expect(JSON.parse(output)).toEqual({
      area_registry: [{ area_id: "kitchen" }],
      message: "Area registry from entity states (WebSocket unavailable)",
      success: false,
      error: "WS failed",
    });
    expect(error.message).toContain("WS failed");
  });

  it("reports empty areas after an ordinary fallback failure", async () => {
    getAreaRegistry.mockRejectedValueOnce(new Error("WS failed"));
    getStates.mockRejectedValueOnce(new Error("REST failed"));
    const { output, error } = await captureFailure(["--areas"]);
    expect(JSON.parse(output)).toEqual({
      area_registry: [],
      message: "Area registry unavailable.",
      success: false,
      error: "WS failed",
      fallback_error: "REST failed",
    });
    expect(error.message).toContain("WS failed; REST failed");
  });

  it("preserves the WebSocket and typed Home Assistant fallback failure causes", async () => {
    getAreaRegistry.mockRejectedValueOnce(new Error("WS failed"));
    getStates.mockRejectedValueOnce(new HomeAssistantApiError("unauthorized", 401));
    const { output, error } = await captureFailure(["--areas"]);
    expect(JSON.parse(output)).toMatchObject({
      success: false, error: "WS failed", fallback_error: "unauthorized",
    });
    expect(error.message).toContain("WS failed; unauthorized");
  });

  it.each([
    ["entity", getEntityRegistry, "Entity registry unavailable"],
    ["device", getDeviceRegistry, "Device registry unavailable"],
    ["floor", getFloorRegistry, "Floor registry unavailable"],
    ["label", getLabelRegistry, "Label registry unavailable"],
    ["category", getCategoryRegistry, "Category registry unavailable"],
  ])("reports a focused %s registry failure", async (option, method, message) => {
    method.mockRejectedValueOnce(new Error("WS failed"));
    const { output, error } = await captureFailure([`--${option}`]);
    expect(JSON.parse(output)).toMatchObject({ success: false, error: "WS failed" });
    expect(output).toContain(message);
    expect(error.message).toContain("WS failed");
  });

  it("retains successful results when another selected registry fails", async () => {
    getEntityRegistry.mockRejectedValueOnce(new Error("Authentication failed"));
    const { output, error } = await captureFailure(["--entities", "--devices"]);
    expect(output).toContain('"success": false');
    expect(output).toContain('"error": "Authentication failed"');
    expect(output).toContain('"name": "Hue Bulb"');
    expect(getDeviceRegistry).toHaveBeenCalledTimes(1);
    expect(error.message).toContain("Authentication failed");
  });

  it("keeps an empty successful registry distinct from an unavailable one", async () => {
    getEntityRegistry.mockResolvedValueOnce([]);
    const output = await captureLog(() =>
      createRegistriesCommand().parseAsync(["--entities"], { from: "user" })
    );
    expect(JSON.parse(output)).toEqual({ entity_registry: [] });
    expect(close).toHaveBeenCalledTimes(1);
  });

  it("does not report a fabricated zero count when a registry is unavailable", async () => {
    getDeviceRegistry.mockRejectedValueOnce("connection refused");
    const { output, error } = await captureFailure(["--devices", "--count"]);
    expect(JSON.parse(output)).toEqual({
      device_registry: [],
      message: "Device registry unavailable.",
      success: false,
      error: "connection refused",
    });
    expect(error.message).toContain("connection refused");
  });

  it("honors count for partial state-based area results without hiding failure", async () => {
    getAreaRegistry.mockRejectedValueOnce(new Error("WS timeout"));
    getStates.mockResolvedValueOnce([
      { entity_id: "light.one", state: "on", attributes: { area_id: "kitchen" } },
      { entity_id: "light.two", state: "off", attributes: { area_id: "kitchen" } },
    ]);
    const { output } = await captureFailure(["--areas", "--count"]);
    expect(JSON.parse(output)).toEqual({
      area_registry_count: 1,
      message: "Area registry from entity states (WebSocket unavailable)",
      success: false,
      error: "WS timeout",
    });
  });

  it.each(["--entities", "--display"])("redacts credentials from %s output and the final error", async (option) => {
    const sentinel = "Auth failed for test-token at http://proxy-user:proxy-password@proxy.invalid:8080; Bearer bearer-sentinel";
    const method = option === "--display" ? getEntityRegistryForDisplay : getEntityRegistry;
    method.mockRejectedValueOnce(new Error(sentinel));
    const { output, error } = await captureFailure([option]);
    for (const text of [output, error.message]) {
      expect(text).toContain("Auth failed");
      expect(text).toContain("proxy.invalid:8080");
      expect(text).toContain("[redacted]");
      for (const secret of ["test-token", "proxy-user", "proxy-password", "bearer-sentinel"]) {
        expect(text).not.toContain(secret);
      }
    }
  });

  it("redacts credentials from both area failure causes", async () => {
    getAreaRegistry.mockRejectedValueOnce(new Error("WS denied test-token"));
    getStates.mockRejectedValueOnce(new Error("REST denied password=fallback-secret"));
    const { output, error } = await captureFailure(["--areas"]);
    expect(JSON.parse(output)).toMatchObject({
      error: "WS denied [redacted]",
      fallback_error: "REST denied password=[redacted]",
    });
    expect(error.message).not.toContain("test-token");
    expect(error.message).not.toContain("fallback-secret");
  });
});
