/**
 * Defines and executes the read-only endpoint probes used by the live API matrix.
 */
import type { HomeAssistantClient, HomeAssistantWebSocketClient } from "../api/index.js";
import type { ApiMatrixEntry } from "./capabilities-api-matrix.js";
import { normalizeProbeError } from "./capabilities-utils.js";

interface RestProbe {
  key: string;
  endpoint: string;
  commandGroup: string;
  commands: string[];
  check: (client: HomeAssistantClient, sampleEntityId?: string) => Promise<unknown>;
}

interface WebsocketProbe {
  key: string;
  commandType: string;
  endpoint: string;
  commandGroup: string;
  commands: string[];
  payload?: Record<string, unknown>;
}

export const REST_PROBES: RestProbe[] = [
  { key: "status", endpoint: "/api/", commandGroup: "core", commands: ["hassio status"], check: async (client) => client.getStatus() },
  { key: "config", endpoint: "/api/config", commandGroup: "core", commands: ["hassio config"], check: async (client) => client.getConfig() },
  { key: "components", endpoint: "/api/components", commandGroup: "core", commands: ["hassio components"], check: async (client) => client.getComponents() },
  { key: "events", endpoint: "/api/events", commandGroup: "core", commands: ["hassio events"], check: async (client) => client.getEvents() },
  { key: "services", endpoint: "/api/services", commandGroup: "services", commands: ["hassio services", "hassio call-service <domain> <service>"], check: async (client) => client.getServices() },
  { key: "states", endpoint: "/api/states", commandGroup: "states", commands: ["hassio states", "hassio discover", "hassio summary"], check: async (client) => client.getStates() },
  {
    key: "history",
    endpoint: "/api/history/period",
    commandGroup: "history",
    commands: ["hassio history -e <entity_id>"],
    check: async (client, sampleEntityId) => sampleEntityId
      ? client.getHistory({ entityId: sampleEntityId, minimalResponse: true })
      : [],
  },
  { key: "logbook", endpoint: "/api/logbook", commandGroup: "history", commands: ["hassio logbook"], check: async (client) => client.getLogbook() },
  { key: "template", endpoint: "/api/template", commandGroup: "services", commands: ["hassio render-template \"{{ 1 + 1 }}\""], check: async (client) => client.renderTemplate("{{ 1 + 1 }}") },
  { key: "calendars", endpoint: "/api/calendars", commandGroup: "media", commands: ["hassio calendars", "hassio calendar-events <calendar> -s <start> -e <end>"], check: async (client) => client.getCalendars() },
];

export const WEBSOCKET_PROBES: WebsocketProbe[] = [
  {
    key: "repairs",
    commandType: "repairs/list_issues",
    endpoint: "/api/websocket#repairs/list_issues",
    commandGroup: "repairs",
    commands: ["hassio repairs list --count"],
  },
  {
    key: "related",
    commandType: "search/related",
    endpoint: "/api/websocket#search/related",
    commandGroup: "related",
    commands: ["hassio related entity <entity-id> --count"],
    payload: { item_type: "area", item_id: "__hassio_cli_capability_probe__" },
  },
];

/** Execute one REST endpoint probe and normalize its status. */
export async function runRestProbe(
  client: HomeAssistantClient,
  probe: RestProbe,
  sampleEntityId?: string,
): Promise<ApiMatrixEntry> {
  try {
    await probe.check(client, sampleEntityId);
    return {
      key: probe.key,
      endpoint: probe.endpoint,
      status: "available",
      command_group: probe.commandGroup,
      cli_commands: probe.commands,
      probe: "rest",
    };
  } catch (error) {
    const normalized = normalizeProbeError(probe.endpoint, error);
    return {
      key: probe.key,
      endpoint: probe.endpoint,
      status: normalized.status,
      command_group: probe.commandGroup,
      cli_commands: probe.commands,
      probe: "rest",
      message: normalized.message,
    };
  }
}

/** Execute one typed WebSocket command probe and normalize its status. */
export async function runWebsocketProbe(
  client: HomeAssistantWebSocketClient,
  probe: WebsocketProbe,
): Promise<ApiMatrixEntry> {
  try {
    await client.call(probe.commandType, probe.payload);
    return {
      key: probe.key,
      endpoint: probe.endpoint,
      status: "available",
      command_group: probe.commandGroup,
      cli_commands: probe.commands,
      probe: "websocket",
    };
  } catch (error) {
    const normalized = normalizeProbeError(probe.endpoint, error);
    return {
      key: probe.key,
      endpoint: probe.endpoint,
      status: normalized.status,
      command_group: probe.commandGroup,
      cli_commands: probe.commands,
      probe: "websocket",
      message: normalized.message,
    };
  }
}
