import { describe, it, expect } from "vitest";
import { parse as parseYaml } from "yaml";
import { formatOutput } from "../src/formatters/index.js";
import type { OutputFormat } from "../src/types/options.js";

describe("output format validation", () => {
  const sample = {
    ok: true,
    message: "hello",
    count: 2,
    items: [{ id: 1, name: "one" }, { id: 2, name: "two" }],
  };

  it("produces parseable JSON", () => {
    for (const format of ["json", "json-compact"] as const) {
      const out = formatOutput(sample, format);
      expect(() => JSON.parse(out)).not.toThrow();
      expect(JSON.parse(out)).toEqual(sample);
    }
  });

  it("produces parseable YAML", () => {
    const out = formatOutput(sample, "yaml");
    const parsed = parseYaml(out);
    expect(parsed).toEqual(sample);
  });

  it("produces non-empty TOON and table outputs", () => {
    const toon = formatOutput(sample, "toon");
    const table = formatOutput(sample, "table");
    expect(toon.length).toBeGreaterThan(0);
    expect(table.length).toBeGreaterThan(0);
  });

  it("produces markdown table output", () => {
    const out = formatOutput(sample.items, "markdown" as OutputFormat);
    expect(out).toContain("|");
    expect(out).toContain("id");
    expect(out).toContain("name");
  });

  it("never emits undefined for machine-readable formats", () => {
    for (const format of ["json", "json-compact", "yaml"] as const) {
      const out = formatOutput(undefined, format);
      expect(out.toLowerCase()).not.toContain("undefined");
    }
  });
});
