import type { HaState, HaService, HaEvent, HaConfig } from "../types/api.js";

function truncate(str: string, maxLen: number): string {
  if (str.length <= maxLen) return str;
  return str.slice(0, maxLen - 3) + "...";
}

function pad(str: string, len: number): string {
  return str.padEnd(len);
}

export function formatStatesTable(states: HaState[]): string {
  if (states.length === 0) return "No states found.";

  const widths = {
    entity_id: 35,
    state: 15,
    last_changed: 25,
  };

  const header = [
    pad("Entity ID", widths.entity_id),
    pad("State", widths.state),
    pad("Last Changed", widths.last_changed),
  ].join(" | ");

  const separator = [
    "-".repeat(widths.entity_id),
    "-".repeat(widths.state),
    "-".repeat(widths.last_changed),
  ].join("-+-");

  const rows = states.map((s) =>
    [
      pad(truncate(s.entity_id, widths.entity_id), widths.entity_id),
      pad(truncate(s.state, widths.state), widths.state),
      pad(truncate(s.last_changed, widths.last_changed), widths.last_changed),
    ].join(" | ")
  );

  return [header, separator, ...rows].join("\n");
}

export function formatServicesTable(services: HaService[]): string {
  if (services.length === 0) return "No services found.";

  const widths = {
    domain: 20,
    services: 60,
  };

  const header = [
    pad("Domain", widths.domain),
    pad("Services", widths.services),
  ].join(" | ");

  const separator = [
    "-".repeat(widths.domain),
    "-".repeat(widths.services),
  ].join("-+-");

  const rows = services.map((s) =>
    [
      pad(truncate(s.domain, widths.domain), widths.domain),
      pad(truncate(s.services.join(", "), widths.services), widths.services),
    ].join(" | ")
  );

  return [header, separator, ...rows].join("\n");
}

export function formatEventsTable(events: HaEvent[]): string {
  if (events.length === 0) return "No events found.";

  const widths = {
    event: 40,
    listener_count: 15,
  };

  const header = [
    pad("Event", widths.event),
    pad("Listeners", widths.listener_count),
  ].join(" | ");

  const separator = [
    "-".repeat(widths.event),
    "-".repeat(widths.listener_count),
  ].join("-+-");

  const rows = events.map((e) =>
    [
      pad(truncate(e.event, widths.event), widths.event),
      pad(String(e.listener_count), widths.listener_count),
    ].join(" | ")
  );

  return [header, separator, ...rows].join("\n");
}

export function formatConfigTable(config: HaConfig): string {
  const lines = [
    `Location: ${config.location_name}`,
    `Version: ${config.version}`,
    `Time Zone: ${config.time_zone}`,
    `Elevation: ${config.elevation}`,
    `Coordinates: ${config.latitude}, ${config.longitude}`,
    `Config Dir: ${config.config_dir}`,
    `Components: ${config.components.length}`,
    `Unit System: ${config.unit_system.temperature}, ${config.unit_system.length}, ${config.unit_system.mass}, ${config.unit_system.volume}`,
  ];
  return lines.join("\n");
}
