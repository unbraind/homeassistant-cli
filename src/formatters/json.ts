import type { HaState, HaService, HaEvent, HaConfig } from "../types/api.js";

export function formatJson(data: unknown, compact = false): string {
  if (compact) {
    return JSON.stringify(data);
  }
  return JSON.stringify(data, null, 2);
}

export function formatStatesJson(states: HaState[], compact = false): string {
  return formatJson(states, compact);
}

export function formatServicesJson(
  services: HaService[],
  compact = false
): string {
  return formatJson(services, compact);
}

export function formatEventsJson(events: HaEvent[], compact = false): string {
  return formatJson(events, compact);
}

export function formatConfigJson(config: HaConfig, compact = false): string {
  return formatJson(config, compact);
}
