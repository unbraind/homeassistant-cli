import { expect, vi, beforeEach, afterEach } from "vitest";
import { createRegistriesCommand } from "../../src/commands/registries.js";

const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

vi.mock("../../src/config/loader.js", () => ({
  getConfig: vi.fn(() => ({
    url: "http://localhost:8123",
    token: "test-token",
    outputFormat: "json",
    timeout: 30000,
    readOnly: false,
  })),
}));

// Mock WebSocket registry client
export const getEntityRegistry = vi.fn(async () => [
  { entity_id: "light.living_room", area_id: "living_room", device_id: "dev1", platform: "hue" },
  { entity_id: "switch.fan", area_id: "bedroom", device_id: "dev2", platform: "tplink" },
]);
export const getEntityRegistryForDisplay = vi.fn(async () => ({
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
export const getDeviceRegistry = vi.fn(async () => [
  { id: "dev1", name: "Hue Bulb", area_id: "living_room", manufacturer: "Philips" },
]);
export const getAreaRegistry = vi.fn(async () => [
  { area_id: "living_room", name: "Living Room" },
  { area_id: "bedroom", name: "Bedroom" },
]);
export const getFloorRegistry = vi.fn(async () => [
  { floor_id: "ground", name: "Ground Floor", level: 0 },
]);
export const getLabelRegistry = vi.fn(async () => [
  { label_id: "important", name: "Important", color: "red" },
]);
export const getCategoryRegistry = vi.fn(async () => [
  { category_id: "lighting", name: "Lighting" },
]);
export const close = vi.fn(async () => undefined);
export const getStates = vi.fn(async () => [] as Array<{ entity_id: string; state: string; attributes: Record<string, unknown> }>);

vi.mock("../../src/api/registries.js", () => ({
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

vi.mock("../../src/api/index.js", () => ({
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

export function captureLog(fn: () => Promise<void>): Promise<string> {
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

export async function captureFailure(args: string[]): Promise<{ output: string; error: Error }> {
  let failure: unknown;
  const output = await captureLog(async () => {
    try {
      await createRegistriesCommand().parseAsync(args, { from: "user" });
    } catch (error) {
      failure = error;
    }
  });
  expect(failure).toBeInstanceOf(Error);
  expect((failure as Error).message).toContain("Registry query failed:");
  expect(close).toHaveBeenCalledTimes(1);
  return { output, error: failure as Error };
}

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
