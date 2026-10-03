import { describe, it, expect } from "vitest";
import {
  getEntityRegistry,
  getEntityRegistryForDisplay,
  captureLog,
  captureFailure,
} from "./helpers/registries-command.js";
import { createRegistriesCommand } from "../src/commands/registries.js";

describe("registries display command", () => {
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
    const { output, error } = await captureFailure(["--display"]);
    expect(JSON.parse(output)).toEqual({
      entity_registry_display: [],
      message: "Compact entity registry display is unavailable.",
      success: false,
      error: "WS failed",
    });
    expect(error.message).toContain("WS failed");
    expect(getEntityRegistry).not.toHaveBeenCalled();
  });

  it("rejects an invalid compact display limit before requesting registry data", async () => {
    await expect(createRegistriesCommand().parseAsync(
      ["--display", "--limit", "0"],
      { from: "user" },
    )).rejects.toThrow("Invalid limit '0'. Must be a positive integer.");
    expect(getEntityRegistryForDisplay).not.toHaveBeenCalled();
  });
});
