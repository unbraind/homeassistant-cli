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
    key: "automatic_entity_ids",
    commandType: "config/entity_registry/get_automatic_entity_ids",
    endpoint: "/api/websocket#config/entity_registry/get_automatic_entity_ids",
    commandGroup: "registries",
    commands: ["hassio registries automatic-entity-ids <entity-id>"],
    payload: { entity_ids: ["sensor.hassio_cli_capability_probe"] },
  },
  {
    key: "registry_composite_splits",
    commandType: "config/device_registry/list_composite_splits",
    endpoint: "/api/websocket#config/device_registry/list_composite_splits",
    commandGroup: "registries",
    commands: ["hassio registries composite-splits --count"],
  },
  {
    key: "entity_id_settings",
    commandType: "config/entity_registry/settings/get",
    endpoint: "/api/websocket#config/entity_registry/settings/get",
    commandGroup: "registries",
    commands: [
      "hassio registries entity-id-settings get",
      "hassio registries entity-id-settings update --parts device,entity",
    ],
  },
  {
    key: "automation_traces",
    commandType: "trace/list",
    endpoint: "/api/websocket#trace/list",
    commandGroup: "websocket",
    commands: [
      "hassio ws traces list --domain automation --limit 20",
      "hassio ws traces get --domain automation --item-id <id> --run-id <id>",
      "hassio ws traces contexts --limit 20",
    ],
    payload: { domain: "automation" },
  },
  {
    key: "frontend_version",
    commandType: "frontend/get_version",
    endpoint: "/api/websocket#frontend/get_version",
    commandGroup: "websocket",
    commands: ["hassio ws frontend version"],
  },
  {
    key: "frontend_themes",
    commandType: "frontend/get_themes",
    endpoint: "/api/websocket#frontend/get_themes",
    commandGroup: "websocket",
    commands: ["hassio ws frontend themes --limit 20"],
  },
  {
    key: "frontend_icons",
    commandType: "frontend/get_icons",
    endpoint: "/api/websocket#frontend/get_icons",
    commandGroup: "websocket",
    commands: ["hassio ws frontend icons --category services --integration light --limit 50"],
    payload: { category: "services", integration: ["light"] },
  },
  {
    key: "frontend_translations",
    commandType: "frontend/get_translations",
    endpoint: "/api/websocket#frontend/get_translations",
    commandGroup: "websocket",
    commands: ["hassio ws frontend translations --language en --category services --integration light --count"],
    payload: { language: "en", category: "services", integration: ["light"] },
  },
  {
    key: "automation_runtime",
    commandType: "test_condition",
    endpoint: "/api/websocket#test_condition",
    commandGroup: "websocket",
    commands: [
      "hassio ws automation-runtime test-condition --condition <json>",
      "hassio ws automation-runtime observe-condition --condition <json>",
      "hassio ws automation-runtime execute-sequence --sequence <json>",
    ],
    payload: { condition: { condition: "template", value_template: "{{ true }}" } },
  },
  {
    key: "integration_manifests",
    commandType: "manifest/list",
    endpoint: "/api/websocket#manifest/list",
    commandGroup: "websocket",
    commands: ["hassio ws integrations list --limit 20", "hassio ws integrations get <domain>"],
  },
  {
    key: "integration_setup",
    commandType: "integration/setup_info",
    endpoint: "/api/websocket#integration/setup_info",
    commandGroup: "websocket",
    commands: ["hassio ws integrations setup --limit 20", "hassio ws integrations wait <domain>"],
  },
  {
    key: "entity_sources",
    commandType: "entity/source",
    endpoint: "/api/websocket#entity/source",
    commandGroup: "websocket",
    commands: ["hassio ws entity-sources --count"],
  },
  {
    key: "slugify",
    commandType: "slugify",
    endpoint: "/api/websocket#slugify",
    commandGroup: "websocket",
    commands: ["hassio ws slugify <text>"],
    payload: { text: "hassio_cli_capability_probe" },
  },
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
