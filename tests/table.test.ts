import { describe, it, expect } from "vitest";
import {
  formatStatesTable,
  formatServicesTable,
  formatEventsTable,
  formatConfigTable,
} from "../src/formatters/table.js";
import type { HaState, HaService, HaEvent, HaConfig } from "../src/types/api.js";

describe("Table Formatter", () => {
  describe("formatStatesTable", () => {
    it("should format empty states", () => {
      expect(formatStatesTable([])).toBe("No states found.");
    });

    it("should format states as table", () => {
      const states: HaState[] = [
        {
          entity_id: "light.living_room",
          state: "on",
          attributes: {},
          last_changed: "2024-01-01T00:00:00Z",
          last_updated: "2024-01-01T00:00:00Z",
        },
        {
          entity_id: "switch.kitchen",
          state: "off",
          attributes: {},
          last_changed: "2024-01-01T01:00:00Z",
          last_updated: "2024-01-01T01:00:00Z",
        },
      ];
      const result = formatStatesTable(states);
      expect(result).toContain("Entity ID");
      expect(result).toContain("State");
      expect(result).toContain("light.living_room");
      expect(result).toContain("switch.kitchen");
    });

    it("should truncate long values", () => {
      const states: HaState[] = [
        {
          entity_id: "sensor.very_long_entity_id_that_should_be_truncated_in_the_output",
          state: "on",
          attributes: {},
          last_changed: "2024-01-01T00:00:00Z",
          last_updated: "2024-01-01T00:00:00Z",
        },
      ];
      const result = formatStatesTable(states);
      expect(result).toContain("...");
    });
  });

  describe("formatServicesTable", () => {
    it("should format empty services", () => {
      expect(formatServicesTable([])).toBe("No services found.");
    });

    it("should format services as table", () => {
      const services: HaService[] = [
        { domain: "light", services: ["turn_on", "turn_off", "toggle"] },
        { domain: "switch", services: ["turn_on", "turn_off"] },
      ];
      const result = formatServicesTable(services);
      expect(result).toContain("Domain");
      expect(result).toContain("Services");
      expect(result).toContain("light");
      expect(result).toContain("switch");
    });
  });

  describe("formatEventsTable", () => {
    it("should format empty events", () => {
      expect(formatEventsTable([])).toBe("No events found.");
    });

    it("should format events as table", () => {
      const events: HaEvent[] = [
        { event: "state_changed", listener_count: 5 },
        { event: "time_changed", listener_count: 2 },
      ];
      const result = formatEventsTable(events);
      expect(result).toContain("Event");
      expect(result).toContain("Listeners");
      expect(result).toContain("state_changed");
      expect(result).toContain("5");
    });
  });

  describe("formatConfigTable", () => {
    it("should format config as key-value pairs", () => {
      const config: HaConfig = {
        components: ["light", "switch"],
        config_dir: "/config",
        elevation: 100,
        latitude: 45.0,
        location_name: "My Home",
        longitude: -93.0,
        time_zone: "America/Chicago",
        unit_system: {
          length: "km",
          mass: "g",
          temperature: "C",
          volume: "L",
        },
        version: "2024.1.0",
        whitelist_external_dirs: ["/www"],
      };
      const result = formatConfigTable(config);
      expect(result).toContain("Location: My Home");
      expect(result).toContain("Version: 2024.1.0");
      expect(result).toContain("Time Zone: America/Chicago");
    });
  });
});
