import { describe, it, expect } from "vitest";
import { formatYaml } from "../src/formatters/yaml.js";
import { parse } from "yaml";
import type { HaState } from "../src/types/api.js";

describe("YAML Formatter", () => {
  describe("formatYaml", () => {
    it("should format null value", () => {
      expect(parse(formatYaml(null))).toBeNull();
    });

    it("should format boolean values", () => {
      expect(parse(formatYaml(true))).toBe(true);
      expect(parse(formatYaml(false))).toBe(false);
    });

    it("should format numbers", () => {
      expect(parse(formatYaml(42))).toBe(42);
      expect(parse(formatYaml(3.14))).toBe(3.14);
    });

    it("should format simple strings", () => {
      expect(parse(formatYaml("hello"))).toBe("hello");
    });

    it("should quote strings with colons", () => {
      expect(parse(formatYaml("http://localhost"))).toBe("http://localhost");
    });

    it("should quote strings with newlines", () => {
      expect(parse(formatYaml("hello\nworld"))).toBe("hello\nworld");
    });

    it("should quote empty strings", () => {
      expect(parse(formatYaml(""))).toBe("");
    });

    it("should format empty array", () => {
      expect(parse(formatYaml([]))).toEqual([]);
    });

    it("should format array of primitives", () => {
      const result = formatYaml([1, 2, 3]);
      expect(parse(result)).toEqual([1, 2, 3]);
    });

    it("should format simple object", () => {
      const data = { name: "test", value: 42 };
      const result = formatYaml(data);
      expect(parse(result)).toEqual(data);
    });

    it("should format nested object", () => {
      const data = { config: { url: "http://localhost", port: 8123 } };
      const result = formatYaml(data);
      expect(parse(result)).toEqual(data);
    });

    it("should format array of objects", () => {
      const states: HaState[] = [
        {
          entity_id: "light.test",
          state: "on",
          attributes: { brightness: 255 },
          last_changed: "2024-01-01T00:00:00Z",
          last_updated: "2024-01-01T00:00:00Z",
        },
      ];
      const result = formatYaml(states);
      expect(parse(result)).toEqual(states);
    });
  });
});
