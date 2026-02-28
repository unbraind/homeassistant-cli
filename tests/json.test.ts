import { describe, it, expect } from "vitest";
import {
  formatJson,
  formatStatesJson,
  formatServicesJson,
  formatEventsJson,
  formatConfigJson,
} from "../src/formatters/json.js";
import type { HaState, HaService, HaEvent, HaConfig } from "../src/types/api.js";

describe("JSON Formatter", () => {
  describe("formatJson", () => {
    it("should format as pretty JSON", () => {
      const data = { name: "test", value: 42 };
      const result = formatJson(data, false);
      expect(result).toContain('\n');
      expect(result).toContain("  ");
    });

    it("should format as compact JSON", () => {
      const data = { name: "test", value: 42 };
      const result = formatJson(data, true);
      expect(result).toBe('{"name":"test","value":42}');
    });

    it("should handle null", () => {
      expect(formatJson(null, false)).toBe("null");
    });

    it("should handle arrays", () => {
      const data = [1, 2, 3];
      const result = formatJson(data, true);
      expect(result).toBe("[1,2,3]");
    });
  });

  describe("formatStatesJson", () => {
    it("should format states", () => {
      const states: HaState[] = [
        {
          entity_id: "light.test",
          state: "on",
          attributes: {},
          last_changed: "2024-01-01T00:00:00Z",
          last_updated: "2024-01-01T00:00:00Z",
        },
      ];
      const result = formatStatesJson(states, true);
      expect(result).toContain('"entity_id":"light.test"');
    });
  });

  describe("formatServicesJson", () => {
    it("should format services", () => {
      const services: HaService[] = [
        { domain: "light", services: ["turn_on"] },
      ];
      const result = formatServicesJson(services, true);
      expect(result).toContain('"domain":"light"');
    });
  });

  describe("formatEventsJson", () => {
    it("should format events", () => {
      const events: HaEvent[] = [
        { event: "state_changed", listener_count: 5 },
      ];
      const result = formatEventsJson(events, true);
      expect(result).toContain('"event":"state_changed"');
    });
  });

  describe("formatConfigJson", () => {
    it("should format config", () => {
      const config: HaConfig = {
        components: ["light"],
        config_dir: "/config",
        elevation: 0,
        latitude: 0,
        location_name: "Home",
        longitude: 0,
        time_zone: "UTC",
        unit_system: {
          length: "km",
          mass: "g",
          temperature: "C",
          volume: "L",
        },
        version: "2024.1.0",
        whitelist_external_dirs: [],
      };
      const result = formatConfigJson(config, true);
      expect(result).toContain('"location_name":"Home"');
    });
  });
});
