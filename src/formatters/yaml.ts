import type { HaState, HaService, HaEvent, HaConfig, HaLogbookEntry, HaCalendar, HaCalendarEvent } from "../types/api.js";

function indent(str: string, spaces: number): string {
  const prefix = " ".repeat(spaces);
  return str
    .split("\n")
    .map((line) => prefix + line)
    .join("\n");
}

function toYamlValue(value: unknown): string {
  if (value === null || value === undefined) {
    return "null";
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false";
  }
  if (typeof value === "number") {
    return String(value);
  }
  if (typeof value === "string") {
    if (
      value.includes("\n") ||
      value.includes(":") ||
      value.includes("#") ||
      value.includes('"') ||
      value.startsWith("[") ||
      value.startsWith("{")
    ) {
      return `"${value.replace(/"/g, '\\"')}"`;
    }
    if (value === "" || /^\s|\s$/.test(value)) {
      return `"${value}"`;
    }
    return value;
  }
  return JSON.stringify(value);
}

function objectToYaml(obj: Record<string, unknown>, depth = 0): string {
  const lines: string[] = [];
  const entries = Object.entries(obj);

  for (const [key, value] of entries) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${key}: []`);
      } else {
        lines.push(`${key}:`);
        for (const item of value) {
          if (typeof item === "object" && item !== null) {
            lines.push(indent("- ", depth * 2 + 2));
            lines.push(
              indent(
                objectToYaml(item as Record<string, unknown>, depth + 2),
                2
              ).trimStart()
            );
          } else {
            lines.push(`${indent("- ", depth * 2 + 2)}${toYamlValue(item)}`);
          }
        }
      }
    } else if (typeof value === "object" && value !== null) {
      lines.push(`${key}:`);
      lines.push(
        objectToYaml(value as Record<string, unknown>, depth + 1)
      );
    } else {
      lines.push(`${key}: ${toYamlValue(value)}`);
    }
  }

  return indent(lines.join("\n"), depth * 2).trimStart();
}

export function formatYaml(data: unknown): string {
  if (data === null || data === undefined) {
    return "null";
  }
  if (typeof data !== "object") {
    return toYamlValue(data);
  }
  if (Array.isArray(data)) {
    if (data.length === 0) return "[]";
    const lines: string[] = [];
    for (const item of data) {
      if (typeof item === "object" && item !== null) {
        lines.push(`- ${objectToYaml(item as Record<string, unknown>, 1).trimStart()}`);
      } else {
        lines.push(`- ${toYamlValue(item)}`);
      }
    }
    return lines.join("\n");
  }
  return objectToYaml(data as Record<string, unknown>);
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
