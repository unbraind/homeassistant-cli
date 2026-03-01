import { describe, it, expect } from "vitest";
import {
  formatToon,
  formatStatesToon,
  formatServicesToon,
  formatEventsToon,
  formatHistoryToon,
  formatLogbookToon,
  formatCalendarsToon,
  formatCalendarEventsToon,
} from "../src/formatters/toon.js";
import type {
  HaState,
  HaService,
  HaEvent,
  HaHistoryState,
  HaLogbookEntry,
  HaCalendar,
  HaCalendarEvent,
} from "../src/types/api.js";

describe("TOON Formatter", () => {
  describe("formatToon", () => {
    it("should format null value", () => {
      expect(formatToon(null)).toBe("null");
    });

    it("should format undefined value", () => {
      expect(formatToon(undefined)).toBe("null");
    });

    it("should format boolean values", () => {
      expect(formatToon(true)).toBe("true");
      expect(formatToon(false)).toBe("false");
    });

    it("should format numbers", () => {
      expect(formatToon(42)).toBe("42");
      expect(formatToon(3.14)).toBe("3.14");
    });

    it("should format simple strings", () => {
      expect(formatToon("hello")).toBe("hello");
    });

    it("should escape strings with commas", () => {
      expect(formatToon("hello, world")).toBe('"hello, world"');
    });

    it("should escape strings with newlines", () => {
      expect(formatToon("hello\nworld")).toBe('"hello\nworld"');
    });

    it("should escape strings with quotes", () => {
      expect(formatToon('say "hello"')).toBe('"say ""hello"""');
    });

    it("should format empty array", () => {
      expect(formatToon([])).toBe("[]:");
    });

    it("should format array of primitives", () => {
      expect(formatToon([1, 2, 3])).toBe("[3]: 1,2,3");
    });

    it("should format array of strings", () => {
      expect(formatToon(["a", "b", "c"])).toBe("[3]: a,b,c");
    });

    it("should format array of objects", () => {
      const data = [{ id: 1, name: "Alice" }, { id: 2, name: "Bob" }];
      const result = formatToon(data);
      expect(result).toContain("[2]{id,name}:");
      expect(result).toContain("1,Alice");
      expect(result).toContain("2,Bob");
    });

    it("should format simple object", () => {
      const data = { name: "test", value: 42 };
      const result = formatToon(data);
      expect(result).toContain("name: test");
      expect(result).toContain("value: 42");
    });

    it("should format nested object", () => {
      const data = { config: { url: "http://localhost", port: 8123 } };
      const result = formatToon(data);
      expect(result).toContain("config:");
      expect(result).toContain("url: http://localhost");
      expect(result).toContain("port: 8123");
    });
  });

  describe("formatStatesToon", () => {
    it("should format empty states", () => {
      expect(formatStatesToon([])).toBe("states[0]:");
    });

    it("should format states", () => {
      const states: HaState[] = [
        {
          entity_id: "light.living_room",
          state: "on",
          attributes: { brightness: 255 },
          last_changed: "2024-01-01T00:00:00Z",
          last_updated: "2024-01-01T00:00:00Z",
        },
      ];
      const result = formatStatesToon(states);
      expect(result).toContain("states[1]{entity_id,state,last_changed,attributes}:");
      expect(result).toContain("light.living_room,on,2024-01-01T00:00:00Z");
    });
  });

  describe("formatServicesToon", () => {
    it("should format empty services", () => {
      expect(formatServicesToon([])).toBe("services[0]:");
    });

    it("should format services", () => {
      const services: HaService[] = [
        { domain: "light", services: ["turn_on", "turn_off", "toggle"] },
      ];
      const result = formatServicesToon(services);
      expect(result).toContain("services[1]{domain,services}:");
      expect(result).toContain("light,turn_on|turn_off|toggle");
    });

    it("should format object-style services", () => {
      const services: HaService[] = [
        { domain: "light", services: { turn_on: { fields: {} }, turn_off: { fields: {} } } },
      ];
      const result = formatServicesToon(services);
      expect(result).toContain("light,turn_on|turn_off");
    });
  });

  describe("formatEventsToon", () => {
    it("should format empty events", () => {
      expect(formatEventsToon([])).toBe("events[0]:");
    });

    it("should format events", () => {
      const events: HaEvent[] = [
        { event: "state_changed", listener_count: 5 },
        { event: "time_changed", listener_count: 2 },
      ];
      const result = formatEventsToon(events);
      expect(result).toContain("events[2]{event,listener_count}:");
      expect(result).toContain("state_changed,5");
      expect(result).toContain("time_changed,2");
    });
  });

  describe("formatHistoryToon", () => {
    it("should format empty history", () => {
      expect(formatHistoryToon([])).toBe("history[0]:");
    });

    it("should format history entries", () => {
      const history: HaHistoryState[][] = [
        [
          {
            entity_id: "sensor.temperature",
            state: "20",
            attributes: { unit: "C" },
            last_changed: "2024-01-01T00:00:00Z",
            last_updated: "2024-01-01T00:00:00Z",
          },
          {
            state: "21",
            last_changed: "2024-01-01T01:00:00Z",
          },
        ],
      ];
      const result = formatHistoryToon(history);
      expect(result).toContain("history[1][2]:");
      expect(result).toContain("entity[2](sensor.temperature):");
      expect(result).toContain("2024-01-01T00:00:00Z,20");
    });
  });

  describe("formatLogbookToon", () => {
    it("should format empty logbook", () => {
      expect(formatLogbookToon([])).toBe("logbook[0]:");
    });

    it("should format logbook entries", () => {
      const entries: HaLogbookEntry[] = [
        {
          context_user_id: null,
          domain: "light",
          entity_id: "light.living_room",
          message: "turned on",
          name: "Living Room Light",
          when: "2024-01-01T00:00:00Z",
        },
      ];
      const result = formatLogbookToon(entries);
      expect(result).toContain("logbook[1]{when,domain,entity_id,name,message}:");
      expect(result).toContain("2024-01-01T00:00:00Z,light,light.living_room");
    });
  });

  describe("formatCalendarsToon", () => {
    it("should format empty calendars", () => {
      expect(formatCalendarsToon([])).toBe("calendars[0]:");
    });

    it("should format calendars", () => {
      const calendars: HaCalendar[] = [
        { entity_id: "calendar.home", name: "Home Calendar" },
      ];
      const result = formatCalendarsToon(calendars);
      expect(result).toContain("calendars[1]{entity_id,name}:");
      expect(result).toContain("calendar.home,Home Calendar");
    });
  });

  describe("formatCalendarEventsToon", () => {
    it("should format empty events", () => {
      expect(formatCalendarEventsToon([])).toBe("events[0]:");
    });

    it("should format calendar events", () => {
      const events: HaCalendarEvent[] = [
        {
          summary: "Meeting",
          start: { dateTime: "2024-01-15T10:00:00Z" },
          end: { dateTime: "2024-01-15T11:00:00Z" },
          location: "Office",
        },
      ];
      const result = formatCalendarEventsToon(events);
      expect(result).toContain("events[1]{summary,start,end,location,description}:");
      expect(result).toContain("Meeting,2024-01-15T10:00:00Z");
    });

    it("should format all-day events", () => {
      const events: HaCalendarEvent[] = [
        {
          summary: "Holiday",
          start: { date: "2024-01-01" },
          end: { date: "2024-01-02" },
        },
      ];
      const result = formatCalendarEventsToon(events);
      expect(result).toContain("Holiday,2024-01-01,2024-01-02");
    });
  });
});
