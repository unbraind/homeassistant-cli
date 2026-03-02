import type { HaState, HaService, HaEvent, HaConfig } from "../types/api.js";
import { getServiceNames } from "../utils/services.js";

function escapeCell(value: unknown): string {
  const text =
    value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  return text.replace(/\|/g, "\\|").replace(/\n/g, "<br>");
}

function tableFromObjects(rows: Array<Record<string, unknown>>): string {
  if (rows.length === 0) {
    return "_No results._";
  }

  const keys = Array.from(new Set(rows.flatMap((r) => Object.keys(r))));
  const header = `| ${keys.join(" | ")} |`;
  const sep = `| ${keys.map(() => "---").join(" | ")} |`;
  const body = rows.map((row) => `| ${keys.map((k) => escapeCell(row[k])).join(" | ")} |`);

  return [header, sep, ...body].join("\n");
}

export function formatMarkdown(data: unknown): string {
  if (Array.isArray(data)) {
    if (data.every((item) => typeof item === "object" && item !== null && !Array.isArray(item))) {
      return tableFromObjects(data as Array<Record<string, unknown>>);
    }
  }
  if (data && typeof data === "object") {
    return tableFromObjects([data as Record<string, unknown>]);
  }

  return `\`${escapeCell(data)}\``;
}

export function formatStatesMarkdown(states: HaState[]): string {
  const rows = states.map((s) => ({
    entity_id: s.entity_id,
    state: s.state,
    last_changed: s.last_changed,
  }));
  return tableFromObjects(rows);
}

export function formatServicesMarkdown(services: HaService[]): string {
  const rows = services.map((s) => ({
    domain: s.domain,
    services: getServiceNames(s.services).join(", "),
  }));
  return tableFromObjects(rows);
}

export function formatEventsMarkdown(events: HaEvent[]): string {
  const rows = events.map((e) => ({
    event: e.event,
    listener_count: e.listener_count,
  }));
  return tableFromObjects(rows);
}

export function formatConfigMarkdown(config: HaConfig): string {
  return tableFromObjects([
    {
      location_name: config.location_name,
      version: config.version,
      time_zone: config.time_zone,
      components: config.components.length,
    },
  ]);
}
