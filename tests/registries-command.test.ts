import { describe, it, expect } from "vitest";
import {
  getEntityRegistry,
  captureLog,
} from "./helpers/registries-command.js";
import { createRegistriesCommand } from "../src/commands/registries.js";

describe("registries command", () => {
  it("lists entity registry with --entities flag", async () => {
    const cmd = createRegistriesCommand();
    const result = await captureLog(() =>
      cmd.parseAsync(["--entities"], { from: "user" })
    );

    expect(result).toContain("entity_registry");
    expect(result).toContain("light.living_room");
    expect(getEntityRegistry).toHaveBeenCalledTimes(1);
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
});
