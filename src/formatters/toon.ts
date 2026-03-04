import { encode } from "@toon-format/toon";
import type { HaState, HaService, HaEvent, HaConfig, HaHistoryState, HaLogbookEntry, HaCalendar, HaCalendarEvent } from "../types/api.js";
import { getServiceNames } from "../utils/services.js";

export function formatToon(data: unknown): string {
  if (data === null || data === undefined) {
    return "null";
  }
  return encode(data);
}

export function formatStatesToon(states: HaState[]): string {
  const rows = states.map((s) => ({
    entity_id: s.entity_id,
    state: s.state,
    last_changed: s.last_changed,
    attributes: s.attributes,
  }));
  return encode({ states: rows });
}

export function formatServicesToon(services: HaService[]): string {
  const rows = services.map((s) => ({
    domain: s.domain,
    services: getServiceNames(s.services).join("|"),
  }));
  return encode({ services: rows });
}

export function formatEventsToon(events: HaEvent[]): string {
  const rows = events.map((e) => ({
    event: e.event,
    listener_count: e.listener_count,
  }));
  return encode({ events: rows });
}

export function formatConfigToon(config: HaConfig): string {
  return encode(config);
}

export function formatHistoryToon(history: HaHistoryState[][]): string {
  const entries = history
    .filter((h) => h.length > 0)
    .map((entityHistory) => ({
      entity_id: entityHistory[0]?.entity_id ?? "unknown",
      changes: entityHistory.map((s) => ({
        last_changed: s.last_changed,
        state: s.state,
      })),
    }));
  return encode({ history: entries });
}

export function formatLogbookToon(entries: HaLogbookEntry[]): string {
  const rows = entries.map((e) => ({
    when: e.when,
    domain: e.domain,
    entity_id: e.entity_id ?? null,
    name: e.name ?? null,
    message: e.message,
  }));
  return encode({ logbook: rows });
}

export function formatCalendarsToon(calendars: HaCalendar[]): string {
  const rows = calendars.map((c) => ({
    entity_id: c.entity_id,
    name: c.name,
  }));
  return encode({ calendars: rows });
}

export function formatCalendarEventsToon(events: HaCalendarEvent[]): string {
  const rows = events.map((e) => ({
    summary: e.summary,
    start: e.start.date ?? e.start.dateTime ?? null,
    end: e.end.date ?? e.end.dateTime ?? null,
    location: e.location ?? null,
    description: e.description ?? null,
  }));
  return encode({ events: rows });
}
