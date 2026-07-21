import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  createAreaCreateCommand,
  createAreaUpdateCommand,
  createAreaDeleteCommand,
  createFloorCreateCommand,
  createFloorUpdateCommand,
  createFloorDeleteCommand,
  createLabelCreateCommand,
  createLabelUpdateCommand,
  createLabelDeleteCommand,
} from "../src/commands/registry-crud.js";

vi.mock("../src/config/loader.js", () => ({
  getConfig: vi.fn(() => ({
    url: "http://localhost:8123",
    token: "test-token",
    outputFormat: "json",
    timeout: 30000,
    readOnly: false,
  })),
}));

const createArea = vi.fn(async (params: unknown) => ({ area_id: "new-area", name: (params as { name: string }).name }));
const updateArea = vi.fn(async (params: unknown) => ({ area_id: (params as { area_id: string }).area_id }));
const deleteArea = vi.fn(async () => undefined);
const createFloor = vi.fn(async (params: unknown) => ({ floor_id: "floor1", name: (params as { name: string }).name }));
const updateFloor = vi.fn(async (params: unknown) => ({ floor_id: (params as { floor_id: string }).floor_id }));
const deleteFloor = vi.fn(async () => undefined);
const createLabel = vi.fn(async (params: unknown) => ({ label_id: "label1", name: (params as { name: string }).name }));
const updateLabel = vi.fn(async (params: unknown) => ({ label_id: (params as { label_id: string }).label_id }));
const deleteLabel = vi.fn(async () => undefined);

vi.mock("../src/api/registries-crud.js", () => ({
  RegistryCrudClient: vi.fn().mockImplementation(function () { return {
    createArea,
    updateArea,
    deleteArea,
    createFloor,
    updateFloor,
    deleteFloor,
    createLabel,
    updateLabel,
    deleteLabel,
  }; }),
}));

const exitSpy = vi.spyOn(process, "exit").mockImplementation(() => undefined as never);

function captureLog(fn: () => Promise<void>): Promise<string> {
  const output: string[] = [];
  const originalLog = console.log;
  const originalErr = console.error;
  console.log = (msg: string) => output.push(msg);
  return fn().then(() => {
    console.log = originalLog;
    console.error = originalErr;
    return output.join("\n");
  }).catch((err) => {
    console.log = originalLog;
    console.error = originalErr;
    throw err;
  });
}

describe("area CRUD commands", () => {
  beforeEach(() => {
    createArea.mockClear();
    updateArea.mockClear();
    deleteArea.mockClear();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("creates an area", async () => {
    const cmd = createAreaCreateCommand();
    // Inject mock config since registry-crud uses optsWithGlobals
    const result = await captureLog(() =>
      cmd.parseAsync(["--name", "Kitchen"], { from: "user" })
    );

    expect(createArea).toHaveBeenCalledWith(expect.objectContaining({ name: "Kitchen" }));
    expect(result).toContain("Kitchen");
  });

  it("creates an area with icon and floor", async () => {
    const cmd = createAreaCreateCommand();
    await captureLog(() =>
      cmd.parseAsync(
        ["--name", "Basement", "--icon", "mdi:basement", "--floor-id", "floor1"],
        { from: "user" }
      )
    );

    expect(createArea).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Basement", icon: "mdi:basement", floor_id: "floor1" })
    );
  });

  it("creates an area with labels", async () => {
    const cmd = createAreaCreateCommand();
    await captureLog(() =>
      cmd.parseAsync(["--name", "Office", "--labels", "work,important"], { from: "user" })
    );

    expect(createArea).toHaveBeenCalledWith(
      expect.objectContaining({ labels: ["work", "important"] })
    );
  });

  it("updates an area", async () => {
    const cmd = createAreaUpdateCommand();
    await captureLog(() =>
      cmd.parseAsync(["--area-id", "kitchen", "--name", "New Kitchen"], { from: "user" })
    );

    expect(updateArea).toHaveBeenCalledWith(
      expect.objectContaining({ area_id: "kitchen", name: "New Kitchen" })
    );
  });

  it("updates area floor_id to null", async () => {
    const cmd = createAreaUpdateCommand();
    await captureLog(() =>
      cmd.parseAsync(["--area-id", "kitchen", "--floor-id", "null"], { from: "user" })
    );

    expect(updateArea).toHaveBeenCalledWith(
      expect.objectContaining({ floor_id: null })
    );
  });

  it("updates every optional area field with a concrete floor", async () => {
    await captureLog(() => createAreaUpdateCommand().parseAsync([
      "--area-id", "kitchen", "--icon", "mdi:pot", "--floor-id", "ground",
      "--labels", "food,downstairs", "--aliases", "Kitchenette,Cooking",
    ], { from: "user" }));
    expect(updateArea).toHaveBeenCalledWith(expect.objectContaining({
      icon: "mdi:pot", floor_id: "ground", labels: ["food", "downstairs"], aliases: ["Kitchenette", "Cooking"],
    }));
  });

  it("deletes an area with --yes flag", async () => {
    const cmd = createAreaDeleteCommand();
    await captureLog(() =>
      cmd.parseAsync(["--area-id", "old-area", "--yes"], { from: "user" })
    );

    expect(deleteArea).toHaveBeenCalledWith("old-area");
  });

  it("requires --yes to delete an area", async () => {
    const cmd = createAreaDeleteCommand();
    await captureLog(() =>
      cmd.parseAsync(["--area-id", "old-area"], { from: "user" })
    );

    // process.exit(1) should be called when --yes is missing
    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

describe("floor CRUD commands", () => {
  beforeEach(() => {
    createFloor.mockClear();
    updateFloor.mockClear();
    deleteFloor.mockClear();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("creates a floor", async () => {
    const cmd = createFloorCreateCommand();
    await captureLog(() =>
      cmd.parseAsync(["--name", "Ground Floor"], { from: "user" })
    );

    expect(createFloor).toHaveBeenCalledWith(expect.objectContaining({ name: "Ground Floor" }));
  });

  it("creates a floor with level and icon", async () => {
    const cmd = createFloorCreateCommand();
    await captureLog(() =>
      cmd.parseAsync(
        ["--name", "First Floor", "--level", "1", "--icon", "mdi:home-floor-1"],
        { from: "user" }
      )
    );

    expect(createFloor).toHaveBeenCalledWith(
      expect.objectContaining({ name: "First Floor", level: 1, icon: "mdi:home-floor-1" })
    );
  });

  it("updates a floor", async () => {
    const cmd = createFloorUpdateCommand();
    await captureLog(() =>
      cmd.parseAsync(["--floor-id", "ground", "--name", "Erdgeschoss"], { from: "user" })
    );

    expect(updateFloor).toHaveBeenCalledWith(expect.objectContaining({ floor_id: "ground", name: "Erdgeschoss" }));
  });

  it("updates floor level to null", async () => {
    const cmd = createFloorUpdateCommand();
    await captureLog(() =>
      cmd.parseAsync(["--floor-id", "ground", "--level", "null"], { from: "user" })
    );

    expect(updateFloor).toHaveBeenCalledWith(expect.objectContaining({ level: null }));
  });

  it("updates every optional floor field with a numeric level", async () => {
    await captureLog(() => createFloorUpdateCommand().parseAsync([
      "--floor-id", "ground", "--icon", "mdi:home", "--level", "2", "--aliases", "Upper,Second",
    ], { from: "user" }));
    expect(updateFloor).toHaveBeenCalledWith(expect.objectContaining({
      icon: "mdi:home", level: 2, aliases: ["Upper", "Second"],
    }));
  });

  it("deletes a floor with --yes", async () => {
    const cmd = createFloorDeleteCommand();
    await captureLog(() =>
      cmd.parseAsync(["--floor-id", "old-floor", "--yes"], { from: "user" })
    );

    expect(deleteFloor).toHaveBeenCalledWith("old-floor");
  });

  it("requires --yes to delete floor", async () => {
    const cmd = createFloorDeleteCommand();
    await captureLog(() =>
      cmd.parseAsync(["--floor-id", "old-floor"], { from: "user" })
    );

    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});

describe("label CRUD commands", () => {
  beforeEach(() => {
    createLabel.mockClear();
    updateLabel.mockClear();
    deleteLabel.mockClear();
    exitSpy.mockClear();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("creates a label", async () => {
    const cmd = createLabelCreateCommand();
    await captureLog(() =>
      cmd.parseAsync(["--name", "Important"], { from: "user" })
    );

    expect(createLabel).toHaveBeenCalledWith(expect.objectContaining({ name: "Important" }));
  });

  it("creates a label with color and description", async () => {
    const cmd = createLabelCreateCommand();
    await captureLog(() =>
      cmd.parseAsync(
        ["--name", "Critical", "--color", "red", "--description", "Mission critical"],
        { from: "user" }
      )
    );

    expect(createLabel).toHaveBeenCalledWith(
      expect.objectContaining({ name: "Critical", color: "red", description: "Mission critical" })
    );
  });

  it("creates a label with an icon", async () => {
    await captureLog(() => createLabelCreateCommand().parseAsync([
      "--name", "Icon label", "--icon", "mdi:tag",
    ], { from: "user" }));
    expect(createLabel).toHaveBeenCalledWith(expect.objectContaining({ icon: "mdi:tag" }));
  });

  it("updates a label", async () => {
    const cmd = createLabelUpdateCommand();
    await captureLog(() =>
      cmd.parseAsync(["--label-id", "important", "--name", "Very Important"], { from: "user" })
    );

    expect(updateLabel).toHaveBeenCalledWith(expect.objectContaining({ label_id: "important", name: "Very Important" }));
  });

  it("updates label color to null", async () => {
    const cmd = createLabelUpdateCommand();
    await captureLog(() =>
      cmd.parseAsync(["--label-id", "lbl1", "--color", "null"], { from: "user" })
    );

    expect(updateLabel).toHaveBeenCalledWith(expect.objectContaining({ color: null }));
  });

  it("updates label description to null", async () => {
    const cmd = createLabelUpdateCommand();
    await captureLog(() =>
      cmd.parseAsync(["--label-id", "lbl1", "--description", "null"], { from: "user" })
    );

    expect(updateLabel).toHaveBeenCalledWith(expect.objectContaining({ description: null }));
  });

  it("updates label icon, color, and description to concrete values", async () => {
    await captureLog(() => createLabelUpdateCommand().parseAsync([
      "--label-id", "lbl1", "--icon", "mdi:tag", "--color", "blue", "--description", "Visible",
    ], { from: "user" }));
    expect(updateLabel).toHaveBeenCalledWith(expect.objectContaining({
      icon: "mdi:tag", color: "blue", description: "Visible",
    }));
  });

  it("deletes a label with --yes", async () => {
    const cmd = createLabelDeleteCommand();
    await captureLog(() =>
      cmd.parseAsync(["--label-id", "old-label", "--yes"], { from: "user" })
    );

    expect(deleteLabel).toHaveBeenCalledWith("old-label");
  });

  it("requires --yes to delete label", async () => {
    const cmd = createLabelDeleteCommand();
    await captureLog(() =>
      cmd.parseAsync(["--label-id", "old-label"], { from: "user" })
    );

    expect(exitSpy).toHaveBeenCalledWith(1);
  });
});
