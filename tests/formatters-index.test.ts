import { describe, it, expect } from "vitest";
import {
  formatEvents,
  formatConfig,
  formatHistory,
  formatLogbook,
  formatCalendars,
  formatCalendarEvents,
} from "../src/formatters/index.js";
import type { OutputFormat } from "../src/types/index.js";

const sampleEvents = [
  { event: "state_changed", listener_count: 5, origin: "LOCAL" },
  { event: "call_service", listener_count: 3, origin: "LOCAL" },
];

const sampleConfig = {
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
};

const sampleHistory = [
  [
    { entity_id: "light.kitchen", state: "on", attributes: {}, last_changed: "2024-01-01T00:00:00Z", last_updated: "2024-01-01T00:00:00Z" },
    { entity_id: "light.kitchen", state: "off", attributes: {}, last_changed: "2024-01-01T01:00:00Z", last_updated: "2024-01-01T01:00:00Z" },
  ],
];

const sampleLogbook = [
  { when: "2024-01-01T00:00:00Z", name: "Kitchen Light", entity_id: "light.kitchen", state: "on", message: "turned on" },
];

const sampleCalendars = [
  { entity_id: "calendar.work", name: "Work", state: "on" },
  { entity_id: "calendar.home", name: "Home", state: "off" },
];

const sampleCalendarEvents = [
  {
    uid: "event1",
    summary: "Team Meeting",
    start: { dateTime: "2024-01-01T09:00:00" },
    end: { dateTime: "2024-01-01T10:00:00" },
  },
];

const formats: OutputFormat[] = ["toon", "json", "json-compact", "yaml", "table", "markdown"];

describe("formatEvents", () => {
  formats.forEach((format) => {
    it(`formats events as ${format}`, () => {
      const result = formatEvents(sampleEvents as any, format);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });
  });

  it("uses toon format for unknown format", () => {
    const result = formatEvents(sampleEvents as any, "unknown" as OutputFormat);
    expect(result).toContain("state_changed");
  });
});

describe("formatConfig", () => {
  formats.forEach((format) => {
    it(`formats config as ${format}`, () => {
      const result = formatConfig(sampleConfig as any, format);
      expect(typeof result).toBe("string");
      expect(result.length).toBeGreaterThan(0);
    });
  });

  it("uses toon format for unknown format", () => {
    const result = formatConfig(sampleConfig as any, "unknown" as OutputFormat);
    expect(result).toContain("Home");
  });
});

describe("formatHistory", () => {
  it("formats history as toon", () => {
    const result = formatHistory(sampleHistory as any, "toon");
    expect(result).toContain("light.kitchen");
  });

  it("formats history as json (default path)", () => {
    const result = formatHistory(sampleHistory as any, "json");
    const parsed = JSON.parse(result);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it("formats history as yaml", () => {
    const result = formatHistory(sampleHistory as any, "yaml");
    expect(result).toContain("light.kitchen");
  });
});

describe("formatLogbook", () => {
  it("formats logbook as toon", () => {
    const result = formatLogbook(sampleLogbook as any, "toon");
    expect(result).toContain("light.kitchen");
  });

  it("formats logbook as yaml", () => {
    const result = formatLogbook(sampleLogbook as any, "yaml");
    expect(result).toContain("light.kitchen");
  });

  it("formats logbook as json (default path)", () => {
    const result = formatLogbook(sampleLogbook as any, "json");
    const parsed = JSON.parse(result);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it("formats logbook as table (default path)", () => {
    const result = formatLogbook(sampleLogbook as any, "table");
    expect(result.length).toBeGreaterThan(0);
  });
});

describe("formatCalendars", () => {
  it("formats calendars as toon", () => {
    const result = formatCalendars(sampleCalendars as any, "toon");
    expect(result).toContain("calendar.work");
  });

  it("formats calendars as yaml", () => {
    const result = formatCalendars(sampleCalendars as any, "yaml");
    expect(result).toContain("calendar.work");
  });

  it("formats calendars as json (default path)", () => {
    const result = formatCalendars(sampleCalendars as any, "json");
    const parsed = JSON.parse(result);
    expect(Array.isArray(parsed)).toBe(true);
  });
});

describe("formatCalendarEvents", () => {
  it("formats calendar events as toon", () => {
    const result = formatCalendarEvents(sampleCalendarEvents as any, "toon");
    expect(result).toContain("Team Meeting");
  });

  it("formats calendar events as yaml", () => {
    const result = formatCalendarEvents(sampleCalendarEvents as any, "yaml");
    expect(result).toContain("Team Meeting");
  });

  it("formats calendar events as json (default path)", () => {
    const result = formatCalendarEvents(sampleCalendarEvents as any, "json");
    const parsed = JSON.parse(result);
    expect(Array.isArray(parsed)).toBe(true);
  });
});
