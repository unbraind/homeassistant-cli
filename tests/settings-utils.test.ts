import { Command } from "commander";
import { describe, expect, it } from "vitest";
import {
  getConfigPathFromCommand,
  parseBoolean,
  parseFormat,
  parseTimeout,
  withConfigPath,
} from "../src/commands/settings-utils.js";

describe("settings option utilities", () => {
  it("parses every supported output format and optional absence", () => {
    expect(parseFormat()).toBeUndefined();
    for (const format of ["toon", "json", "json-compact", "yaml", "table", "markdown"] as const) {
      expect(parseFormat(format)).toBe(format);
    }
    expect(() => parseFormat("xml")).toThrow("Invalid format 'xml'");
  });

  it("parses positive timeouts and rejects invalid values", () => {
    expect(parseTimeout()).toBeUndefined();
    expect(parseTimeout("2500")).toBe(2500);
    expect(() => parseTimeout("0")).toThrow("positive integer");
    expect(() => parseTimeout("not-a-number")).toThrow("positive integer");
  });

  it("parses all documented boolean aliases", () => {
    expect(parseBoolean()).toBeUndefined();
    for (const value of ["1", "true", "yes", "on", "y", " TRUE "]) expect(parseBoolean(value)).toBe(true);
    for (const value of ["0", "false", "no", "off", "n", " FALSE "]) expect(parseBoolean(value)).toBe(false);
    expect(() => parseBoolean("perhaps")).toThrow("Invalid boolean");
  });

  it("extracts and conditionally forwards a global configuration path", () => {
    const root = new Command().option("--config <path>");
    const child = new Command("child");
    root.addCommand(child);
    root.parse(["node", "hassio", "--config", "/tmp/custom.json", "child"]);
    expect(getConfigPathFromCommand(child)).toBe("/tmp/custom.json");
    expect(withConfigPath("/tmp/custom.json")).toEqual({ configPath: "/tmp/custom.json" });
    expect(withConfigPath()).toEqual({});
  });
});
