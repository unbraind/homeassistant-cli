import { describe, it, expect } from "vitest";
import {
  formatEvents,
  formatOutput,
  formatServices,
  formatStates,
  formatConfig,
  formatHistory,
  formatLogbook,
  formatCalendars,
  formatCalendarEvents,
} from "../src/formatters/index.js";
import type {
  HaCalendar,
  HaCalendarEvent,
  HaConfig,
  HaEvent,
  HaHistoryResponse,
  HaLogbookEntry,
  HaService,
  HaState,
  OutputFormat,
} from "../src/types/index.js";

const sampleEvents: HaEvent[] = [
  { event: "state_changed", listener_count: 5 },
  { event: "call_service", listener_count: 3 },
];

const sampleConfig: HaConfig = {
  location_name: "Home",
  version: "2024.1.0",
  unit_system: { length: "km", mass: "kg", temperature: "°C", volume: "L" },
  time_zone: "Europe/Berlin",
  components: ["light", "switch"],
  config_dir: "/config",
  latitude: 52.5,
  longitude: 13.4,
  elevation: 50,
  currency: "EUR",
  country: "DE",
  language: "de",
  safe_mode: false,
  state: "RUNNING",
  whitelist_external_dirs: [],
};

const sampleHistory: HaHistoryResponse = [
  [
    { entity_id: "light.kitchen", state: "on", attributes: {}, last_changed: "2024-01-01T00:00:00Z", last_updated: "2024-01-01T00:00:00Z" },
    { entity_id: "light.kitchen", state: "off", attributes: {}, last_changed: "2024-01-01T01:00:00Z", last_updated: "2024-01-01T01:00:00Z" },
  ],
];

const sampleLogbook: HaLogbookEntry[] = [
  { when: "2024-01-01T00:00:00Z", name: "Kitchen Light", entity_id: "light.kitchen", domain: "light", context_user_id: null, message: "turned on" },
];

const sampleCalendars: HaCalendar[] = [
  { entity_id: "calendar.work", name: "Work" },
  { entity_id: "calendar.home", name: "Home" },
];

const sampleCalendarEvents: HaCalendarEvent[] = [
  {
    uid: "event1",
    summary: "Team Meeting",
    start: { dateTime: "2024-01-01T09:00:00" },
    end: { dateTime: "2024-01-01T10:00:00" },
  },
];

const formats: OutputFormat[] = ["toon", "json", "json-compact", "yaml", "table", "markdown"];
const sampleStates: HaState[] = [{
  entity_id: "light.kitchen", state: "on", attributes: {},
  last_changed: "2026-07-21T00:00:00Z", last_updated: "2026-07-21T00:00:00Z",
}];
const sampleServices: HaService[] = [{ domain: "light", services: ["turn_on"] }];

describe("primary formatter dispatch", () => {
  it.each(formats)("formats generic data as %s", (format) => {
    expect(formatOutput({ ok: true }, format).length).toBeGreaterThan(0);
  });

  it.each(formats)("formats states as %s", (format) => {
    expect(formatStates(sampleStates, format).length).toBeGreaterThan(0);
  });

  it.each(formats)("formats services as %s", (format) => {
    expect(formatServices(sampleServices, format).length).toBeGreaterThan(0);
  });

  it("uses TOON for unknown generic, state, and service formats", () => {
    const unknown = "unknown" as OutputFormat;
    expect(formatOutput({ ok: true }, unknown)).toContain("ok");
    expect(formatStates(sampleStates, unknown)).toContain("light.kitchen");
    expect(formatServices(sampleServices, unknown)).toContain("turn_on");
  });
});

describe("formatEvents", () => {
  formats.forEach((format) => {
    it(`formats events as ${format}`, () => {
      const result = formatEvents(sampleEvents, format);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });
  });

  it("uses toon format for unknown format", () => {
    const result = formatEvents(sampleEvents, "unknown" as OutputFormat);
    expect(result).toContain("state_changed");
  });
});

describe("formatConfig", () => {
  formats.forEach((format) => {
    it(`formats config as ${format}`, () => {
      const result = formatConfig(sampleConfig, format);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });
  });

  it("uses toon format for unknown format", () => {
    const result = formatConfig(sampleConfig, "unknown" as OutputFormat);
    expect(result).toContain("Home");
  });
});

describe("formatHistory", () => {
  it("formats history as toon", () => {
    const result = formatHistory(sampleHistory, "toon");
    expect(result).toContain("light.kitchen");
  });

  it("formats history as json (default path)", () => {
    const result = formatHistory(sampleHistory, "json");
    const parsed = JSON.parse(result);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it("formats history as yaml", () => {
    const result = formatHistory(sampleHistory, "yaml");
    expect(result).toContain("light.kitchen");
  });
});

describe("formatLogbook", () => {
  it("formats logbook as toon", () => {
    const result = formatLogbook(sampleLogbook, "toon");
    expect(result).toContain("light.kitchen");
  });

  it("formats logbook as yaml", () => {
    const result = formatLogbook(sampleLogbook, "yaml");
    expect(result).toContain("light.kitchen");
  });

  it("formats logbook as json (default path)", () => {
    const result = formatLogbook(sampleLogbook, "json");
    const parsed = JSON.parse(result);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it("formats logbook as table (default path)", () => {
    const result = formatLogbook(sampleLogbook, "table");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("formatCalendars", () => {
  it("formats calendars as toon", () => {
    const result = formatCalendars(sampleCalendars, "toon");
    expect(result).toContain("calendar.work");
  });

  it("formats calendars as yaml", () => {
    const result = formatCalendars(sampleCalendars, "yaml");
    expect(result).toContain("calendar.work");
  });

  it("formats calendars as json (default path)", () => {
    const result = formatCalendars(sampleCalendars, "json");
    const parsed = JSON.parse(result);
    expect(Array.isArray(parsed)).toBe(true);
  });
});

describe("formatCalendarEvents", () => {
  it("formats calendar events as toon", () => {
    const result = formatCalendarEvents(sampleCalendarEvents, "toon");
    expect(result).toContain("Team Meeting");
  });

  it("formats calendar events as yaml", () => {
    const result = formatCalendarEvents(sampleCalendarEvents, "yaml");
    expect(result).toContain("Team Meeting");
  });

  it("formats calendar events as json (default path)", () => {
    const result = formatCalendarEvents(sampleCalendarEvents, "json");
    const parsed = JSON.parse(result);
    expect(Array.isArray(parsed)).toBe(true);
  });
});
