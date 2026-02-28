import { describe, it, expect } from "vitest";
import { formatYaml } from "../src/formatters/yaml.js";
import type { HaState } from "../src/types/api.js";

describe("YAML Formatter", () => {
  describe("formatYaml", () => {
    it("should format null value", () => {
      expect(formatYaml(null)).toBe("null");
    });

    it("should format boolean values", () => {
      expect(formatYaml(true)).toBe("true");
      expect(formatYaml(false)).toBe("false");
    });

    it("should format numbers", () => {
      expect(formatYaml(42)).toBe("42");
      expect(formatYaml(3.14)).toBe("3.14");
    });

    it("should format simple strings", () => {
      expect(formatYaml("hello")).toBe("hello");
    });

    it("should quote strings with colons", () => {
      expect(formatYaml("http://localhost")).toBe('"http://localhost"');
    });

    it("should quote strings with newlines", () => {
      expect(formatYaml("hello\nworld")).toBe('"hello\nworld"');
    });

    it("should quote empty strings", () => {
      expect(formatYaml("")).toBe('""');
    });

    it("should format empty array", () => {
      expect(formatYaml([])).toBe("[]");
    });

    it("should format array of primitives", () => {
      const result = formatYaml([1, 2, 3]);
      expect(result).toContain("- 1");
      expect(result).toContain("- 2");
      expect(result).toContain("- 3");
    });

    it("should format simple object", () => {
      const data = { name: "test", value: 42 };
      const result = formatYaml(data);
      expect(result).toContain("name: test");
      expect(result).toContain("value: 42");
    });

    it("should format nested object", () => {
      const data = { config: { url: "http://localhost", port: 8123 } };
      const result = formatYaml(data);
      expect(result).toContain("config:");
      expect(result).toContain('url: "http://localhost"');
      expect(result).toContain("port: 8123");
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
      expect(result).toContain("entity_id: light.test");
      expect(result).toContain("state: on");
    });
  });
});
