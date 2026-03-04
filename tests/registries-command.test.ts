import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createRegistriesCommand } from "../src/commands/registries.js";

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

vi.mock("../src/api/registries.js", () => ({
  WebSocketRegistryClient: vi.fn().mockImplementation(() => ({
    getEntityRegistry,
    getDeviceRegistry,
    getAreaRegistry,
    getFloorRegistry,
    getLabelRegistry,
    getCategoryRegistry,
    close,
  })),
  RegistryApiClient: vi.fn().mockImplementation(() => ({
    getEntityRegistry,
    getDeviceRegistry,
    getAreaRegistry,
    getFloorRegistry,
    getLabelRegistry,
    getCategoryRegistry,
  })),
}));

vi.mock("../src/api/index.js", () => ({
  WebSocketRegistryClient: vi.fn().mockImplementation(() => ({
    getEntityRegistry,
    getDeviceRegistry,
    getAreaRegistry,
    getFloorRegistry,
    getLabelRegistry,
    getCategoryRegistry,
    close,
  })),
  HomeAssistantClient: vi.fn().mockImplementation(() => ({
    getStates: vi.fn(async () => []),
  })),
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
    getDeviceRegistry.mockClear();
    getAreaRegistry.mockClear();
    getFloorRegistry.mockClear();
    getLabelRegistry.mockClear();
    getCategoryRegistry.mockClear();
    close.mockClear();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("lists entity registry with --entities flag", async () => {
    const cmd = createRegistriesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--entities"], { from: "user" })
    );

    expect(result).toContain("entity_registry");
    expect(result).toContain("light.living_room");
    expect(getEntityRegistry).toHaveBeenCalledTimes(1);
  });

  it("filters entity registry by domain", async () => {
    const cmd = createRegistriesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--entities", "--domain", "light"], { from: "user" })
    );

    expect(result).toContain("light.living_room");
    const parsed = JSON.parse(result);
    expect(parsed.entity_registry.every((e: { entity_id: string }) => e.entity_id.startsWith("light."))).toBe(true);
  });

  it("returns count with --count flag", async () => {
    const cmd = createRegistriesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--entities", "--count"], { from: "user" })
    );

    expect(result).toContain("entity_registry_count");
    const parsed = JSON.parse(result);
    expect(typeof parsed.entity_registry_count).toBe("number");
  });

  it("lists device registry with --devices flag", async () => {
    const cmd = createRegistriesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--devices"], { from: "user" })
    );

    expect(result).toContain("device_registry");
    expect(result).toContain("Hue Bulb");
  });

  it("lists area registry with --areas flag", async () => {
    const cmd = createRegistriesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--areas"], { from: "user" })
    );

    expect(result).toContain("area_registry");
    expect(result).toContain("Living Room");
  });

  it("lists floor registry with --floors flag", async () => {
    const cmd = createRegistriesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--floors"], { from: "user" })
    );

    expect(result).toContain("floor_registry");
    expect(result).toContain("Ground Floor");
  });

  it("lists label registry with --labels flag", async () => {
    const cmd = createRegistriesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--labels"], { from: "user" })
    );

    expect(result).toContain("label_registry");
    expect(result).toContain("Important");
  });

  it("lists category registry with --categories flag", async () => {
    const cmd = createRegistriesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--categories"], { from: "user" })
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
      cmd.parseAsync(["node", "test"], { from: "user" })
    );

    // Should not throw, just show empty/fallback results
    expect(result).toBeDefined();
  });

  it("uses --entity alias for --entities", async () => {
    const cmd = createRegistriesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--entity"], { from: "user" })
    );

    expect(result).toContain("entity_registry");
  });

  it("uses --device alias for --devices", async () => {
    const cmd = createRegistriesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--device"], { from: "user" })
    );

    expect(result).toContain("device_registry");
  });

  it("filters devices by area-id", async () => {
    const cmd = createRegistriesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--devices", "--area-id", "living_room"], { from: "user" })
    );

    expect(result).toContain("device_registry");
  });

  it("filters entities by device-id", async () => {
    const cmd = createRegistriesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["node", "test", "--entities", "--device-id", "dev1"], { from: "user" })
    );

    const parsed = JSON.parse(result);
    expect(parsed.entity_registry.every((e: { device_id: string }) => e.device_id === "dev1")).toBe(true);
  });
});
