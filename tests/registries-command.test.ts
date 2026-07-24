import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRegistriesCommand } from "../src/commands/registries.js";
import { HomeAssistantApiError } from "../src/api/index.js";

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

// Mock WebSocket registry client
const getEntityRegistry = vi.fn(async () => [
  { entity_id: "light.living_room", area_id: "living_room", device_id: "dev1", platform: "hue" },
  { entity_id: "switch.fan", area_id: "bedroom", device_id: "dev2", platform: "tplink" },
]);
const getEntityRegistryForDisplay = vi.fn(async () => ({
  entity_categories: { "0": "config" },
  entities: [
    {
      ei: "light.living_room",
      pl: "hue",
      ai: "living_room",
      di: "dev1",
      dp: 2,
      ec: 0,
      en: "Living Room",
      hb: true as const,
      hn: true as const,
      ic: "mdi:lightbulb",
      lb: ["favorite"],
      tk: "light",
    },
    { ei: "switch.fan", pl: "tplink" },
  ],
}));
const getDeviceRegistry = vi.fn(async () => [
  { id: "dev1", name: "Hue Bulb", area_id: "living_room", manufacturer: "Philips" },
]);
const getAreaRegistry = vi.fn(async () => [
  { area_id: "living_room", name: "Living Room" },
  { area_id: "bedroom", name: "Bedroom" },
]);
const getFloorRegistry = vi.fn(async () => [
  { floor_id: "ground", name: "Ground Floor", level: 0 },
]);
const getLabelRegistry = vi.fn(async () => [
  { label_id: "important", name: "Important", color: "red" },
]);
const getCategoryRegistry = vi.fn(async () => [
  { category_id: "lighting", name: "Lighting" },
]);
const close = vi.fn(async () => undefined);
const getStates = vi.fn(async () => [] as Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>);

vi.mock("../src/api/registries.js", () => ({
  WebSocketRegistryClient: vi.fn().mockImplementation(function () { return {
    getEntityRegistry,
    getEntityRegistryForDisplay,
    getDeviceRegistry,
    getAreaRegistry,
    getFloorRegistry,
    getLabelRegistry,
    getCategoryRegistry,
    close,
  }; }),
  RegistryApiClient: vi.fn().mockImplementation(function () { return {
    getEntityRegistry,
    getEntityRegistryForDisplay,
    getDeviceRegistry,
    getAreaRegistry,
    getFloorRegistry,
    getLabelRegistry,
    getCategoryRegistry,
  }; }),
}));

vi.mock("../src/api/index.js", () => ({
  WebSocketRegistryClient: vi.fn().mockImplementation(function () { return {
    getEntityRegistry,
    getEntityRegistryForDisplay,
    getDeviceRegistry,
    getAreaRegistry,
    getFloorRegistry,
    getLabelRegistry,
    getCategoryRegistry,
    close,
  }; }),
  HomeAssistantClient: vi.fn().mockImplementation(function () { return {
    getStates,
  }; }),
  HomeAssistantApiError: class extends Error {
    statusCode: number;
    constructor(message: string, code: number) {
      super(message);
      this.statusCode = code;
    }
  },
}));

vi.mock("undici", () => ({ request: vi.fn() }));

function captureLog(fn: () => Promise<void>): Promise<string> {
  const output: string[] = [];
  const originalLog = console.log;
  console.log = (msg: string) => output.push(msg);
  return fn().then(() => {
    console.log = originalLog;
    return output.join("\n");
  }).catch((err) => {
    console.log = originalLog;
    throw err;
  });
}

describe("registries command", () => {
  beforeEach(() => {
    getEntityRegistry.mockClear();
    getEntityRegistryForDisplay.mockClear();
    getDeviceRegistry.mockClear();
    getAreaRegistry.mockClear();
    getFloorRegistry.mockClear();
    getLabelRegistry.mockClear();
    getCategoryRegistry.mockClear();
    close.mockClear();
    getStates.mockReset().mockResolvedValue([]);
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists entity registry with --entities flag", async () => {
    const cmd = createRegistriesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entities"], { from: "user" })
    );

    expect(result).toContain("entity_registry");
    expect(result).toContain("light.living_room");
    expect(getEntityRegistry).toHaveBeenCalledTimes(1);
  });

  it("returns the raw compact enabled-entity display contract with a limit", async () => {
    const result = JSON.parse(await captureLog(() =>
      createRegistriesCommand().parseAsync(["--display", "--limit", "1"], { from: "user" })
    )) as {
      entity_categories: Record<string, string>;
      entity_registry_display: Array<{ ei: string; pl: string }>;
    };

    expect(result.entity_categories).toEqual({ "0": "config" });
    expect(result.entity_registry_display).toEqual([
      expect.objectContaining({ ei: "light.living_room", pl: "hue" }),
    ]);
    expect(getEntityRegistryForDisplay).toHaveBeenCalledTimes(1);
    expect(getEntityRegistry).not.toHaveBeenCalled();
  });

  it("decodes every compact display field and omits absent optional fields", async () => {
    const result = JSON.parse(await captureLog(() =>
      createRegistriesCommand().parseAsync(["--decode-display"], { from: "user" })
    )) as { entity_registry_display: Array<Record<string, unknown>> };

    expect(result.entity_registry_display[0]).toEqual({
      entity_id: "light.living_room",
      platform: "hue",
      area_id: "living_room",
      device_id: "dev1",
      display_precision: 2,
      entity_category: "config",
      name: "Living Room",
      hidden: true,
      has_entity_name: true,
      icon: "mdi:lightbulb",
      labels: ["favorite"],
      translation_key: "light",
    });
    expect(result.entity_registry_display[1]).toEqual({
      entity_id: "switch.fan",
      platform: "tplink",
    });
  });

  it("filters compact display entities and returns only the matching count", async () => {
    const result = JSON.parse(await captureLog(() =>
      createRegistriesCommand().parseAsync([
        "--display",
        "--domain", "light",
        "--device-id", "dev1",
        "--area-id", "living_room",
        "--count",
      ], { from: "user" })
    )) as { entity_registry_display_count: number };

    expect(result).toEqual({ entity_registry_display_count: 1 });
  });

  it("reports compact display endpoint failures without falling back to private full rows", async () => {
    getEntityRegistryForDisplay.mockRejectedValueOnce(new Error("WS failed"));
    const result = await captureLog(() =>
      createRegistriesCommand().parseAsync(["--display"], { from: "user" })
    );
    expect(result).toContain("Compact entity registry display is unavailable");
    expect(close).toHaveBeenCalled();
  });

  it("rejects an invalid compact display limit before requesting registry data", async () => {
    await expect(createRegistriesCommand().parseAsync(
      ["--display", "--limit", "0"],
      { from: "user" },
    )).rejects.toThrow("Invalid limit '0'. Must be a positive integer.");
    expect(getEntityRegistryForDisplay).not.toHaveBeenCalled();
  });

  it("filters entity registry by domain", async () => {
    const cmd = createRegistriesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entities", "--domain", "light"], { from: "user" })
    );

    expect(result).toContain("light.living_room");
    const parsed = JSON.parse(result);
    expect(parsed.entity_registry.every((e: { entity_id: string }) => e.entity_id.startsWith("light."))).toBe(true);
  });

  it("returns count with --count flag", async () => {
    const cmd = createRegistriesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entities", "--count"], { from: "user" })
    );

    expect(result).toContain("entity_registry_count");
    const parsed = JSON.parse(result);
    expect(typeof parsed.entity_registry_count).toBe("number");
  });

  it("lists device registry with --devices flag", async () => {
    const cmd = createRegistriesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--devices"], { from: "user" })
    );

    expect(result).toContain("device_registry");
    expect(result).toContain("Hue Bulb");
  });

  it("lists area registry with --areas flag", async () => {
    const cmd = createRegistriesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--areas"], { from: "user" })
    );

    expect(result).toContain("area_registry");
    expect(result).toContain("Living Room");
  });

  it("lists floor registry with --floors flag", async () => {
    const cmd = createRegistriesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--floors"], { from: "user" })
    );

    expect(result).toContain("floor_registry");
    expect(result).toContain("Ground Floor");
  });

  it("lists label registry with --labels flag", async () => {
    const cmd = createRegistriesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--labels"], { from: "user" })
    );

    expect(result).toContain("label_registry");
    expect(result).toContain("Important");
  });

  it("lists category registry with --categories flag", async () => {
    const cmd = createRegistriesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--categories"], { from: "user" })
    );

    expect(result).toContain("category_registry");
    expect(result).toContain("Lighting");
  });

  it("handles entity registry failure gracefully", async () => {
    getEntityRegistry.mockRejectedValueOnce(new Error("WS failed"));
    getDeviceRegistry.mockRejectedValueOnce(new Error("WS failed"));
    getAreaRegistry.mockRejectedValueOnce(new Error("WS failed"));
    getFloorRegistry.mockRejectedValueOnce(new Error("WS failed"));
    getLabelRegistry.mockRejectedValueOnce(new Error("WS failed"));
    getCategoryRegistry.mockRejectedValueOnce(new Error("WS failed"));

    const cmd = createRegistriesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync([], { from: "user" })
    );

    // Should not throw, just show empty/fallback results
    expect(result).toBeDefined();
  });

  it("uses --entity alias for --entities", async () => {
    const cmd = createRegistriesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entity"], { from: "user" })
    );

    expect(result).toContain("entity_registry");
  });

  it("uses --device alias for --devices", async () => {
    const cmd = createRegistriesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--device"], { from: "user" })
    );

    expect(result).toContain("device_registry");
  });

  it("filters devices by area-id", async () => {
    const cmd = createRegistriesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--devices", "--area-id", "living_room"], { from: "user" })
    );

    expect(result).toContain("device_registry");
  });

  it("filters entities by device-id", async () => {
    const cmd = createRegistriesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entities", "--device-id", "dev1"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed.entity_registry.every((e: { device_id: string }) => e.device_id === "dev1")).toBe(true);
  });

  it("filters entities by area and supports every singular registry alias", async () => {
    const entityResult = await captureLog(() =>
      createRegistriesCommand().parseAsync(["--entity", "--area-id", "bedroom"], { from: "user" })
    );
    expect(JSON.parse(entityResult).entity_registry).toEqual([
      expect.objectContaining({ entity_id: "switch.fan" }),
    ]);

    for (const alias of ["--area", "--floor", "--label", "--category"]) {
      const result = await captureLog(() => createRegistriesCommand().parseAsync([alias], { from: "user" }));
      expect(result).toContain("registry");
    }
  });

  it("returns count payloads for every non-entity registry", async () => {
    for (const option of ["--devices", "--areas", "--floors", "--labels", "--categories"]) {
      const result = JSON.parse(await captureLog(() =>
        createRegistriesCommand().parseAsync([option, "--count"], { from: "user" })
      )) as Record<string, unknown>;
      expect(Object.values(result)).toEqual([expect.any(Number)]);
    }
  });

  it("falls back to unique state area identifiers when websocket areas are unavailable", async () => {
    getAreaRegistry.mockRejectedValueOnce(new Error("WS failed"));
    getStates.mockResolvedValueOnce([
      { entity_id: "light.one", state: "on", attributes: { area_id: "kitchen" } },
      { entity_id: "light.two", state: "off", attributes: { area_id: "kitchen" } },
      { entity_id: "sensor.no_area", state: "20", attributes: {} },
    ]);

    const result = JSON.parse(await captureLog(() =>
      createRegistriesCommand().parseAsync(["--areas"], { from: "user" })
    )) as { area_registry: Array<{ area_id: string }>; message: string };
    expect(result.area_registry).toEqual([{ area_id: "kitchen" }]);
    expect(result.message).toContain("entity states");
  });

  it("reports empty areas after an ordinary fallback failure", async () => {
    getAreaRegistry.mockRejectedValueOnce(new Error("WS failed"));
    getStates.mockRejectedValueOnce(new Error("REST failed"));
    const result = await captureLog(() =>
      createRegistriesCommand().parseAsync(["--areas"], { from: "user" })
    );
    expect(result).toContain("Area registry unavailable");
  });

  it("preserves typed Home Assistant errors from the area fallback", async () => {
    getAreaRegistry.mockRejectedValueOnce(new Error("WS failed"));
    getStates.mockRejectedValueOnce(new HomeAssistantApiError("unauthorized", 401));
    await expect(createRegistriesCommand().parseAsync(["--areas"], { from: "user" })).rejects.toThrow("unauthorized");
    expect(close).toHaveBeenCalled();
  });

  it.each([
    ["entity", getEntityRegistry, "Entity registry unavailable"],
    ["device", getDeviceRegistry, "Device registry unavailable"],
    ["floor", getFloorRegistry, "Floor registry unavailable"],
    ["label", getLabelRegistry, "Label registry unavailable"],
    ["category", getCategoryRegistry, "Category registry unavailable"],
  ])("reports a focused %s registry failure", async (option, method, message) => {
    method.mockRejectedValueOnce(new Error("WS failed"));
    const result = await captureLog(() =>
      createRegistriesCommand().parseAsync([`--${option}`], { from: "user" })
    );
    expect(result).toContain(message);
    expect(close).toHaveBeenCalled();
  });
});
