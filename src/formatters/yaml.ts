/**
 * Serializes Home Assistant results through the yaml output contract.
 */
import { stringify } from "yaml";
import type { HaState, HaService, HaEvent, HaConfig, HaLogbookEntry, HaCalendar, HaCalendarEvent } from "../types/api.js";

export function formatYaml(data: unknown): string {
  if (data === undefined) {
    return "null\n";
  }
  return stringify(data, {
    indent: 2,
    lineWidth: 0,
    singleQuote: false,
  });
}

export function formatStatesYaml(states: HaState[]): string {
  return formatYaml(states);
}

export function formatServicesYaml(services: HaService[]): string {
  return formatYaml(services);
}

export function formatEventsYaml(events: HaEvent[]): string {
  return formatYaml(events);
}

export function formatConfigYaml(config: HaConfig): string {
  return formatYaml(config);
}

export function formatLogbookYaml(entries: HaLogbookEntry[]): string {
  return formatYaml(entries);
}

export function formatCalendarsYaml(calendars: HaCalendar[]): string {
  return formatYaml(calendars);
}

export function formatCalendarEventsYaml(events: HaCalendarEvent[]): string {
  return formatYaml(events);
}
