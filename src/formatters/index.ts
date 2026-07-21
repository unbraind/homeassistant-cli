/**
 * Serializes Home Assistant results through the index output contract.
 */
import type { OutputFormat } from "../types/index.js";
import type {
  HaState,
  HaService,
  HaEvent,
  HaConfig,
  HaHistoryResponse,
  HaLogbookEntry,
  HaCalendar,
  HaCalendarEvent,
} from "../types/api.js";

import * as toon from "./toon.js";
import * as json from "./json.js";
import * as yaml from "./yaml.js";
import * as table from "./table.js";
import * as markdown from "./markdown.js";

export type { OutputFormat };

export function formatOutput(
  data: unknown,
  format: OutputFormat
): string {
  switch (format) {
    case "toon":
      return toon.formatToon(data);
    case "json":
      return json.formatJson(data, false);
    case "json-compact":
      return json.formatJson(data, true);
    case "yaml":
      return yaml.formatYaml(data);
    case "table":
      return table.formatTable(data);
    case "markdown":
      return markdown.formatMarkdown(data);
    default:
      return toon.formatToon(data);
  }
}

export function formatStates(
  states: HaState[],
  format: OutputFormat
): string {
  switch (format) {
    case "toon":
      return toon.formatStatesToon(states);
    case "json":
      return json.formatStatesJson(states, false);
    case "json-compact":
      return json.formatStatesJson(states, true);
    case "yaml":
      return yaml.formatStatesYaml(states);
    case "table":
      return table.formatStatesTable(states);
    case "markdown":
      return markdown.formatStatesMarkdown(states);
    default:
      return toon.formatStatesToon(states);
  }
}

export function formatServices(
  services: HaService[],
  format: OutputFormat
): string {
  switch (format) {
    case "toon":
      return toon.formatServicesToon(services);
    case "json":
      return json.formatServicesJson(services, false);
    case "json-compact":
      return json.formatServicesJson(services, true);
    case "yaml":
      return yaml.formatServicesYaml(services);
    case "table":
      return table.formatServicesTable(services);
    case "markdown":
      return markdown.formatServicesMarkdown(services);
    default:
      return toon.formatServicesToon(services);
  }
}

export function formatEvents(
  events: HaEvent[],
  format: OutputFormat
): string {
  switch (format) {
    case "toon":
      return toon.formatEventsToon(events);
    case "json":
      return json.formatEventsJson(events, false);
    case "json-compact":
      return json.formatEventsJson(events, true);
    case "yaml":
      return yaml.formatEventsYaml(events);
    case "table":
      return table.formatEventsTable(events);
    case "markdown":
      return markdown.formatEventsMarkdown(events);
    default:
      return toon.formatEventsToon(events);
  }
}

export function formatConfig(
  config: HaConfig,
  format: OutputFormat
): string {
  switch (format) {
    case "toon":
      return toon.formatConfigToon(config);
    case "json":
      return json.formatConfigJson(config, false);
    case "json-compact":
      return json.formatConfigJson(config, true);
    case "yaml":
      return yaml.formatConfigYaml(config);
    case "table":
      return table.formatConfigTable(config);
    case "markdown":
      return markdown.formatConfigMarkdown(config);
    default:
      return toon.formatConfigToon(config);
  }
}

export function formatHistory(
  history: HaHistoryResponse,
  format: OutputFormat
): string {
  switch (format) {
    case "toon":
      return toon.formatHistoryToon(history);
    default:
      return formatOutput(history, format);
  }
}

export function formatLogbook(
  entries: HaLogbookEntry[],
  format: OutputFormat
): string {
  switch (format) {
    case "toon":
      return toon.formatLogbookToon(entries);
    case "yaml":
      return yaml.formatLogbookYaml(entries);
    default:
      return formatOutput(entries, format);
  }
}

export function formatCalendars(
  calendars: HaCalendar[],
  format: OutputFormat
): string {
  switch (format) {
    case "toon":
      return toon.formatCalendarsToon(calendars);
    case "yaml":
      return yaml.formatCalendarsYaml(calendars);
    default:
      return formatOutput(calendars, format);
  }
}

export function formatCalendarEvents(
  events: HaCalendarEvent[],
  format: OutputFormat
): string {
  switch (format) {
    case "toon":
      return toon.formatCalendarEventsToon(events);
    case "yaml":
      return yaml.formatCalendarEventsYaml(events);
    default:
      return formatOutput(events, format);
  }
}
