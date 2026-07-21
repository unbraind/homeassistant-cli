import { describe, it, expect } from "vitest";
import {
  formatHistory,
  formatLogbook,
  formatCalendars,
  formatCalendarEvents,
  formatStates,
  formatServices,
  formatEvents,
  formatConfig,
} from "../src/formatters/index.js";
import { formatMarkdown, formatStatesMarkdown, formatServicesMarkdown, formatEventsMarkdown, formatConfigMarkdown } from "../src/formatters/markdown.js";
import {
  formatStatesYaml,
  formatServicesYaml,
  formatEventsYaml,
  formatConfigYaml,
  formatLogbookYaml,
  formatCalendarsYaml,
  formatCalendarEventsYaml,
} from "../src/formatters/yaml.js";
import type { OutputFormat } from "../src/types/options.js";
import type {
  HaState,
  HaService,
  HaEvent,
  HaConfig,
  HaHistoryState,
  HaLogbookEntry,
  HaCalendar,
  HaCalendarEvent,
} from "../src/types/api.js";

const ALL_FORMATS: OutputFormat[] = ["toon", "json", "json-compact", "yaml", "table", "markdown"];

const sampleHistory: HaHistoryState[][] = [
  [{ entity_id: "sensor.temp", state: "20", last_changed: "2024-01-01T00:00:00Z", attributes: {} }],
];
const sampleLogbook: HaLogbookEntry[] = [
  { context_user_id: null, domain: "light", entity_id: "light.lr", message: "on", name: "LR", when: "2024-01-01T00:00:00Z" },
];
const sampleCalendars: HaCalendar[] = [{ entity_id: "calendar.home", name: "Home" }];
const sampleCalendarEvents: HaCalendarEvent[] = [
  { summary: "Meeting", start: { dateTime: "2024-01-15T10:00:00Z" }, end: { dateTime: "2024-01-15T11:00:00Z" } },
];
const sampleStates: HaState[] = [
  { entity_id: "light.lr", state: "on", attributes: { brightness: 255 }, last_changed: "2024-01-01T00:00:00Z", last_updated: "2024-01-01T00:00:00Z" },
];
const sampleServices: HaService[] = [{ domain: "light", services: ["turn_on", "turn_off"] }];
const sampleEvents: HaEvent[] = [{ event: "state_changed", listener_count: 5 }];
const sampleConfig: HaConfig = {
  components: ["light"], config_dir: "/config", elevation: 0, latitude: 0, longitude: 0,
  location_name: "Home", time_zone: "UTC", unit_system: { length: "m", mass: "kg", temperature: "°C", volume: "L" },
  version: "2024.1.0", whitelist_external_dirs: [],
};

describe("formatHistory all formats", () => {
  for (const fmt of ALL_FORMATS) {
    it(`returns non-empty string for ${fmt}`, () => {
      const result = formatHistory(sampleHistory, fmt);
      expect(result).toBeTruthy();
      expect(typeof result).toBe("string");
    });
  }
  it("handles empty history", () => {
    expect(formatHistory([], "json")).toBe("[]");
  });
});

describe("formatLogbook all formats", () => {
  for (const fmt of ALL_FORMATS) {
    it(`returns non-empty string for ${fmt}`, () => {
      const result = formatLogbook(sampleLogbook, fmt);
      expect(result).toBeTruthy();
    });
  }
});

describe("formatCalendars all formats", () => {
  for (const fmt of ALL_FORMATS) {
    it(`returns non-empty string for ${fmt}`, () => {
      const result = formatCalendars(sampleCalendars, fmt);
      expect(result).toBeTruthy();
    });
  }
});

describe("formatCalendarEvents all formats", () => {
  for (const fmt of ALL_FORMATS) {
    it(`returns non-empty string for ${fmt}`, () => {
      const result = formatCalendarEvents(sampleCalendarEvents, fmt);
      expect(result).toBeTruthy();
    });
  }

  it("normalizes date-only and missing optional calendar fields in TOON", () => {
    const result = formatCalendarEvents([{
      summary: "Holiday", start: { date: "2026-07-21" }, end: {}, location: undefined, description: undefined,
    }], "toon");
    expect(result).toContain("2026-07-21");
    expect(result).toContain("location,description");
    expect(result).toContain("Holiday,2026-07-21,null,null,null");
  });
});

describe("formatMarkdown", () => {
  it("formats array of objects as table", () => {
    const result = formatMarkdown([{ a: 1, b: 2 }]);
    expect(result).toContain("| a | b |");
    expect(result).toContain("| 1 | 2 |");
  });
  it("formats single object as table", () => {
    const result = formatMarkdown({ key: "val" });
    expect(result).toContain("| key |");
    expect(result).toContain("| val |");
  });
  it("formats primitive as inline code", () => {
    expect(formatMarkdown(42)).toBe("`42`");
    expect(formatMarkdown("hello")).toBe("`hello`");
  });
  it("returns no results for empty array of objects", () => {
    expect(formatMarkdown([])).toBe("_No results._");
  });
});

describe("formatStatesMarkdown", () => {
  it("renders entity_id column", () => {
    const result = formatStatesMarkdown(sampleStates);
    expect(result).toContain("entity_id");
    expect(result).toContain("light.lr");
  });
});

describe("formatServicesMarkdown", () => {
  it("renders domain and services", () => {
    const result = formatServicesMarkdown(sampleServices);
    expect(result).toContain("light");
    expect(result).toContain("turn_on");
  });
});

describe("formatEventsMarkdown", () => {
  it("renders event name", () => {
    const result = formatEventsMarkdown(sampleEvents);
    expect(result).toContain("state_changed");
  });
});

describe("formatConfigMarkdown", () => {
  it("renders location and version", () => {
    const result = formatConfigMarkdown(sampleConfig);
    expect(result).toContain("Home");
    expect(result).toContain("2024.1.0");
  });
});

describe("YAML typed formatters", () => {
  it("formatStatesYaml", () => {
    const r = formatStatesYaml(sampleStates);
    expect(r).toContain("entity_id: light.lr");
  });
  it("formatServicesYaml", () => {
    const r = formatServicesYaml(sampleServices);
    expect(r).toContain("domain: light");
  });
  it("formatEventsYaml", () => {
    const r = formatEventsYaml(sampleEvents);
    expect(r).toContain("event: state_changed");
  });
  it("formatConfigYaml", () => {
    const r = formatConfigYaml(sampleConfig);
    expect(r).toContain("location_name: Home");
  });
  it("formatLogbookYaml", () => {
    const r = formatLogbookYaml(sampleLogbook);
    expect(r).toContain("domain: light");
  });
  it("formatCalendarsYaml", () => {
    const r = formatCalendarsYaml(sampleCalendars);
    expect(r).toContain("entity_id: calendar.home");
  });
  it("formatCalendarEventsYaml", () => {
    const r = formatCalendarEventsYaml(sampleCalendarEvents);
    expect(r).toContain("summary: Meeting");
  });
});
