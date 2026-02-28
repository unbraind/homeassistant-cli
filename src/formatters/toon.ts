import type { HaState, HaService, HaEvent, HaConfig, HaHistoryState, HaLogbookEntry, HaCalendar, HaCalendarEvent } from "../types/api.js";

function escapeToonValue(value: unknown): string {
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
    if (value.includes(",") || value.includes("\n") || value.includes('"')) {
      return `"${value.replace(/"/g, '""')}"`;
    }
    return value;
  }
  return `"${JSON.stringify(value).replace(/"/g, '""')}"`;
}

function formatToonObject(obj: Record<string, unknown>, indent = ""): string {
  const lines: string[] = [];
  const entries = Object.entries(obj);

  for (const [key, value] of entries) {
    if (Array.isArray(value)) {
      if (value.length === 0) {
        lines.push(`${indent}${key}[]:`);
      } else if (
        value.every(
          (v) =>
            typeof v === "object" && v !== null && !Array.isArray(v)
        )
      ) {
        const objects = value as Record<string, unknown>[];
        const allKeys = new Set<string>();
        for (const obj of objects) {
          Object.keys(obj).forEach((k) => allKeys.add(k));
        }
        const fields = Array.from(allKeys);
        lines.push(
          `${indent}${key}[${objects.length}]{${fields.join(",")}}:`
        );
        for (const item of objects) {
          const values = fields.map((f) =>
            escapeToonValue(item[f])
          );
          lines.push(`${indent}  ${values.join(",")}`);
        }
      } else {
        const values = value.map(escapeToonValue);
        lines.push(`${indent}${key}[${value.length}]: ${values.join(",")}`);
      }
    } else if (typeof value === "object" && value !== null) {
      lines.push(`${indent}${key}:`);
      lines.push(
        formatToonObject(value as Record<string, unknown>, `${indent}  `)
      );
    } else {
      lines.push(`${indent}${key}: ${escapeToonValue(value)}`);
    }
  }

  return lines.join("\n");
}

export function formatToon(data: unknown): string {
  if (data === null || data === undefined) {
    return "null";
  }
  if (typeof data !== "object") {
    return escapeToonValue(data);
  }
  if (Array.isArray(data)) {
    if (data.length === 0) {
      return "[]:";
    }
    if (
      data.every(
        (v) => typeof v === "object" && v !== null && !Array.isArray(v)
      )
    ) {
      const objects = data as Record<string, unknown>[];
      const allKeys = new Set<string>();
      for (const obj of objects) {
        Object.keys(obj).forEach((k) => allKeys.add(k));
      }
      const fields = Array.from(allKeys);
      const lines = [`[${objects.length}]{${fields.join(",")}}:`];
      for (const item of objects) {
        const values = fields.map((f) => escapeToonValue(item[f]));
        lines.push(`  ${values.join(",")}`);
      }
      return lines.join("\n");
    }
    const values = data.map(escapeToonValue);
    return `[${data.length}]: ${values.join(",")}`;
  }
  return formatToonObject(data as Record<string, unknown>);
}

export function formatStatesToon(states: HaState[]): string {
  if (states.length === 0) return "states[0]:";

  const fields = ["entity_id", "state", "last_changed", "attributes"];
  const lines = [`states[${states.length}]{${fields.join(",")}}:`];

  for (const s of states) {
    const attrs = JSON.stringify(s.attributes);
    const escapedAttrs = attrs.includes(",") ? `"${attrs.replace(/"/g, '""')}"` : attrs;
    lines.push(`  ${s.entity_id},${s.state},${s.last_changed},${escapedAttrs}`);
  }

  return lines.join("\n");
}

export function formatServicesToon(services: HaService[]): string {
  if (services.length === 0) return "services[0]:";

  const lines = [`services[${services.length}]{domain,services}:`];
  for (const s of services) {
    const servicesStr = s.services.join("|");
    lines.push(`  ${s.domain},${servicesStr}`);
  }
  return lines.join("\n");
}

export function formatEventsToon(events: HaEvent[]): string {
  if (events.length === 0) return "events[0]:";

  const lines = [`events[${events.length}]{event,listener_count}:`];
  for (const e of events) {
    lines.push(`  ${e.event},${e.listener_count}`);
  }
  return lines.join("\n");
}

export function formatConfigToon(config: HaConfig): string {
  return formatToon(config);
}

export function formatHistoryToon(history: HaHistoryState[][]): string {
  if (history.length === 0) return "history[0]:";

  const lines: string[] = [];
  let totalEntries = 0;

  for (const entityHistory of history) {
    totalEntries += entityHistory.length;
  }

  lines.push(`history[${history.length}][${totalEntries}]:`);

  for (let i = 0; i < history.length; i++) {
    const entityHistory = history[i];
    if (!entityHistory || entityHistory.length === 0) continue;

    const entityId = entityHistory[0]?.entity_id ?? "unknown";
    lines.push(`  entity[${entityHistory.length}](${entityId}):`);

    for (const state of entityHistory) {
      lines.push(`    ${state.last_changed},${state.state}`);
    }
  }

  return lines.join("\n");
}

export function formatLogbookToon(entries: HaLogbookEntry[]): string {
  if (entries.length === 0) return "logbook[0]:";

  const fields = ["when", "domain", "entity_id", "name", "message"];
  const lines = [`logbook[${entries.length}]{${fields.join(",")}}:`];

  for (const e of entries) {
    const values = [
      e.when,
      e.domain,
      e.entity_id ?? "null",
      e.name ?? "null",
      escapeToonValue(e.message),
    ];
    lines.push(`  ${values.join(",")}`);
  }

  return lines.join("\n");
}

export function formatCalendarsToon(calendars: HaCalendar[]): string {
  if (calendars.length === 0) return "calendars[0]:";

  const lines = [`calendars[${calendars.length}]{entity_id,name}:`];
  for (const c of calendars) {
    lines.push(`  ${c.entity_id},${c.name}`);
  }
  return lines.join("\n");
}

export function formatCalendarEventsToon(events: HaCalendarEvent[]): string {
  if (events.length === 0) return "events[0]:";

  const fields = ["summary", "start", "end", "location", "description"];
  const lines = [`events[${events.length}]{${fields.join(",")}}:`];

  for (const e of events) {
    const values = [
      escapeToonValue(e.summary),
      e.start.date ?? e.start.dateTime ?? "null",
      e.end.date ?? e.end.dateTime ?? "null",
      e.location ?? "null",
      e.description ? escapeToonValue(e.description) : "null",
    ];
    lines.push(`  ${values.join(",")}`);
  }

  return lines.join("\n");
}
